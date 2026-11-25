import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export async function registeredPath(relative){
 if(typeof relative!=='string'||!relative||path.isAbsolute(relative)||relative.includes('\0'))throw Error('invalid_path');
 const full=path.resolve(root,relative);const real=await fs.realpath(full);
 if(!real.startsWith(root+path.sep)||!['.md','.html','.pdf','.docx'].includes(path.extname(real).toLowerCase()))throw Error('unsupported_path');
 if((await fs.stat(real)).size>30*1024*1024)throw Error('file_too_large');return real;
}
export function plainHTML(html){const $=load(html);$('script,style,nav,header,footer,button,input,select,textarea,.toc,.pageheader').remove();$('tr').each((_,r)=>{$(r).append('\n');$(r).find('th,td').append(' | ');});$('p,h1,h2,h3,h4,li,div').append('\n');return $.text().replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();}
export function markdownSections(text){
 const sections=[];let heading='Tổng quan',body=[],index=0;
 const flush=()=>{if(body.join('\n').trim())sections.push({sectionTitle:heading,content:body.join('\n').trim(),ordinal:index++});body=[];};
 for(const line of text.split(/\r?\n/)){const m=line.match(/^#{1,4}\s+(.+)/);if(m){flush();heading=m[1];}else body.push(line);}flush();return sections;
}
export async function parseDocument(doc){
 const source=await registeredPath(doc.contentPath||doc.filePath);const extension=path.extname(source).toLowerCase();
 if(doc.readerKind==='strategy-v21'){
  const data=JSON.parse(await fs.readFile(path.join(root,'source/data.json'),'utf8'));const chunks=[];
  for(const s of data.sections){const $=load(s.html);let sectionTitle=s.title,sectionId='',body=[];const flush=()=>{if(body.join('\n').trim())chunks.push({sectionTitle,sectionId,content:body.join('\n').trim(),readerRoute:`#p${s.p}${sectionId?'/'+sectionId:''}`});body=[];};
   $('body').children().each((_,el)=>{if(['h2','h3'].includes(el.tagName)){flush();sectionTitle=$(el).text();sectionId=$(el).attr('id')||'';}body.push(plainHTML($.html(el)));});flush();}
  return chunks;
 }
 if(extension==='.md'){
  let sectionId='';return markdownSections(await fs.readFile(source,'utf8')).map(s=>{const numbered=s.sectionTitle.match(/^(\d{2})\./);if(doc.readerKind==='company-profile'&&numbered)sectionId=`company-${numbered[1]}`;return {...s,sectionId,readerRoute:doc.internalRoute||`#documents/view/${doc.id}`};});
 }
 if(extension==='.html'){
  const $=load(await fs.readFile(source,'utf8'));$('script,style,nav,header,footer,button').remove();const article=$('article').first(),parts=[];let title='Tổng quan',content=[];
  const flush=()=>{if(content.join('\n').trim())parts.push({sectionTitle:title,content:content.join('\n')});content=[];};
  (article.length?article:$('body')).find('h1,h2,h3,p,table,ul,ol').filter((_,el)=>!$(el).parents('table,ul,ol').length).each((_,el)=>{if(/^h[123]$/.test(el.tagName)){flush();title=$(el).text();}else content.push(plainHTML($.html(el)));});flush();return parts;
 }
 if(extension==='.docx'){const mammoth=await import('mammoth');return markdownSections((await mammoth.extractRawText({path:source})).value);}
 if(extension==='.pdf'){const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');const task=getDocument({data:new Uint8Array(await fs.readFile(source)),isEvalSupported:false,useSystemFonts:true});const pdf=await task.promise;const pages=[];try{for(let n=1;n<=Math.min(pdf.numPages,500);n++){const page=await pdf.getPage(n);const text=(await page.getTextContent()).items.map(i=>i.str+(i.hasEOL?'\n':' ')).join('');if(text.trim().length>30)pages.push({sectionTitle:`Trang ${n}`,pageNumber:n,content:text});}return pages;}finally{await task.destroy();}}
 return [];
}
