import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createAIRouter } from '../server/ai/ai-routes.js';
import { getAIConfig } from '../server/ai/ai-config.js';
import { buildKnowledge } from '../server/ai/knowledge-service.js';
import { registeredPath,parseDocument,root } from '../server/ai/document-parser.js';
import { retrieve } from '../server/ai/retrieval-service.js';
import { AI_PROMPT } from '../server/ai/ai-prompt.js';
import { streamAnswer } from '../server/ai/openai-service.js';
import http from 'node:http';
const index=await buildKnowledge();
const config={...getAIConfig(),apiKey:'test-not-a-real-key',rpm:60,dailyTokens:10000000};
const question={message:'ADIGO có vai trò gì?',scope:'current_document',currentDocumentId:'DOC-CORP-PROFILE',currentSectionId:'company-10'};
async function appServer(t,overrides={}){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'organic-ai-test-'));const app=express();let calls=[];
 app.use('/api/ai',createAIRouter({config:{...config,budgetDirectory:dir,...overrides.config},knowledge:async()=>index,verifyToken:async token=>{if(token!=='valid')throw Error();return {uid:'test-user',email:'test@example.com',email_verified:true};},answer:async opts=>{calls.push(opts);opts.onDelta('ADIGO kết nối dữ liệu [S1].');return {text:'ADIGO kết nối dữ liệu [S1]. [S999]',usage:{input_tokens:200,output_tokens:40}};},...overrides, ...{config:{...config,budgetDirectory:dir,...overrides.config}}}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 t.after(async()=>{await new Promise(r=>server.close(r));await fs.rm(dir,{recursive:true,force:true});});
 const post=(body=question,token='valid')=>fetch(base+'/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});return {base,post,calls};
}
test('index contains only enabled registered real sources and stable unique chunks',async()=>{
 assert.equal(index.documents.filter(d=>d.indexStatus==='indexed').length,3);assert.equal(new Set(index.chunks.map(c=>c.chunkId)).size,index.chunks.length);
 assert(!index.chunks.some(c=>c.documentId==='DOC-HR-RULES'));assert(index.chunks.filter(c=>c.documentId==='DOC-CORP-PROFILE').some(c=>c.readerRoute==='#about-company/company-10'));
 const second=await buildKnowledge();assert.deepEqual(index.chunks.map(c=>c.chunkId),second.chunks.map(c=>c.chunkId));
 await assert.rejects(registeredPath('../outside.md'));await assert.rejects(registeredPath('server/ai/ai-config.js'));
});
test('accent-insensitive retrieval, current scope, current version, comparison and missing data',()=>{
 const current=retrieve(index,{...question,message:'ADIGO co vai tro gi'},config);assert(current.chunks.length);assert(current.chunks.every(c=>c.documentId==='DOC-CORP-PROFILE'));
 const all=retrieve(index,{message:'Chiến lược truyền thông',scope:'all_documents'},config);assert(all.chunks.every(c=>c.isCurrentVersion));
 const compare=retrieve(index,{message:'So sánh V2.0 và V2.1 chiến lược truyền thông',scope:'all_documents'}, {...config,chunks:8});assert(compare.chunks.some(c=>!c.isCurrentVersion));assert(compare.chunks.some(c=>c.documentId==='DOC-STR-COM-2027-V21'));
 assert.equal(retrieve(index,{...question,currentDocumentId:'DOC-HR-RULES'},config).chunks.length,0);
 assert.equal(retrieve(index,{message:'zzzxqv888',scope:'all_documents'},config).chunks.length,0);
});
test('automatic context prefers current reading while allowing relevant cross-document retrieval',()=>{
 const automatic=retrieve(index,{...question,scope:'auto',message:'Tóm tắt phần này'},config);assert(automatic.chunks.length);assert.equal(automatic.chunks[0].documentId,'DOC-CORP-PROFILE');
 const cross=retrieve(index,{...question,scope:'auto',message:'Giải thích 10 trụ cột chiến lược truyền thông 2027'},config);assert(cross.chunks.some(c=>c.documentId==='DOC-STR-COM-2027-V21'));
 const home=retrieve(index,{scope:'auto',message:'ADIGO có vai trò gì?'},config);assert(home.chunks.length);assert(home.chunks.every(c=>c.isCurrentVersion));
});
test('unconfigured status and chat never simulate a model',async t=>{const s=await appServer(t,{config:{apiKey:''}});assert.equal((await (await fetch(s.base+'/api/ai/status')).json()).configured,false);assert.equal((await s.post()).status,503);assert.equal(s.calls.length,0);});
test('authentication, strict scope and payload validation',async t=>{const s=await appServer(t);assert.equal((await s.post(question,null)).status,401);assert.equal((await s.post(question,'invalid')).status,401);assert.equal((await s.post({...question,currentDocumentId:'../../.env'})).status,400);assert.equal((await s.post({...question,message:'x'.repeat(4001)})).status,400);assert.equal((await s.post({...question,selectedText:'not from the source'})).status,400);assert.equal(s.calls.length,0);});
test('SSE uses trusted citations; context change clears history; session ownership enforced',async t=>{
 const s=await appServer(t);const first=await s.post();assert.equal(first.status,200);const raw=await first.text();assert(raw.includes('event: delta'));assert(!raw.includes('test-not-a-real-key'));const events=[...raw.matchAll(/data: (.+)/g)].map(m=>JSON.parse(m[1]));const id=events[0].conversationId,done=events.at(-1);assert.equal(done.sources.length,1);assert(done.sources[0].route.startsWith('#about-company/'));assert(!done.text.includes('S999'));assert.equal(s.calls[0].input[0].content,AI_PROMPT);
 const second=await s.post({...question,message:'Giải thích thêm về vai trò đó.',conversationId:id});await second.text();assert(s.calls[1].input.some(m=>m.content===question.message));
 const changed=await s.post({...question,currentDocumentId:'DOC-STR-COM-2027-V21',currentSectionId:null,conversationId:id});await changed.text();assert(!s.calls[2].input.some(m=>m.content==='Giải thích thêm về vai trò đó.'));
 assert.equal((await s.post({...question,conversationId:'not-my-session'})).status,409);
});
test('no relevant source avoids model call; per-user rate and daily budget are enforced',async t=>{
 const s=await appServer(t,{config:{dailyRequests:1}});const none=await s.post({...question,message:'zzzxqv888',currentSectionId:null});assert((await none.text()).includes('Chưa tìm thấy'));assert.equal(s.calls.length,0);
 await (await s.post()).text();assert.equal((await s.post()).status,429);assert.equal(s.calls.length,1);
 const limited=await appServer(t,{config:{rpm:1}});await (await limited.post()).text();assert.equal((await limited.post()).status,429);
});
test('upstream failures are safe and client disconnect cancels model work',async t=>{
 const bad=await appServer(t,{answer:async()=>{throw Object.assign(Error('private-secret-stack'),{status:401});}});const response=await bad.post();const raw=await response.text();assert(raw.includes('event: error'));assert(!raw.includes('private-secret-stack'));
 let aborted=false;const s=await appServer(t,{answer:async({signal})=>new Promise((_,reject)=>{signal.addEventListener('abort',()=>{aborted=true;reject(Error('abort'));});})});const controller=new AbortController();const r=await fetch(s.base+'/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer valid'},body:JSON.stringify(question),signal:controller.signal});await r.body.getReader().read();controller.abort();await new Promise(r=>setTimeout(r,50));assert(aborted);
});
test('official OpenAI SDK Responses streaming contract (local HTTP fixture, no external call)',async t=>{
 const previous=process.env.OPENAI_BASE_URL;let request;
 const upstream=http.createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;request=JSON.parse(raw);assert.equal(req.url,'/responses');res.writeHead(200,{'Content-Type':'text/event-stream'});for(const event of [{type:'response.output_text.delta',delta:'Dữ liệu [S1].'},{type:'response.completed',response:{id:'fixture',object:'response',status:'completed',usage:{input_tokens:10,output_tokens:4}}}])res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);res.end();}).listen(0,'127.0.0.1');await new Promise(r=>upstream.on('listening',r));
 t.after(async()=>{if(previous===undefined)delete process.env.OPENAI_BASE_URL;else process.env.OPENAI_BASE_URL=previous;await new Promise(r=>upstream.close(r));});process.env.OPENAI_BASE_URL=`http://127.0.0.1:${upstream.address().port}`;
 const deltas=[];const result=await streamAnswer({config,input:[{role:'user',content:'test'}],signal:new AbortController().signal,onDelta:d=>deltas.push(d)});assert.equal(request.store,false);assert.equal(request.stream,true);assert.equal(request.model,config.model);assert.equal(request.max_output_tokens,1500);assert.equal(result.text,deltas.join(''));assert.equal(result.usage.output_tokens,4);
});
test('missing citations fail closed; concurrency cannot exceed configured upstream slots',async t=>{
 const noCites=await appServer(t,{answer:async({onDelta})=>{onDelta('Không có mã nguồn');return {text:'Thông tin không có mã nguồn.',usage:null};}});const raw=await (await noCites.post()).text();const done=[...raw.matchAll(/data: (.+)/g)].map(m=>JSON.parse(m[1])).at(-1);assert(done.text.includes('Chưa tìm thấy câu trả lời có nguồn'));assert.deepEqual(done.sources,[]);
 let release;const pending=await appServer(t,{config:{concurrent:1},answer:async({onDelta})=>{await new Promise(r=>release=r);onDelta('ADIGO [S1]');return {text:'ADIGO [S1]',usage:null};}});const first=await pending.post();await first.body.getReader().read();assert.equal((await pending.post()).status,429);release();
});
test('registered PDF text is extracted with page number; no OCR claim for blank pages',async t=>{
 const dir=await fs.mkdtemp(path.join(root,'tests/parser-fixture-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const stream='BT /F1 12 Tf 40 100 Td (Organic Vietnam document knowledge reference text) Tj ET';const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];let pdf='%PDF-1.4\n',offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
 const file=path.join(dir,'sample.pdf');await fs.writeFile(file,pdf);const parts=await parseDocument({id:'fixture',filePath:path.relative(root,file)});assert.equal(parts[0].pageNumber,1);assert(parts[0].content.includes('Organic Vietnam'));await fs.writeFile(file,pdf.replace('Organic Vietnam document knowledge reference text',' '.repeat('Organic Vietnam document knowledge reference text'.length)));assert.equal((await parseDocument({id:'fixture',filePath:path.relative(root,file)})).length,0);
});
