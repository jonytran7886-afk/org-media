import { esc } from '../../shared/utils.js';
import { data } from '../../shared/data-service.js';

// Presentation configuration only; strategy content stays in the shared data service.
export function renderFeaturedStrategy({ strategy = data, department, banner } = {}) {
  if (!strategy || !department?.hasStrategyData) return '';
  const meta = strategy.versionMeta || {};
  const project = strategy.projects.find((p) => p.id === 'A01');
  const metrics = [
    [strategy.sections.filter((s) => s.p <= 12).length, 'phần chiến lược'],
    [strategy.sections.find((s) => s.p === 4)?.headings.filter((h) => h.level === 2).length ?? 0, 'trụ cột truyền thông'],
    [strategy.campaigns.length, 'chiến dịch'],
    [strategy.projects.length, 'dự án'],
  ];
  return `<section class="wp-home-section" aria-labelledby="home-featured-title">
    <div class="wp-home-head"><h2 id="home-featured-title">Chiến lược nổi bật</h2></div>
    <div class="wp-featured-strategy">
      <a class="wp-featured-art" href="#dashboard" aria-label="Xem chiến lược truyền thông"><img src="${esc(banner)}" width="2172" height="724" fetchpriority="high" alt="Chiến lược truyền thông tổng thể Organic Việt Nam 2027"></a>
      <div class="wp-featured-info"><div class="wp-featured-meta"><span>${esc(meta.version?.split(' – ')[0])}</span><span>${esc(meta.status)}</span></div>
      <h3>${esc(project?.name)}</h3><p>${esc(meta.version?.split(' – ').slice(1).join(' – '))}</p>
      <a class="btn primary wp-featured-primary" href="#dashboard">Xem chiến lược</a>
      <div class="wp-featured-links"><a class="btn" href="#all">Đọc tài liệu</a></div></div>
    </div></section>`;
}

export function renderFocusTimeline() {
  const project = data.projects.find((p) => p.id === 'A01');
  const milestones = data.portal?.strategyCatalog?.groupStrategy?.corporateMilestones || [];
  const items = [
    project && { period: project.schedule, title: project.name, status: data.versionMeta.status, href: '#p6/m28' },
    ...milestones.slice(0, 3).map((m, i) => ({...m, period: i === 0 ? data.roadmapMonths[0].label : m.period, href: '#p6'})),
  ].filter(Boolean);
  return `<ol class="wp-focus-timeline">${items.map(m=>`<li><a href="${m.href}"><span>${esc(m.period)}</span><h3>${esc(m.title)}</h3><small>${esc(m.status)}</small></a></li>`).join('')}</ol><div class="wp-featured-links wp-focus-links"><a href="#p6/m28">Kế hoạch 90 ngày</a><a href="#p10/m44">20 nhiệm vụ cấp thiết</a></div>`;
}
