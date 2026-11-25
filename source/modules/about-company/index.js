import { esc } from '../../shared/utils.js';
import { portal } from '../../shared/data-service.js';

const chain = ['ORGANIC FARM', 'ORGANIC FOOD', 'ORGANIC DISTRIBUTION', 'ADIGO MART / MARKETPLACE', 'KHÁCH HÀNG'];
function ecosystemDiagram() {
 return `<figure class="company-ecosystem"><div class="company-parent"><img src="assets/organic-vietnam-symbol.svg" alt="" width="36" height="34"><strong>ORGANIC VIỆT NAM</strong><span>Định hướng · Đầu tư · Phát triển</span></div><div class="company-chain">${chain.map((title,i)=>`<div><small>${['Nguồn nguyên liệu','Giá trị sản phẩm','Kết nối sản phẩm','Bán lẻ & Thương mại số','Nhu cầu & Trải nghiệm'][i]}</small><strong>${title}</strong></div>`).join('')}</div><div class="company-tech"><strong>ADIGO</strong><span>Công nghệ và dữ liệu kết nối xuyên suốt hệ sinh thái</span></div><figcaption>Mô hình định hướng phát triển · Phản hồi từ khách hàng kết nối trở lại sản xuất và cải tiến sản phẩm.</figcaption></figure>`;
}
function valueLoop() {
 return `<figure class="company-value-loop"><ol>${['Nguồn nguyên liệu','Sản xuất','Sản phẩm','Phân phối','Khách hàng','Dữ liệu','Cải tiến giá trị'].map(x=>`<li>${x}</li>`).join('')}</ol><figcaption>Vòng kết nối liên tục giữa nguồn cung, khách hàng và cải tiến giá trị.</figcaption></figure>`;
}
export function renderAboutCompany(hostEl) {
 const sections=portal.aboutCompany?.sections||[];
 const media=portal.aboutCompany?.media||{};
 const figure=(image,cls='')=>image?.src ? `<figure class="company-media ${cls}"><img src="${esc(image.src)}" alt="${esc(image.alt||'')}" loading="lazy">${image.caption?`<figcaption>${esc(image.caption)}</figcaption>`:''}</figure>` : '';
 hostEl.innerHTML=`<div class="company-profile"><header class="company-hero"><div class="company-hero-copy"><span class="company-kicker">ORGANIC VIỆT NAM</span><h1>Kiến tạo hệ sinh thái giá trị</h1><p>Nông nghiệp · Thực phẩm · Công nghệ</p></div><img src="assets/organic-vietnam-symbol.svg" alt="Biểu tượng Organic Việt Nam" width="180" height="168"></header>
 <details class="company-toc"><summary>Khám phá Organic Việt Nam</summary><nav aria-label="Mục lục giới thiệu doanh nghiệp">${sections.map(s=>`<a href="#about-company/${s.id}">${esc(s.title)}</a>`).join('')}</nav></details>
 <article class="company-story">${sections.map(s=>`<section id="${s.id}" class="company-story-section ${['company-03','company-04'].includes(s.id)?'company-proposed':''}"><h2>${esc(s.title)}</h2>${s.id==='company-03'?'<aside class="company-editorial-note">Tầm nhìn, sứ mệnh, triết lý và giá trị cốt lõi dưới đây là nội dung giới thiệu đề xuất, chờ Ban lãnh đạo xác nhận trước khi công bố chính thức.</aside>':''}${s.html}${s.id==='company-05'?ecosystemDiagram():s.id==='company-12'?valueLoop():''}</section>`).join('')}</article>
 <footer class="company-signature"><img src="assets/organic-vietnam-symbol.svg" alt="" width="64" height="60"><div><strong>ORGANIC VIỆT NAM</strong><p>Kiến tạo hệ sinh thái giá trị.</p></div></footer></div>`;
 const hero=hostEl.querySelector('.company-hero');
 if(media.hero?.src){hero.insertAdjacentHTML('beforeend',figure(media.hero,'company-hero-media'));hero.classList.add('company-hero-with-image');}
 sections.forEach(s=>{const image=media.sections?.[s.id];if(image?.src){const section=hostEl.querySelector('#'+s.id);section.insertAdjacentHTML('beforeend',figure(image));section.classList.add('company-section-with-media');}});
 const values=hostEl.querySelector('#company-04');
 if(values){
   const paths=['M5 12l4 4L19 6','M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12','M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7Z','M12 3v4m0 10v4M3 12h4m10 0h4M6 6l3 3m6 6 3 3','M3 12l5-5 4 3 4-3 5 5-8 8Z','M20 4C9 3 3 9 7 17c8 4 14-2 13-13ZM7 17l9-9'];
   values.querySelectorAll('h3').forEach((h,i)=>h.insertAdjacentHTML('afterbegin',`<svg class="company-value-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[i]||paths[0]}"/></svg>`));
 }
 for(const id of ['company-03','company-04','company-11']){
  const section=hostEl.querySelector('#'+id);const groups=document.createElement('div');groups.className=id==='company-04'?'company-values':'company-dual';
  section.querySelectorAll(':scope > h3').forEach(heading=>{const group=document.createElement('div');group.append(heading.cloneNode(true));let next=heading.nextElementSibling;while(next&&next.tagName!=='H3'){const following=next.nextElementSibling;group.append(next);next=following;}heading.remove();groups.append(group);});section.append(groups);
 }
}
