import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { root,parseDocument,registeredPath } from './document-parser.js';
export async function buildKnowledge(){
 const docs=JSON.parse(await fs.readFile(path.join(root,'source/data/documents.json'),'utf8'));const documents=[],chunks=[];
 for(const doc of docs){const metadata={documentId:doc.id,documentCode:doc.documentCode,title:doc.title,version:doc.version,status:doc.status,updatedAt:doc.updatedAt,categoryId:doc.categoryId,departmentId:doc.departmentId,sourcePath:doc.contentPath||doc.filePath||null,contentType:doc.fileType,aiEnabled:doc.aiEnabled===true,isCurrentVersion:doc.isCurrentVersion!==false,readerRoute:doc.internalRoute||`#documents/view/${doc.id}`};
  if(!metadata.aiEnabled){documents.push({...metadata,indexStatus:'disabled'});continue;}
  if(doc.status==='Chưa cập nhật'||!(doc.contentPath||doc.filePath)){documents.push({...metadata,indexStatus:'missing_content'});continue;}
  try{const parts=await parseDocument(doc);let count=0;
   for(const part of parts){const paragraphs=part.content.split(/\n\s*\n/);let text='';const emit=()=>{if(text.trim().length<30)return;const id=crypto.createHash('sha256').update(doc.id+part.sectionTitle+text).digest('hex').slice(0,20);let readerRoute=part.readerRoute||metadata.readerRoute;
    // Company subheadings inherit their numbered parent section; only real anchors are emitted.
    let sectionId=part.sectionId||'';if(doc.readerKind==='company-profile'&&/^company-\d{2}$/.test(sectionId)&&sectionId!=='company-00')readerRoute='#about-company/'+sectionId;
    chunks.push({chunkId:id,...metadata,sectionId,anchor:sectionId||null,sectionTitle:part.sectionTitle,pageNumber:part.pageNumber,readerRoute,content:text.trim()});count++;};
    for(const paragraph of paragraphs){if(text.length+paragraph.length>3200&&text){emit();text=text.slice(-350)+'\n';}if(paragraph.length>5000){for(let i=0;i<paragraph.length;i+=2850){text+=paragraph.slice(i,i+3200);emit();text='';}}else text+=paragraph+'\n\n';}emit();}
   documents.push({...metadata,indexStatus:count?'indexed':'no_extractable_text',chunks:count});
  }catch{documents.push({...metadata,indexStatus:'unavailable'});}
 }
 const seen=new Set();return {builtAt:new Date().toISOString(),documents,chunks:chunks.filter(c=>!seen.has(c.chunkId)&&seen.add(c.chunkId))};
}
let cached,pending,stamp='';
export async function getKnowledge(){const files=['source/data/documents.json','source/data.json','source/data/about-company.md','source/strategy.md','source/plan-meta.json'];const docs=JSON.parse(await fs.readFile(path.join(root,'source/data/documents.json'),'utf8'));const sourceStamps=await Promise.all(docs.filter(d=>d.aiEnabled).map(async d=>{try{const p=await registeredPath(d.contentPath||d.filePath);return (await fs.stat(p)).mtimeMs;}catch{return 'missing';}}));const next=(await Promise.all(files.map(async f=>(await fs.stat(path.join(root,f))).mtimeMs))).join(':')+sourceStamps.join(':');if(cached&&next===stamp)return cached;if(!pending)pending=buildKnowledge().then(x=>{cached=x;stamp=next;return x;}).finally(()=>pending=null);return pending;}
