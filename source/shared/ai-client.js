export async function streamAI(request,{signal,onEvent}){
 const token=await window.__ovnFirebaseTracker?.getAIAuthToken?.();
 const response=await fetch('/api/ai/chat',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(request),signal});
 if(!response.ok){const body=await response.json().catch(()=>({}));throw Error(body.error||'Không thể kết nối Trợ lý AI.');}
 if(!response.body)throw Error('Trình duyệt chưa hỗ trợ phản hồi trực tuyến.');
 const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',doneEvent=false;
 try{while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let pos;while((pos=buffer.indexOf('\n\n'))>=0){const block=buffer.slice(0,pos);buffer=buffer.slice(pos+2);const event=block.match(/^event: (.+)$/m)?.[1],json=block.match(/^data: (.+)$/m)?.[1];if(json){const data=JSON.parse(json);if(event==='error')throw Error(data.error);if(event==='done')doneEvent=true;onEvent(event,data);}}}if(!doneEvent)throw Error('Phản hồi bị gián đoạn. Bạn có thể gửi lại câu hỏi.');}finally{reader.releaseLock();}
}
