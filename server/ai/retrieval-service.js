export const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
const stop=new Set(['la','va','cua','cho','ve','cac','nhung','trong','mot','toi','nay','gi','the','nao','voi','duoc','co','khong','hay','tai','lieu']);
export function retrieve(index,{message,scope,currentDocumentId,currentSectionId,selectedText,historyQuery=''},config){
 const current=index.documents.find(d=>d.documentId===currentDocumentId);
 if(scope==='current_document'&&(!current||current.indexStatus!=='indexed'))return {chunks:[],reason:'Tài liệu đang đọc chưa có nội dung được lập chỉ mục. Hãy chọn Toàn bộ tài liệu nội bộ.'};
 const compare=/v2\.0|ban cu|ban luu tru|hai phien ban|phien ban.*(cu|truoc)/.test(normalize(message));
 const tokens=[...new Set(normalize(message+' '+historyQuery+' '+(selectedText||'')).match(/[a-z0-9]{2,}/g)||[])].filter(t=>!stop.has(t));
 const general=/tom tat|noi dung chinh|giai thich.*(nay|phan)|de hieu/.test(normalize(message));
 const candidates=index.chunks.filter(c=>(scope!=='current_document'||c.documentId===currentDocumentId)&&(c.isCurrentVersion||compare||c.documentId===currentDocumentId));
 const scored=candidates.map(c=>{const body=normalize(c.content),title=normalize(c.sectionTitle+' '+c.title);let score=tokens.reduce((n,t)=>n+(title.includes(t)?5:0)+(body.includes(t)?1:0),0);if((score>0||general)&&c.sectionId===currentSectionId&&c.documentId===currentDocumentId)score+=8;if(scope==='auto'&&c.documentId===currentDocumentId&&(score>0||general))score+=4;if((scope==='current_document'||scope==='auto')&&general&&c.documentId===currentDocumentId)score+=2;return {c,score};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||Number(b.c.isCurrentVersion)-Number(a.c.isCurrentVersion));
 const ordered=compare&&scope!=='current_document'?[...scored.filter((x,i,arr)=>arr.findIndex(y=>y.c.documentId===x.c.documentId)===i),...scored]:scored;
 let length=0;const chunks=[];for(const {c} of ordered){if(chunks.length>=config.chunks)break;if(chunks.some(x=>x.chunkId===c.chunkId)||length+c.content.length>config.maxContextChars)continue;chunks.push(c);length+=c.content.length;}
 return {chunks,reason:chunks.length?'':'Chưa tìm thấy nội dung phù hợp trong tài liệu hiện có. Bạn có thể nêu rõ chủ đề hoặc đặt câu hỏi cụ thể hơn.'};
}
