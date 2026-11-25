import { departmentIcons } from './department-icons.js';
import { esc } from '../../shared/utils.js';
import { portal } from '../../shared/data-service.js';

export function renderHomeStrategyDirectory() {
  const departments = portal.departments || [];
  return `<section class="wp-home-section" aria-labelledby="home-depts-title"><div class="wp-home-head"><h2 id="home-depts-title">${esc('Chi\u1ebfn l\u01b0\u1ee3c c\u00e1c ph\u00f2ng ban')}</h2><a href="#strategies" class="wp-home-inline-link">${esc('Xem t\u1ea5t c\u1ea3')}</a></div><div class="wp-department-icon-grid">${departments.map(d=>`<a class="wp-department-icon-card" href="#departments/${esc(d.id)}${d.hasStrategyData ? '/strategy' : ''}" aria-label="${esc(d.name)}"><span class="wp-department-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${departmentIcons[d.id]}</svg></span><span class="wp-department-name">${esc(d.shortName || d.name)}</span></a>`).join('')}</div></section>`;
}
