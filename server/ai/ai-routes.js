import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getApps,initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getAIConfig } from './ai-config.js';
import { getKnowledge } from './knowledge-service.js';
import { root } from './document-parser.js';
import { retrieve,normalize } from './retrieval-service.js';
import { buildInput,streamAnswer } from './openai-service.js';

export function createAIRouter({verifyToken,answer=streamAnswer,knowledge=getKnowledge,config=getAIConfig()}={}){
 const router=express.Router(),sessions=new Map(),rates=new Map();let active=0,ledger=null,ledgerDay='',budgetLock=Promise.resolve();
 const verify=verifyToken|| (async token=>{const app=getApps().find(a=>a.name==='organic-ai')||initializeApp({projectId:config.projectId},'organic-ai');return getAuth(app).verifyIdToken(token);});
 function limit(key,n){const now=Date.now();for(const [k,v] of rates)if(v.until<now)rates.delete(k);const item=rates.get(key)||{count:0,until:now+60000};rates.set(key,item);return ++item.count<=n;}
 function clean(){const now=Date.now();for(const [k,s] of sessions)if(s.until<now)sessions.delete(k);}
 async function reserve(tokens){const operation=budgetLock.then(async()=>{const day=new Date().toISOString().slice(0,10),dir=config.budgetDirectory||path.join(root,'server/.cache');if(!ledger||ledgerDay!==day){try{ledger=JSON.parse(await fs.readFile(path.join(dir,`usage-${day}.json`),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;ledger={requests:0,reservedTokens:0};}ledgerDay=day;}if(ledger.requests>=config.dailyRequests||ledger.reservedTokens+tokens>config.dailyTokens)return false;ledger.requests++;ledger.reservedTokens+=tokens;await fs.mkdir(dir,{recursive:true});await fs.writeFile(path.join(dir,`usage-${day}.json`),JSON.stringify(ledger),{mode:0o600});return true;});budgetLock=operation.catch(()=>{});return operation;}
 router.use((req,res,next)=>{res.set('Cache-Control','no-store');if(!limit('ip:'+req.ip,60))return res.status(429).json({error:'Có quá nhiều yêu cầu. Vui lòng thử lại sau một phút.'});next();});
 router.get('/status',(_req,res)=>res.json({configured:Boolean(config.apiKey),message:config.apiKey?'':'Trợ lý AI chưa được cấu hình.'}));
 router.post('/chat',express.json({limit:'16kb'}),async(req,res)=>{
  if(!config.apiKey)return res.status(503).json({error:'Trợ lý AI chưa được cấu hình.'});
  let user;try{const token=req.get('authorization')?.match(/^Bearer (.{1,8000})$/)?.[1];if(!token)throw Error();user=await verify(token);if(!user.uid||!user.email_verified||(config.domains.length&&!config.domains.includes(user.email?.split('@')[1]?.toLowerCase())))throw Error();}catch{return res.status(401).json({error:'Vui lòng đăng nhập tài khoản được cấp quyền để sử dụng Trợ lý AI.'});}
  const b=req.body||{};if(typeof b.message!=='string'||!b.message.trim()||b.message.length>config.maxQuestion||!['auto','current_document','all_documents'].includes(b.scope)||![b.currentDocumentId,b.currentSectionId].every(v=>v==null||(typeof v==='string'&&/^[\w-]{1,120}$/.test(v)))||(b.conversationId!=null&&(typeof b.conversationId!=='string'||!/^[\w-]{1,80}$/.test(b.conversationId)))||(b.selectedText!=null&&(typeof b.selectedText!=='string'||b.selectedText.length>2500)))return res.status(400).json({error:'Câu hỏi hoặc phạm vi tài liệu không hợp lệ.'});
  if(!limit('user:'+user.uid,config.rpm)||active>=config.concurrent)return res.status(429).json({error:'Trợ lý đang bận hoặc bạn đã đạt giới hạn lượt hỏi. Vui lòng thử lại sau.'});
  clean();let session=b.conversationId?sessions.get(b.conversationId):null;
  if(b.conversationId&&(!session||session.uid!==user.uid))return res.status(409).json({error:'Phiên hội thoại đã hết hạn. Vui lòng bắt đầu cuộc trò chuyện mới.'});
  if(session?.busy)return res.status(429).json({error:'Câu trả lời trước đang được xử lý.'});
  if(!session&&sessions.size>=config.maxSessions)return res.status(429).json({error:'Có nhiều phiên đang hoạt động. Vui lòng thử lại sau.'});
  const id=b.conversationId||crypto.randomUUID();session||={uid:user.uid,messages:[],context:'',until:Date.now()+config.ttl};sessions.set(id,session);session.busy=true;active++;
  const started=Date.now(),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),config.timeout);res.on('close',()=>{if(!res.writableEnded)controller.abort();});
  const send=(event,value)=>{if(!res.destroyed&&!res.writableEnded)res.write(`event: ${event}\ndata: ${JSON.stringify(value)}\n\n`);};let usage=null,status='error';
  try{
   const index=await knowledge();const doc=index.documents.find(d=>d.documentId===b.currentDocumentId);if(b.currentDocumentId&&!doc) return res.status(400).json({error:'Không tìm thấy tài liệu được đăng ký.'});
   const context=b.scope+':'+(b.currentDocumentId||'');const history=session.context===context&&config.historyTurns?session.messages.slice(-config.historyTurns*2):[];
   session.context=context;session.messages=history;
   if(b.selectedText){const text=normalize(b.selectedText).replace(/\s+/g,' ');if(!index.chunks.some(c=>c.documentId===b.currentDocumentId&&normalize(c.content.replace(/[*#`]/g,'')).replace(/\s+/g,' ').includes(text)))return res.status(400).json({error:'Đoạn được chọn chưa đối chiếu được với nguồn. Hãy chọn đoạn ngắn hơn hoặc nhập câu hỏi trực tiếp.'});}
   const result=retrieve(index,{...b,historyQuery:history.filter(m=>m.role==='user').slice(-2).map(m=>m.text).join(' ')},config);
   const input=buildInput(result.chunks,history,b.message.trim(),b.selectedText);
   // UTF-8 bytes conservatively bound tokenizer input; reserve before API call, including failed requests.
   const reserved=Buffer.byteLength(JSON.stringify(input),'utf8')+config.maxOutputTokens;
   if(result.chunks.length&&!await reserve(reserved))return res.status(429).json({error:'Đã đạt ngân sách sử dụng AI trong ngày. Vui lòng quay lại sau.'});
   res.set({'Content-Type':'text/event-stream; charset=utf-8','X-Accel-Buffering':'no','Connection':'keep-alive'});res.flushHeaders();send('meta',{conversationId:id});
   if(!result.chunks.length){send('delta',{text:result.reason});send('done',{text:result.reason,sources:[]});status='no_sources';return res.end();}
   const answerResult=await answer({config,input,signal:controller.signal,onDelta:text=>send('delta',{text})});usage=answerResult.usage;
   const ids=[...new Set([...answerResult.text.matchAll(/\[S(\d+)\]/g)].map(m=>Number(m[1])-1))].filter(i=>result.chunks[i]);
   const sources=ids.map(i=>{const c=result.chunks[i];return {sourceId:`S${i+1}`,documentId:c.documentId,title:c.title,version:c.version,status:c.status,section:c.sectionTitle,pageNumber:c.pageNumber,route:c.readerRoute};});
   const text=sources.length?answerResult.text.replace(/\[S(\d+)\]/g,(m,n)=>result.chunks[Number(n)-1]?m:''):'Chưa tìm thấy câu trả lời có nguồn tham chiếu xác minh được trong tài liệu hiện có. Hãy nêu rõ chủ đề hoặc thử mở rộng phạm vi hỏi đáp.';session.context=context;session.messages=config.historyTurns?[...history,{role:'user',text:b.message.trim()},{role:'assistant',text:text.slice(0,12000)}].slice(-config.historyTurns*2):[];session.until=Date.now()+config.ttl;
   send('done',{text,sources});status='complete';res.end();
  }catch(error){const message=controller.signal.aborted?'Phản hồi đã dừng hoặc hết thời gian chờ.':error.status===429?'OpenAI đang giới hạn lượt sử dụng hoặc hết hạn mức. Vui lòng thử lại sau.':[401,403,404].includes(error.status)?'Dịch vụ AI chưa sẵn sàng. Vui lòng liên hệ quản trị viên kiểm tra cấu hình.':'Kết nối AI bị gián đoạn. Bạn có thể gửi lại câu hỏi.';if(res.headersSent){send('error',{error:message});res.end();}else res.status(502).json({error:message});
  }finally{clearTimeout(timer);session.busy=false;active--;console.info(JSON.stringify({event:'organic_ai',model:config.model,durationMs:Date.now()-started,status,inputTokens:usage?.input_tokens,outputTokens:usage?.output_tokens}));}
 });
 router.use((error,_req,res,_next)=>res.status(error.type==='entity.too.large'?413:400).json({error:'Yêu cầu không hợp lệ hoặc quá dài.'}));return router;
}
