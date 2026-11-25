import { $, $$, esc, norm } from '../../shared/utils.js';
import { portal } from '../../shared/data-service.js';

const shortNames = {'tai-lieu-doanh-nghiep':'Doanh nghiệp','noi-quy-quy-che':'Nội quy & Quy chế','chinh-sach-nhan-su':'Chính sách nhân sự','quy-trinh-huong-dan':'Quy trình & Hướng dẫn','quy-chuan-thuong-hieu':'Thương hiệu','bieu-mau-noi-bo':'Biểu mẫu','tai-lieu-dao-tao':'Đào tạo','van-ban-noi-bo':'Văn bản nội bộ'};
const archive = d => ['Đã thay thế','Hết hiệu lực'].includes(d.status);
const dateValue = d => { const [day,month,year]=(d.updatedAt || '').split('/');return Number(`${year||'0000'}${month||'00'}${day||'00'}`); };
const fileLabel = d => archive(d) ? 'Xem bản lưu trữ' : d.status==='Chưa cập nhật' ? 'Xem chi tiết' : d.readerKind==='image' ? 'Xem hình ảnh' : /docx?|xlsx?/i.test(d.fileType) ? 'Xem tài liệu' : /thiết kế/i.test(d.fileType) ? 'Xem tài nguyên' : 'Đọc tài liệu';
const fileIcon = d => {
 const type=d.readerKind==='image'?'IMG':/docx?/i.test(d.fileType)?'DOC':/xlsx?/i.test(d.fileType)?'XLS':d.fileType==='Markdown'?'MD':d.fileType==='HTML'?'HTML':d.fileType||'FILE';
 return `<span class="dl-file-icon" aria-label="${esc(d.fileType)}"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg><small>${esc(type)}</small></span>`;
};

