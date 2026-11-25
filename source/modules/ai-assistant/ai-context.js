import { data,portal } from '../../shared/data-service.js';
export function getAIContext(){
 const route=location.hash.slice(1).split('/'),main=document.getElementById('main');let id=null,sectionId=null;
 if(route[0]==='about-company'||(route[0]==='documents'&&route[2]==='DOC-CORP-PROFILE'))id='DOC-CORP-PROFILE';
 else if(/^p\d+$/.test(route[0])||route[0]==='all'||route[0]==='dashboard'||(route[0]==='departments'&&route[1]==='truyen-thong'))id='DOC-STR-COM-2027-V21';
 else if(route[0]==='documents'&&route[1]==='view')id=route[2];
 const doc=(portal.documents||[]).find(d=>d.id===id);
 if(!doc||doc.aiEnabled!==true||doc.status==='Chưa cập nhật'||!(doc.contentPath||doc.filePath))return {documentId:null,sectionId:null,title:'Toàn bộ tài liệu nội bộ',kind:'general',available:false};
 const visible=[...(main?.querySelectorAll('.company-story-section[id],.article h2[id],.article h3[id]')||[])].filter(el=>el.getBoundingClientRect().top<innerHeight&&el.getBoundingClientRect().bottom>60);
 sectionId=visible.find(el=>el.getBoundingClientRect().top>=60)?.id||visible.at(-1)?.id||route[1]||null;
 if(!/^[\w-]{1,120}$/.test(sectionId||''))sectionId=null;
 return {documentId:doc.id,sectionId,title:doc.title,kind:doc.readerKind==='company-profile'?'company':doc.readerKind==='strategy-v21'?'strategy':'document',available:true,version:doc.version,status:doc.status};
}
export function suggestions(context){return context.kind==='company'?['Organic Việt Nam là doanh nghiệp như thế nào?','Giải thích hệ sinh thái Organic Việt Nam.','ADIGO có vai trò gì?','Tóm tắt tài liệu này.']:context.kind==='strategy'?['Mục tiêu chiến lược truyền thông 2027 là gì?','Giải thích 10 trụ cột truyền thông.','Tóm tắt lộ trình triển khai.','Chiến lược này có những nội dung trọng tâm nào?']:context.available?['Tóm tắt tài liệu này.','Những nội dung nào cần lưu ý?','Giải thích thuật ngữ trong tài liệu.','Tìm tài liệu liên quan.']:['Organic Việt Nam là doanh nghiệp như thế nào?','Giải thích hệ sinh thái Organic Việt Nam.','ADIGO có vai trò gì?','Tìm tài liệu giới thiệu doanh nghiệp.'];}
