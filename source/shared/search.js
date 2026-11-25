'use strict';

import { $, $$, esc, norm } from './utils.js';
import { data, portal } from './data-service.js';

export function openSearch() {
  const overlay = $('#searchoverlay');
  const input = $('#searchinput');
  if (!overlay || !input) return;
  overlay.classList.add('open');
  input.focus();
  searchNow();
}

export function closeSearch() {
  $('#searchoverlay')?.classList.remove('open');
}

function buildSearchCorpus() {
  const docs = portal.documents || [];
  const categories = Object.fromEntries((portal.documentCategories || []).map((c) => [c.id, c.name]));
  const departments = portal.departments || [];
  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]));
  const announcements = portal.announcements || [];
  const onboarding = portal.onboarding || [];
  const milestones = portal.strategyCatalog?.groupStrategy?.corporateMilestones || [];

  const items = [];

  docs.forEach((d) => {
    items.push({
      kind: 'Tài liệu',
      title: `${d.documentCode} · ${d.title}`,
      meta: `${categories[d.categoryId] || ''} · ${deptMap[d.departmentId] || ''} · ${d.status}`,
      body: `${d.description} ${d.fileType} ${d.version} ${d.status}`,
      route: `#documents/view/${d.id}`,
    });
  });

  announcements.forEach((a) => {
    items.push({
      kind: 'Thông báo',
      title: a.title,
      meta: `${a.date} · ${a.type} · ${a.departmentName}`,
      body: `${a.summary} ${a.status}`,
      route: a.route || '#announcements',
    });
  });

  departments.forEach((d) => {
    items.push({
      kind: 'Phòng ban',
      title: d.name,
      meta: `${d.code} · ${d.strategyStatus}`,
      body: `${d.summary} ${(d.functions || []).join(' ')} ${(d.coordination || []).join(' ')}`,
      route: `#departments/${d.id}`,
    });
  });

  onboarding.forEach((o) => {
    items.push({
      kind: 'Hội nhập nhân viên',
      title: `Bước ${o.stepNumber} · ${o.title}`,
      meta: 'Lộ trình hội nhập nhân viên mới',
      body: `${o.objective} ${o.description} ${(o.topics || []).join(' ')}`,
      route: '#onboarding',
    });
  });

  milestones.forEach((m) => {
    items.push({
      kind: 'Chiến lược Tập đoàn',
      title: `${m.period} · ${m.title}`,
      meta: m.status,
      body: m.detail,
      route: '#strategies/group',
    });
  });

  (data.search || []).forEach((s) => {
    items.push({
      kind: 'Chiến lược Truyền thông V2.1',
      title: s.title,
      meta: `Phần ${s.p}`,
      body: s.body,
      route: `#p${s.p}${s.id ? '/' + s.id : ''}`,
    });
  });

  [...(data.campaigns || []), ...(data.ongoingTrack ? [data.ongoingTrack] : [])].forEach((c) => {
    items.push({
      kind: 'Chiến dịch',
      title: `${c.code || c.id} · ${c.name}`,
      meta: c.timing,
      body: `${c.focus} · ${c.goal}`,
      route: '#p6/m27',
    });
  });

  (data.projects || []).forEach((p) => {
    items.push({
      kind: 'Dự án',
      title: `${p.id} · ${p.name}`,
      meta: `${p.priority} · ${p.startDate} → ${p.deadline} · Phòng Truyền thông`,
      body: `${p.deliverable} · ${p.relatedCampaign} · ${p.launchReadiness} · ${p.defaultOwner}`,
      route: `#p10/project-${p.id}`,
    });
  });

  (data.priorities || []).forEach((t, idx) => {
    items.push({
      kind: 'Công việc ưu tiên',
      title: `${idx + 1}. ${t.title}`,
      meta: `${t.group} · Dự án ${t.projectId}`,
      body: t.preLaunchRequired ? 'Bắt buộc trước mở bán 01/2027' : 'Nền tảng & vận hành',
      route: '#projects/tasks',
    });
  });

  return items;
}

let cachedCorpus = null;
function getCorpus() {
  if (!cachedCorpus) cachedCorpus = buildSearchCorpus();
  return cachedCorpus;
}

