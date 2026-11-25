import { esc } from '../../shared/utils.js';
import { portal } from '../../shared/data-service.js';

export function renderHomeStrategyDirectory() {
  const docs = portal.documents || [];
  const group = portal.strategyCatalog?.groupStrategy || {};
  const departments = [...(portal.departments || [])].sort((a,b)=>Number(b.hasStrategyData)-Number(a.hasStrategyData));
  const card = ({department,title,version,date,status,route}) => `<a class="wp-home-dept-card wp-strategy-directory-card" href="${esc(route)}"><h3>${esc(department)}</h3><div class="wp-strategy-document-title">${esc(title)}</div><dl><div><dt>Phiên bản</dt><dd>${esc(version || 'Chưa cập nhật')}</dd></div><div><dt>Cập nhật</dt><dd>${esc(date || 'Chưa cập nhật')}</dd></div><div><dt>Trạng thái</dt><dd>${esc(status || 'Chưa cập nhật')}</dd></div></dl><span class="wp-strategy-view">Xem chiến lược</span></a>`;
  return `<section class="wp-home-section" aria-labelledby="home-depts-title"><div class="wp-home-head"><h2 id="home-depts-title">Chiến lược các phòng ban</h2><a href="#strategies" class="wp-home-inline-link">Xem tất cả</a></div><div class="wp-home-dept-grid">${departments.map(d=>{
    const doc=docs.find(x=>x.departmentId===d.id && x.readerKind==='strategy-v21') || docs.find(x=>x.departmentId===d.id && x.categoryId==='chien-luoc-ke-hoach');
    return card({department:d.name,title:doc?.title || (d.hasStrategyData ? d.strategyVersion : 'Chưa cập nhật tài liệu chiến lược'),version:doc?.version,date:doc?.updatedAt,status:doc?.status || d.strategyStatus,route:`#departments/${d.id}${d.hasStrategyData ? '/strategy' : ''}`});
  }).join('')}${card({department:'Tập đoàn Organic Việt Nam',title:group.title,version:null,date:null,status:group.standaloneDocStatus,route:'#strategies/group'})}</div></section>`;
}
