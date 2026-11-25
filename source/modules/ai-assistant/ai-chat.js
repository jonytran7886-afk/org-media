import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { esc } from '../../shared/utils.js';
import { streamAI } from '../../shared/ai-client.js';
import { getAIContext } from './ai-context.js';

const icon=path=>`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
const spark=icon('<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4m-2-2h4"/>');
export function renderAIMarkdown(text){return DOMPurify.sanitize(marked.parse(text,{async:false,gfm:true,breaks:true}),{ALLOWED_TAGS:['p','br','strong','em','h1','h2','h3','h4','ul','ol','li','blockquote','table','thead','tbody','tr','th','td','code','pre','hr'],ALLOWED_ATTR:[]});}

export function initAIAssistant(){
 const topbar=document.querySelector('.topbar .actions');if(!topbar)return;
 const trigger=document.createElement('button');trigger.className='btn small ai-trigger';trigger.type='button';trigger.setAttribute('aria-label','Trợ lý AI');trigger.setAttribute('aria-controls','organic-ai');trigger.setAttribute('aria-expanded','false');trigger.innerHTML=spark+'<span>Trợ lý AI</span>';topbar.prepend(trigger);
 const panel=document.createElement('aside');panel.id='organic-ai';panel.className='ai-panel';panel.hidden=true;panel.setAttribute('aria-label','Organic AI – Trợ lý tài liệu nội bộ');
 panel.innerHTML=`<div class="ai-resizer" role="separator" tabindex="0" aria-label="Thay đổi chiều rộng trợ lý" aria-orientation="vertical" aria-valuemin="340" aria-valuemax="560" aria-valuenow="420"></div><header class="ai-header"><div class="ai-brand">${spark}<div><strong>Organic AI</strong><small>Trợ lý tài liệu nội bộ</small></div></div><div class="ai-header-actions"><button type="button" class="iconbtn" data-ai-new title="Cuộc trò chuyện mới" aria-label="Cuộc trò chuyện mới">${icon('<path d="M12 5v14M5 12h14"/>')}</button><button type="button" class="iconbtn" data-ai-expand title="Mở rộng hoặc thu gọn" aria-label="Mở rộng trợ lý" aria-pressed="false">${icon('<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>')}</button><button type="button" class="iconbtn" data-ai-close title="Quay lại tài liệu" aria-label="Đóng trợ lý, quay lại tài liệu">${icon('<path d="m6 6 12 12M6 18 18 6"/>')}</button></div></header><div class="ai-conversation" id="ai-conversation" tabindex="0" aria-label="Hội thoại"><div class="ai-welcome"><h2>Bạn muốn tìm hiểu điều gì?</h2><p>Hỏi đáp về Organic Việt Nam và tài liệu nội bộ.</p></div><div id="ai-messages"></div></div><div class="ai-compose"><div id="ai-selection" hidden></div><div id="ai-status" role="status" aria-live="polite"></div><form id="ai-form"><label class="banner-sr-only" for="ai-input">Nhập câu hỏi của bạn</label><textarea id="ai-input" placeholder="Nhập câu hỏi của bạn..." rows="1" maxlength="2000"></textarea><button type="submit" class="ai-send" id="ai-send" aria-label="Gửi câu hỏi" title="Gửi câu hỏi">${icon('<path d="M12 19V5m-6 6 6-6 6 6"/>')}</button></form><p class="ai-disclaimer">AI có thể mắc lỗi. Hãy đối chiếu với tài liệu nguồn.</p></div>`;
 document.body.append(panel);
 const $=s=>panel.querySelector(s);const conversation=$('#ai-conversation'),messages=$('#ai-messages'),input=$('#ai-input'),status=$('#ai-status');
 let context=getAIContext(),contextKey='',conversationId=null,controller=null,busy=false,selectedText='',expanded=false,open=false;let originalScroll=0,generation=0;
 const store=(key,value)=>{try{sessionStorage.setItem(key,value);}catch{}};
 const read=(key,fallback)=>{try{return sessionStorage.getItem(key)||fallback;}catch{return fallback;}};
 function width(value){const w=Math.min(560,Math.max(340,value));document.documentElement.style.setProperty('--ai-width',w+'px');$('.ai-resizer').setAttribute('aria-valuenow',String(w));store('organic-ai-width',String(w));}
 width(Number(read('organic-ai-width','420')));
 function setOpen(value){open=value;panel.hidden=!open;document.body.classList.toggle('ai-open',open);trigger.setAttribute('aria-expanded',String(open));store('organic-ai-open',String(open));if(open){originalScroll=scrollY;updateContext();input.focus();}else{document.body.classList.remove('ai-expanded');expanded=false;trigger.focus();if(innerWidth<1280)window.scrollTo(0,originalScroll);}}
 trigger.onclick=()=>setOpen(!open);$('[data-ai-close]').onclick=()=>setOpen(false);
 $('[data-ai-expand]').onclick=()=>{expanded=!expanded;document.body.classList.toggle('ai-expanded',expanded);$('[data-ai-expand]').setAttribute('aria-pressed',String(expanded));$('[data-ai-expand]').setAttribute('aria-label',expanded?'Thu gọn trợ lý':'Mở rộng trợ lý');};
 function updateContext(){context=getAIContext();const key=context.documentId||'all';if(key!==contextKey){selectedText='';$('#ai-selection').hidden=true;contextKey=key;}}
 window.addEventListener('hashchange',()=>requestAnimationFrame(updateContext));
 function resizeInput(){input.style.height='auto';input.style.height=Math.min(160,input.scrollHeight)+'px';}
 input.addEventListener('input',resizeInput);
 function reset(){generation++;controller?.abort();input.value='';resizeInput();conversationId=null;messages.replaceChildren();$('.ai-welcome').hidden=false;status.textContent='';selectedText='';$('#ai-selection').hidden=true;}
 $('[data-ai-new]').onclick=reset;
 let authUid=window.__ovnFirebaseTracker?.getSyncState?.().user?.uid||null;
 window.addEventListener('ovn-auth-changed',event=>{const uid=event.detail?.uid||null;if(uid!==authUid){authUid=uid;reset();}});
 const nearBottom=()=>conversation.scrollHeight-conversation.scrollTop-conversation.clientHeight<100;
 function scrollIf(should){if(should)conversation.scrollTop=conversation.scrollHeight;}
 function sourceHTML(sources){return sources.length?`<div class="ai-sources"><strong>Nguồn tham chiếu</strong>${sources.filter(s=>/^#[\w/-]+$/.test(s.route)).map(s=>`<a href="${esc(s.route)}"><span>[${esc(s.sourceId)}] ${esc(s.title)}</span><small>${esc([s.version,s.section,s.pageNumber?'Trang '+s.pageNumber:'',s.status].filter(Boolean).join(' · '))}</small></a>`).join('')}</div>`:'';}
 async function submit(request=null){
  if(busy)return;const currentGeneration=generation;const question=request?.message||input.value.trim();if(!question)return;
  context=getAIContext();const body=request||{message:question,currentDocumentId:context.documentId,currentSectionId:context.sectionId,scope:'auto',selectedText:selectedText||undefined};
  const user=document.createElement('div');user.className='ai-message ai-user';user.textContent=question;messages.append(user);const reply=document.createElement('section');reply.className='ai-message ai-reply';reply.innerHTML='<div class="ai-answer"></div><div class="ai-reply-footer"></div>';messages.append(reply);const answer=reply.querySelector('.ai-answer'),footer=reply.querySelector('.ai-reply-footer');
  $('.ai-welcome').hidden=true;input.value='';selectedText='';$('#ai-selection').hidden=true;resizeInput();busy=true;controller=new AbortController();$('#ai-send').type='button';$('#ai-send').setAttribute('aria-label','Dừng phản hồi');$('#ai-send').title='Dừng phản hồi';$('#ai-send').innerHTML=icon('<rect x="7" y="7" width="10" height="10" rx="1"/>');status.textContent='';answer.textContent='Organic AI đang trả lời…';scrollIf(true);let text='';
  try{await streamAI({...body,conversationId},{signal:controller.signal,onEvent:(event,value)=>{if(currentGeneration!==generation)return;
   if(event==='meta')conversationId=value.conversationId;
   if(event==='delta'){const follow=nearBottom();text+=value.text;answer.innerHTML=renderAIMarkdown(text);scrollIf(follow);}
   if(event==='done'){const follow=nearBottom();text=value.text;answer.innerHTML=renderAIMarkdown(text);footer.innerHTML=sourceHTML(value.sources||[]);const copy=document.createElement('button');copy.type='button';copy.className='ai-copy';copy.textContent='Sao chép';copy.onclick=async()=>{try{await navigator.clipboard.writeText(text);copy.textContent='Đã sao chép';}catch{status.textContent='Bạn có thể chọn và sao chép nội dung trả lời.';}};footer.append(copy);scrollIf(follow);status.textContent='';}
  }});}catch(error){if(currentGeneration!==generation)return;status.textContent=error.name==='AbortError'?'Đã dừng phản hồi.':error.message;if(!text)answer.textContent='Chưa nhận được câu trả lời.';const retry=document.createElement('button');retry.className='btn small';retry.type='button';retry.textContent='Gửi lại câu hỏi';retry.onclick=()=>submit(body);footer.append(retry);}finally{busy=false;$('#ai-send').type='submit';$('#ai-send').setAttribute('aria-label','Gửi câu hỏi');$('#ai-send').title='Gửi câu hỏi';$('#ai-send').innerHTML=icon('<path d="M12 19V5m-6 6 6-6 6 6"/>');controller=null;}
 }
 $('#ai-send').onclick=e=>{if(busy){e.preventDefault();controller?.abort();}};
 $('#ai-form').onsubmit=e=>{e.preventDefault();submit();};input.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();submit();}};
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();setOpen(false);}});
 const resizer=$('.ai-resizer');resizer.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();width(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ai-width'))+(e.key==='ArrowLeft'?20:-20));}};
 resizer.onpointerdown=e=>{e.preventDefault();resizer.setPointerCapture(e.pointerId);resizer.onpointermove=event=>width(innerWidth-event.clientX);resizer.onpointerup=()=>{resizer.onpointermove=null;};};
 const selectionBar=document.createElement('div');selectionBar.className='ai-selection-toolbar';selectionBar.hidden=true;selectionBar.innerHTML='<button type="button">Hỏi AI</button><button type="button">Giải thích</button><button type="button">Tóm tắt</button>';document.body.append(selectionBar);let selection='';
 document.addEventListener('selectionchange',()=>{const s=window.getSelection(),node=s?.anchorNode;selection=s?.toString().trim()||'';selectionBar.hidden=!(selection.length>=10&&selection.length<=2500&&node&&document.getElementById('main')?.contains(node)&&getAIContext().available);});
 selectionBar.onmousedown=e=>e.preventDefault();selectionBar.onclick=e=>{if(e.target.tagName!=='BUTTON')return;const action=e.target.textContent;setOpen(true);selectedText=selection;$('#ai-selection').textContent='Đoạn đã chọn: '+selection.slice(0,180)+(selection.length>180?'…':'');$('#ai-selection').hidden=false;input.value=action==='Tóm tắt'?'Tóm tắt đoạn văn được chọn.':action==='Giải thích'?'Giải thích đoạn văn được chọn theo cách dễ hiểu.':'Giải thích rõ hơn đoạn văn được chọn.';selectionBar.hidden=true;resizeInput();input.focus();};

 updateContext();if(read('organic-ai-open','false')==='true')setOpen(true);
}