export function renderDocumentLibrary(hostEl, options={}) {
 const docs=portal.documents||[],categories=[...(portal.documentCategories||[])].sort((a,b)=>a.order-b.order),departments=portal.departments||[];
 const catMap=Object.fromEntries(categories.map(c=>[c.id,c.name])),deptMap=Object.fromEntries(departments.map(d=>[d.id,d.name]));
 let view='list',page=1;const pageSize=20;
 hostEl.innerHTML=`<div class="document-library">
 <div class="pageheader"><div><h1>Thư viện tài liệu</h1><p>Tra cứu tài liệu, quy định và hướng dẫn nội bộ Organic Việt Nam.</p></div><div class="dl-view-switch" role="group" aria-label="Chế độ hiển thị"><button type="button" class="btn small" data-doc-view="list" aria-pressed="true">☰ Danh sách</button><button type="button" class="btn small" data-doc-view="grid" aria-pressed="false">▦ Lưới</button></div></div>
 <div class="dl-search"><label class="field"><span class="banner-sr-only">Tìm kiếm tài liệu</span><input type="search" id="doc-q" placeholder="Tìm kiếm tên hoặc mã tài liệu..."></label><button type="button" class="btn" id="doc-filter-toggle" aria-expanded="false" aria-controls="doc-filters">Bộ lọc</button></div>
 <nav class="dl-categories" aria-label="Danh mục tài liệu"><a class="wp-cat-pill ${!options.categoryId&&!options.requiredOnly?'active':''}" href="#documents">Tất cả</a>${categories.map(c=>`<a class="wp-cat-pill ${options.categoryId===c.id?'active':''}" href="#documents/category/${esc(c.id)}" title="${esc(c.name)}">${esc(shortNames[c.id]||c.name)}</a>`).join('')}</nav>
 <div class="dl-filters" id="doc-filters" hidden>
 <label class="field">Danh mục<select id="doc-cat"><option value="">Tất cả danh mục</option>${categories.map(c=>`<option value="${esc(c.id)}" ${options.categoryId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label>
 <label class="field">Phòng ban phụ trách<select id="doc-dept"><option value="">Tất cả phòng ban</option>${departments.map(d=>`<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('')}</select></label>
 <label class="field">Trạng thái<select id="doc-status"><option value="">Tất cả trạng thái</option>${[...new Set(docs.map(d=>d.status))].map(s=>`<option>${esc(s)}</option>`).join('')}</select></label>
 <label class="field">Loại tài liệu<select id="doc-type"><option value="">Tất cả loại</option>${[...new Set(docs.map(d=>d.fileType))].map(t=>`<option>${esc(t)}</option>`).join('')}</select></label>
 <label class="wp-inline-check"><input type="checkbox" id="doc-req-only" ${options.requiredOnly?'checked':''}>Chỉ hiện tài liệu cần đọc</label>
 <label class="wp-inline-check"><input type="checkbox" id="doc-archive">Bao gồm tài liệu lưu trữ</label></div>
 <div class="dl-results-bar"><span id="doc-count" role="status" aria-live="polite"></span><button type="button" class="dl-reset" id="doc-reset" hidden>Xóa bộ lọc</button><label class="field dl-sort">Sắp xếp<select id="doc-sort"><option value="priority">Ưu tiên tài liệu hiện tại</option><option value="updated">Cập nhật mới nhất</option><option value="title">Tên A–Z</option></select></label></div>
 <div id="doc-rows" class="dl-collection" aria-label="Danh sách tài liệu"></div><nav id="doc-pagination" class="dl-pagination" aria-label="Phân trang tài liệu"></nav></div>`;
 const draw=()=>{
 const q=norm($('#doc-q',hostEl).value),cat=$('#doc-cat',hostEl).value,dept=$('#doc-dept',hostEl).value,st=$('#doc-status',hostEl).value,type=$('#doc-type',hostEl).value,required=$('#doc-req-only',hostEl).checked,includeArchive=$('#doc-archive',hostEl).checked,sort=$('#doc-sort',hostEl).value;
 const filtered=docs.filter(d=>{const hay=norm([d.id,d.title,d.documentCode,d.description,d.version,d.fileType,catMap[d.categoryId],deptMap[d.departmentId]].join(' '));return (!q||hay.includes(q))&&(!cat||d.categoryId===cat)&&(!dept||d.departmentId===dept)&&(!st||d.status===st)&&(!type||d.fileType===type)&&(!required||d.requiredReading)&&(includeArchive||archive({status:st})||!archive(d));});
 filtered.sort((a,b)=>sort==='title'?a.title.localeCompare(b.title,'vi'):sort==='updated'?dateValue(b)-dateValue(a):Number(archive(a))-Number(archive(b))||Number(b.readerKind==='strategy-v21')-Number(a.readerKind==='strategy-v21')||Number(a.status==='Chưa cập nhật')-Number(b.status==='Chưa cập nhật')||dateValue(b)-dateValue(a));
 const pages=Math.max(1,Math.ceil(filtered.length/pageSize));page=Math.min(page,pages);
 $$('.dl-categories a',hostEl).forEach(a=>a.classList.toggle('active',a.getAttribute('href')===(cat?`#documents/category/${cat}`:'#documents')));
 $('#doc-count',hostEl).textContent=`${filtered.length} / ${docs.length} tài liệu${!includeArchive&&!archive({status:st})?' · Đang ẩn bản lưu trữ':''}`;
 $('#doc-reset',hostEl).hidden=!(q||cat||dept||st||type||required||includeArchive);
 const rows=$('#doc-rows',hostEl);rows.className=`dl-collection ${view==='grid'?'dl-grid':'dl-list'}`;
 rows.innerHTML=filtered.slice((page-1)*pageSize,page*pageSize).map(d=>{
 const route=d.readerKind==='company-profile'?'#about-company':`#documents/view/${esc(d.id)}`,tone=d.status==='Chờ phê duyệt'?'pending':['Đang có hiệu lực','Đã ban hành'].includes(d.status)?'effective':'neutral';
 return `<article class="dl-document ${archive(d)?'dl-archived':''}" data-doc-id="${esc(d.id)}"><div class="dl-icon-area">${view==='grid'&&d.readerKind==='image'&&d.filePath?`<img class="dl-thumbnail" src="${esc(d.filePath)}" alt="" loading="lazy">`:fileIcon(d)}</div><div class="dl-document-content"><h2><a href="${route}">${esc(d.title)}</a></h2><p class="dl-description">${esc(d.description)}</p><div class="dl-metadata"><code>${esc(d.documentCode)}</code>${d.version?`<span>${esc(d.version)}</span>`:''}<span>Cập nhật: ${esc(d.updatedAt||'Chưa cập nhật')}</span></div></div><div class="dl-document-actions"><span class="dl-status dl-status-${tone}">${esc(d.status)}</span><div class="dl-action-links"><a class="btn small" href="${route}">${fileLabel(d)}</a>${d.filePath&&d.readerKind!=='strategy-v21'?`<a class="dl-download" href="${esc(d.filePath)}" download aria-label="Tải xuống ${esc(d.title)}" title="Tải xuống">↓</a>`:''}</div></div></article>`;
 }).join('')||'<div class="wp-empty-state"><h2>Không tìm thấy tài liệu</h2><p>Thử thay đổi từ khóa hoặc xóa bộ lọc.</p></div>';
 $('#doc-pagination',hostEl).innerHTML=pages>1?`<button class="btn small" data-page="${page-1}" ${page===1?'disabled':''}>Trang trước</button><span>${page} / ${pages}</span><button class="btn small" data-page="${page+1}" ${page===pages?'disabled':''}>Trang sau</button>`:'';
 $$('[data-page]',hostEl).forEach(b=>b.onclick=()=>{page=Number(b.dataset.page);draw();rows.scrollIntoView({block:'start'});});
 };
 ['doc-q','doc-cat','doc-dept','doc-status','doc-type','doc-req-only','doc-archive','doc-sort'].forEach(id=>$('#'+id,hostEl).addEventListener(id==='doc-q'?'input':'change',()=>{page=1;draw();}));
 $('#doc-filter-toggle',hostEl).onclick=()=>{const filters=$('#doc-filters',hostEl);filters.hidden=!filters.hidden;$('#doc-filter-toggle',hostEl).setAttribute('aria-expanded',String(!filters.hidden));};
 $$('[data-doc-view]',hostEl).forEach(b=>b.onclick=()=>{view=b.dataset.docView;$$('[data-doc-view]',hostEl).forEach(x=>x.setAttribute('aria-pressed',String(x===b)));draw();});
 $('#doc-reset',hostEl).onclick=()=>{$$('#doc-filters select',hostEl).forEach(e=>e.value='');$$('#doc-filters input',hostEl).forEach(e=>e.checked=false);$('#doc-q',hostEl).value='';page=1;draw();};
 draw();
}