export function searchNow() {
  const input = $('#searchinput');
  const r = $('#results');
  if (!input || !r) return;
  const q = input.value.trim();
  const n = norm(q);
  const terms = n.split(/\s+/).filter(Boolean);

  if (!n) {
    const suggestions = ['01/2027', 'Nội quy', 'Hội nhập', 'Phòng Truyền thông', 'C08', 'ADIGO', 'Biểu mẫu', 'KPI'];
    r.innerHTML =
      '<p class="muted" style="padding:12px 6px">Tìm kiếm toàn hệ thống: tài liệu nội bộ, nội quy, quy chế, phòng ban, lộ trình hội nhập, chiến lược 50 mục, 11 chiến dịch và 57 dự án (hỗ trợ tiếng Việt không dấu).</p>' +
      suggestions.map((s) => `<button type="button" class="btn small" style="margin:4px" data-suggestion="${esc(s)}">${esc(s)}</button>`).join('');
    $$('[data-suggestion]', r).forEach((b) => {
      b.onclick = () => {
        input.value = b.dataset.suggestion;
        searchNow();
      };
    });
    return;
  }

  const all = getCorpus();
  const found = all
    .filter((x) => terms.every((t) => norm(`${x.kind} ${x.title} ${x.meta} ${x.body}`).includes(t)))
    .sort((a, b) => Number(terms.every((t) => norm(b.title).includes(t))) - Number(terms.every((t) => norm(a.title).includes(t))));

  if (!found.length) {
    r.innerHTML = `<div class="notice" style="margin:12px 6px">Không tìm thấy kết quả phù hợp cho "${esc(q)}".</div>`;
    return;
  }

  // Group results by content type while keeping clear order
  const groupOrder = [
    'Tài liệu',
    'Phòng ban',
    'Thông báo',
    'Hội nhập nhân viên',
    'Chiến lược Tập đoàn',
    'Chiến lược Truyền thông V2.1',
    'Chiến dịch',
    'Dự án',
    'Công việc ưu tiên',
  ];
  const grouped = new Map();
  found.slice(0, 80).forEach((item) => {
    if (!grouped.has(item.kind)) grouped.set(item.kind, []);
    grouped.get(item.kind).push(item);
  });

  const orderedKinds = [...groupOrder.filter((k) => grouped.has(k)), ...[...grouped.keys()].filter((k) => !groupOrder.includes(k))];

  const html = orderedKinds
    .map((kind) => {
      const list = grouped.get(kind);
      return `
        <div class="search-group">
          <div class="search-group-head">${esc(kind)} (${list.length})</div>
          ${list
            .slice(0, 12)
            .map((x) => {
              const txt = String(x.body || '').replace(/\s+/g, ' ');
              const ix = norm(txt).indexOf(terms[0]);
              const start = Math.max(0, ix - 40);
              const excerpt = txt ? (start ? '…' : '') + txt.slice(start, start + 150) + (txt.length > start + 150 ? '…' : '') : '';
              return `
                <a class="result" href="${esc(x.route)}">
                  <strong>${esc(x.title)}</strong>
                  ${x.meta ? `<div class="result-meta">${esc(x.meta)}</div>` : ''}
                  ${excerpt ? `<small>${esc(excerpt)}</small>` : ''}
                </a>`;
            })
            .join('')}
        </div>`;
    })
    .join('');

  r.innerHTML = `<p class="muted" style="padding:8px 6px">${found.length} kết quả trên toàn hệ thống</p>${html}`;

  $$('.result', r).forEach((a) => {
    a.onclick = () => {
      closeSearch();
      if (a.getAttribute('href') === location.hash) {
        const id = location.hash.split('/')[1];
        if (id) document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    };
  });
}

export function initSearch() {
  const searchBtn = $('#searchbtn');
  const searchClose = $('#searchclose');
  const searchInput = $('#searchinput');
  const searchOverlay = $('#searchoverlay');
  if (searchBtn) searchBtn.onclick = openSearch;
  if (searchClose) searchClose.onclick = closeSearch;
  if (searchInput) searchInput.oninput = searchNow;
  if (searchOverlay) {
    searchOverlay.onclick = (e) => {
      if (e.target.id === 'searchoverlay') closeSearch();
    };
  }
}
