'use strict';

import { $, $$, esc } from './utils.js';
import { data, portal, short, renderCloudBar, getDepartmentById } from './data-service.js';
import { closeSearch } from './search.js';
import { renderHomePage } from '../modules/home/index.js';
import { renderAnnouncementsPage } from '../modules/announcements/index.js';
import { renderDocumentsPage, renderDocumentDetailPage } from '../modules/documents/index.js';
import { renderOnboardingPage } from '../modules/onboarding/index.js';
import { renderStrategiesOverviewPage, renderGroupStrategyPage } from '../modules/strategies/index.js';
import { renderDepartmentsDirectoryPage, renderDepartmentWorkspace } from '../modules/departments/index.js';
import { renderProjectsEnterprisePage } from '../modules/projects/index.js';
import { renderOrganizationPage } from '../modules/organization/index.js';
import { renderTrackerPage, renderAllStrategyDoc, renderChapterView } from '../modules/communications/widgets.js';

const COLLAPSE_STORAGE_KEY = 'ovn-workplace-sidebar-collapsed';
const GROUPS_STORAGE_KEY = 'ovn-workplace-nav-groups';

let currentRouteKey = null;
let currentMenuMode = null;

const GLOBAL_NAV_GROUPS = [
  {
    id: 'overview',
    label: 'TỔNG QUAN',
    items: [
      { icon: '⌂', label: 'Trang chủ', href: '#home', match: ['#home'] },
      { icon: '◈', label: 'Thông báo nội bộ', href: '#announcements', match: ['#announcements'] },
    ],
  },
  {
    id: 'documents',
    label: 'TÀI LIỆU NỘI BỘ',
    items: [
      { icon: '▤', label: 'Thư viện tài liệu', href: '#documents', match: ['#documents'] },
      { icon: '§', label: 'Nội quy & Quy chế', href: '#documents/category/noi-quy-quy-che', match: ['#documents/category/noi-quy-quy-che'] },
      { icon: '⚑', label: 'Chính sách nhân sự', href: '#documents/category/chinh-sach-nhan-su', match: ['#documents/category/chinh-sach-nhan-su'] },
      { icon: '⇄', label: 'Quy trình & Hướng dẫn', href: '#documents/category/quy-trinh-huong-dan', match: ['#documents/category/quy-trinh-huong-dan'] },
      { icon: '❐', label: 'Biểu mẫu nội bộ', href: '#documents/category/bieu-mau-noi-bo', match: ['#documents/category/bieu-mau-noi-bo'] },
    ],
  },
  {
    id: 'onboarding',
    label: 'HỘI NHẬP NHÂN VIÊN',
    items: [
      { icon: '✦', label: 'Hướng dẫn hội nhập', href: '#onboarding', match: ['#onboarding'] },
      { icon: '⬡', label: 'Tìm hiểu Organic Việt Nam', href: '#organization', match: ['#organization'] },
      { icon: '✓', label: 'Tài liệu cần đọc', href: '#documents/required', match: ['#documents/required'] },
    ],
  },
  {
    id: 'strategies',
    label: 'CHIẾN LƯỢC & KẾ HOẠCH',
    items: [
      { icon: '◎', label: 'Chiến lược Tập đoàn', href: '#strategies/group', match: ['#strategies/group'] },
      { icon: '⊞', label: 'Kế hoạch các phòng ban', href: '#departments', match: ['#departments'] },
      { icon: '◷', label: 'Lộ trình trọng tâm', href: '#strategies', match: ['#strategies'] },
    ],
  },
  {
    id: 'projects',
    label: 'DỰ ÁN & CÔNG VIỆC',
    items: [
      { icon: '☷', label: 'Danh mục dự án', href: '#projects', match: ['#projects'] },
      { icon: '☑', label: 'Công việc & Deadline', href: '#projects/tasks', match: ['#projects/tasks'] },
    ],
  },
  {
    id: 'organization',
    label: 'THÔNG TIN TỔ CHỨC',
    items: [
      { icon: '❖', label: 'Cơ cấu tổ chức', href: '#organization', match: ['#organization'] },
      { icon: '◐', label: 'Thông tin phòng ban', href: '#organization/departments', match: ['#organization/departments'] },
    ],
  },
];

function getSavedGroupState() {
  try {
    return JSON.parse(localStorage.getItem(GROUPS_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveGroupState(map) {
  try {
    localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage limits
  }
}

export function closeNav() {
  $('.sidebar')?.classList.remove('open');
  $('.overlay')?.classList.remove('show');
  document.body.classList.remove('nav-open');
  $('#menubtn')?.setAttribute('aria-expanded', 'false');
}

function buildCommsSidebarHtml() {
  const verShort = data.versionMeta?.shortVersion || 'V2.1 · Chờ phê duyệt';
  const nav = $('#nav');
  const workspaceCard = $('#sidebar-workspace');
  const brandSub = $('#brand-sub');
  const sideFoot = $('#sidebar-foot');

  if (brandSub) brandSub.textContent = 'INTERNAL WORKPLACE';
  if (workspaceCard) {
    workspaceCard.innerHTML = `<strong>Phòng Truyền thông</strong><small>Chiến lược 2027 · ${esc(verShort)}</small>`;
  }
  if (sideFoot) {
    sideFoot.innerHTML = `Nông nghiệp · Thực phẩm · Công nghệ<br>Không gian Truyền thông · ${esc(verShort)} · <a href="toan-van.html" class="textlink">Bản gốc V2.0</a>`;
  }
  if (!nav) return;

  let html = `
    <div class="nav-back-wrap">
      <a class="nav-back-btn" href="#home">← Trang chủ Organic Workplace</a>
      <a class="nav-back-btn" href="#departments">← Danh mục phòng ban</a>
    </div>
    <div class="nav-label">TỔNG QUAN PHÒNG TRUYỀN THÔNG</div>
    <a href="#departments/truyen-thong" data-nav="#departments/truyen-thong"><span class="iconnav">⊞</span><span>Dashboard chiến lược</span></a>
    <a href="#tracker" data-nav="#tracker"><span class="iconnav">☷</span><span>Master Project Tracker</span></a>
    <a href="#all" data-nav="#all"><span class="iconnav">▤</span><span>Tài liệu chiến lược (V2.1)</span></a>
    <a href="#departments/truyen-thong/plans" data-nav="#departments/truyen-thong/plans"><span class="iconnav">◷</span><span>Không gian 6 Tab</span></a>
    <div class="nav-label">NỘI DUNG CHIẾN LƯỢC</div>
  `;

  for (let i = 1; i <= 13; i++) {
    html += `<a href="#p${i}" data-nav="#p${i}"><span class="num">${i === 13 ? 'PL' : String(i).padStart(2, '0')}</span><span>${esc(
      short[i - 1]
    )}</span></a>`;
  }

  html += `
    <div class="nav-label">TRUY CẬP NHANH</div>
    <a href="#p6/m28" data-nav="#p6/m28"><span class="iconnav">◷</span><span>Kế hoạch 90 ngày</span></a>
    <a href="#p10/m44" data-nav="#p10/m44"><span class="iconnav">☑</span><span>20 nhiệm vụ cấp thiết</span></a>
    <a href="#p8/m35" data-nav="#p8/m35"><span class="iconnav">◐</span><span>Mô phỏng ngân sách</span></a>
  `;

  nav.innerHTML = html;
}

function buildGlobalSidebarHtml(activeHref) {
  const sys = portal.system || {};
  const nav = $('#nav');
  const workspaceCard = $('#sidebar-workspace');
  const brandSub = $('#brand-sub');
  const sideFoot = $('#sidebar-foot');

  if (brandSub) brandSub.textContent = 'INTERNAL WORKPLACE';
  if (workspaceCard) {
    workspaceCard.innerHTML = `<strong>${esc(sys.name || 'ORGANIC WORKPLACE')}</strong><small>${esc(
      sys.version || 'V1.0'
    )} · ${esc(sys.vietnameseName || 'Cổng thông tin nội bộ')}</small>`;
  }
  if (sideFoot) {
    sideFoot.innerHTML = `ORGANIC WORKPLACE ${esc(sys.version || 'V1.0')}<br>Nông nghiệp · Thực phẩm · Công nghệ`;
  }
  if (!nav) return;

  const savedGroups = getSavedGroupState();
  nav.innerHTML = GLOBAL_NAV_GROUPS.map((g) => {
    const containsActive = g.items.some((it) => it.href === activeHref);
    const isCollapsed = savedGroups[g.id] === true && !containsActive;
    return `
      <div class="nav-group ${isCollapsed ? 'collapsed' : ''}" data-nav-group="${esc(g.id)}">
        <button type="button" class="nav-group-toggle" aria-expanded="${isCollapsed ? 'false' : 'true'}">
          <span>${esc(g.label)}</span>
          <span class="nav-chevron" aria-hidden="true">${isCollapsed ? '▸' : '▾'}</span>
        </button>
        <div class="nav-group-items">
          ${g.items
            .map(
              (it) =>
                `<a href="${esc(it.href)}" data-nav="${esc(it.href)}"><span class="iconnav" aria-hidden="true">${esc(
                  it.icon
                )}</span><span>${esc(it.label)}</span></a>`
            )
            .join('')}
        </div>
      </div>`;
  }).join('');

  $$('.nav-group-toggle', nav).forEach((btn) => {
    btn.onclick = () => {
      const grp = btn.closest('.nav-group');
      const id = grp.dataset.navGroup;
      const collapsed = grp.classList.toggle('collapsed');
      btn.setAttribute('aria-expanded', String(!collapsed));
      const chev = $('.nav-chevron', btn);
      if (chev) chev.textContent = collapsed ? '▸' : '▾';
      const next = getSavedGroupState();
      next[id] = collapsed;
      saveGroupState(next);
    };
  });
}

function resolveRoute(rawHash) {
  const raw = (rawHash || '').replace(/^#/, '').trim();
  const clean = raw || 'home';
  const segs = clean.split('/').filter(Boolean);
  const root = segs[0] || 'home';

  // Legacy Communications routes (100% compatible)
  if (root === 'dashboard') {
    return { mode: 'comms', handler: 'dept-workspace', deptId: 'truyen-thong', tab: 'overview', routeKey: 'dept:truyen-thong:overview', navHref: '#departments/truyen-thong', crumb: ['Chiến lược & Kế hoạch', 'Phòng Truyền thông', 'Dashboard chiến lược'], printable: false };
  }
  if (root === 'tracker') {
    return { mode: 'comms', handler: 'tracker', routeKey: 'comms:tracker', navHref: '#tracker', crumb: ['Chiến lược & Kế hoạch', 'Phòng Truyền thông', 'Master Project Tracker'], printable: false };
  }
  if (root === 'all') {
    return { mode: 'comms', handler: 'all', routeKey: 'comms:all', navHref: '#all', crumb: ['Chiến lược & Kế hoạch', 'Phòng Truyền thông', 'Tài liệu chiến lược V2.1'], printable: true };
  }
  if (/^p(?:[1-9]|1[0-3])$/.test(root)) {
    const n = Number(root.slice(1));
    const target = segs[1] || '';
    const navHref = target === 'm28' ? '#p6/m28' : target === 'm44' ? '#p10/m44' : target === 'm35' ? '#p8/m35' : `#p${n}`;
    return { mode: 'comms', handler: 'chapter', chapter: n, target, routeKey: `comms:p${n}`, navHref, crumb: ['Chiến lược & Kế hoạch', 'Phòng Truyền thông', short[n - 1]], printable: true };
  }

  // Enterprise routes
  if (root === 'home') {
    return { mode: 'global', handler: 'home', routeKey: 'home', navHref: '#home', crumb: ['Trang chủ'], printable: false };
  }
  if (root === 'announcements') {
    return { mode: 'global', handler: 'announcements', routeKey: 'announcements', navHref: '#announcements', crumb: ['Thông báo nội bộ'], printable: false };
  }
  if (root === 'documents') {
    if (segs[1] === 'category' && segs[2]) {
      const cat = (portal.documentCategories || []).find((c) => c.id === segs[2]);
      const navMatch = ['#documents/category/noi-quy-quy-che', '#documents/category/chinh-sach-nhan-su', '#documents/category/quy-trinh-huong-dan', '#documents/category/bieu-mau-noi-bo'].includes(`#documents/category/${segs[2]}`)
        ? `#documents/category/${segs[2]}`
        : '#documents';
      return { mode: 'global', handler: 'documents-cat', categoryId: segs[2], routeKey: `docs:cat:${segs[2]}`, navHref: navMatch, crumb: ['Tài liệu nội bộ', cat ? cat.name : segs[2]], printable: false };
    }
    if (segs[1] === 'required') {
      return { mode: 'global', handler: 'documents-req', routeKey: 'docs:req', navHref: '#documents/required', crumb: ['Tài liệu nội bộ', 'Tài liệu cần đọc'], printable: false };
    }
    if (segs[1] === 'view' && segs[2]) {
      const doc = (portal.documents || []).find((d) => d.id === segs[2]);
      return {
        mode: 'global',
        handler: 'document-view',
        docId: segs[2],
        routeKey: `docs:view:${segs[2]}`,
        navHref: '#documents',
        crumb: ['Tài liệu nội bộ', doc ? doc.title : segs[2]],
        printable: doc?.readerKind === 'strategy-v21',
      };
    }
    return { mode: 'global', handler: 'documents', routeKey: 'docs:all', navHref: '#documents', crumb: ['Tài liệu nội bộ', 'Thư viện tài liệu'], printable: false };
  }
  if (root === 'onboarding') {
    return { mode: 'global', handler: 'onboarding', routeKey: 'onboarding', navHref: '#onboarding', crumb: ['Hội nhập nhân viên'], printable: false };
  }
  if (root === 'strategies') {
    if (segs[1] === 'group') {
      return { mode: 'global', handler: 'strategies-group', routeKey: 'strategies:group', navHref: '#strategies/group', crumb: ['Chiến lược & Kế hoạch', 'Chiến lược Tập đoàn'], printable: false };
    }
    return { mode: 'global', handler: 'strategies', routeKey: 'strategies:overview', navHref: '#strategies', crumb: ['Chiến lược & Kế hoạch'], printable: false };
  }
  if (root === 'departments') {
    if (!segs[1]) {
      return { mode: 'global', handler: 'departments-dir', routeKey: 'departments:dir', navHref: '#departments', crumb: ['Chiến lược & Kế hoạch', 'Kế hoạch các phòng ban'], printable: false };
    }
    const deptId = segs[1];
    const tab = segs[2] || 'overview';
    const dept = getDepartmentById(deptId);
    const isComms = deptId === 'truyen-thong';
    const tabLabels = {
      overview: 'Tổng quan',
      strategy: 'Chiến lược',
      plans: 'Kế hoạch',
      projects: 'Dự án & Công việc',
      documents: 'Tài liệu',
      'budget-kpi': 'Ngân sách & KPI',
    };
    const tabLabel = tabLabels[tab] || 'Tổng quan';
    return {
      mode: isComms ? 'comms' : 'global',
      handler: 'dept-workspace',
      deptId,
      tab,
      routeKey: `dept:${deptId}:${tab}`,
      navHref: isComms ? (tab === 'plans' ? '#departments/truyen-thong/plans' : '#departments/truyen-thong') : '#departments',
      crumb: ['Chiến lược & Kế hoạch', dept ? dept.name : deptId, ...(tab !== 'overview' ? [tabLabel] : [])],
      printable: false,
    };
  }
  if (root === 'projects') {
    if (segs[1] === 'tasks') {
      return { mode: 'global', handler: 'projects-tasks', routeKey: 'projects:tasks', navHref: '#projects/tasks', crumb: ['Dự án & Công việc', 'Công việc & Deadline'], printable: false };
    }
    return { mode: 'global', handler: 'projects', routeKey: 'projects:portfolio', navHref: '#projects', crumb: ['Dự án & Công việc', 'Danh mục dự án'], printable: false };
  }
  if (root === 'organization') {
    if (segs[1] === 'departments') {
      return { mode: 'global', handler: 'org-depts', routeKey: 'org:depts', navHref: '#organization/departments', crumb: ['Thông tin tổ chức', 'Thông tin phòng ban'], printable: false };
    }
    return { mode: 'global', handler: 'org', routeKey: 'org:overview', navHref: '#organization', crumb: ['Thông tin tổ chức'], printable: false };
  }

  return { mode: 'global', handler: 'home', routeKey: 'home', navHref: '#home', crumb: ['Trang chủ'], printable: false };
}

export function render() {
  const r = resolveRoute(location.hash);
  const m = $('#main');
  if (!m) return;

  if (currentMenuMode !== r.mode) {
    currentMenuMode = r.mode;
    if (r.mode === 'comms') buildCommsSidebarHtml();
    else buildGlobalSidebarHtml(r.navHref);
  } else if (r.mode === 'global') {
    // Auto-expand nav group matching active route if it was collapsed
    const activeLink = $(`#nav a[data-nav="${r.navHref}"]`);
    const grp = activeLink?.closest('.nav-group');
    if (grp && grp.classList.contains('collapsed')) {
      grp.classList.remove('collapsed');
      const btn = $('.nav-group-toggle', grp);
      if (btn) {
        btn.setAttribute('aria-expanded', 'true');
        const chev = $('.nav-chevron', btn);
        if (chev) chev.textContent = '▾';
      }
    }
  }

  const same = currentRouteKey === r.routeKey;
  currentRouteKey = r.routeKey;

  document.body.classList.toggle('allmode', r.handler === 'all' || (r.handler === 'document-view' && r.printable));

  if (!same) {
    if (r.handler === 'home') renderHomePage(m);
    else if (r.handler === 'announcements') renderAnnouncementsPage(m);
    else if (r.handler === 'documents') renderDocumentsPage(m);
    else if (r.handler === 'documents-cat') renderDocumentsPage(m, { categoryId: r.categoryId });
    else if (r.handler === 'documents-req') renderDocumentsPage(m, { requiredOnly: true });
    else if (r.handler === 'document-view') renderDocumentDetailPage(m, r.docId);
    else if (r.handler === 'onboarding') renderOnboardingPage(m);
    else if (r.handler === 'strategies') renderStrategiesOverviewPage(m);
    else if (r.handler === 'strategies-group') renderGroupStrategyPage(m);
    else if (r.handler === 'departments-dir') renderDepartmentsDirectoryPage(m);
    else if (r.handler === 'dept-workspace') renderDepartmentWorkspace(m, r.deptId, r.tab);
    else if (r.handler === 'projects') renderProjectsEnterprisePage(m, 'portfolio');
    else if (r.handler === 'projects-tasks') renderProjectsEnterprisePage(m, 'tasks');
    else if (r.handler === 'org') renderOrganizationPage(m, 'overview');
    else if (r.handler === 'org-depts') renderOrganizationPage(m, 'departments');
    else if (r.handler === 'tracker') renderTrackerPage(m);
    else if (r.handler === 'all') renderAllStrategyDoc(m);
    else if (r.handler === 'chapter') renderChapterView(m, r.chapter);
  }

  const crumbEl = $('#crumb');
  if (crumbEl) {
    crumbEl.textContent = ['Organic Việt Nam', ...(r.crumb || [])].join(' / ');
  }

  // Contextual header buttons
  const printBtn = $('#printbtn');
  if (printBtn) printBtn.style.display = r.printable ? '' : 'none';

  const contextLink = $('#topbar-context-link');
  if (contextLink) {
    if (r.mode === 'comms' && r.handler !== 'dept-workspace') {
      contextLink.href = '#departments/truyen-thong';
      contextLink.textContent = 'Không gian Truyền thông';
      contextLink.style.display = '';
    } else if (r.mode === 'comms') {
      contextLink.href = '#home';
      contextLink.textContent = 'Trang chủ Workplace';
      contextLink.style.display = '';
    } else if (r.handler !== 'home') {
      contextLink.href = '#home';
      contextLink.textContent = 'Trang chủ';
      contextLink.style.display = '';
    } else {
      contextLink.style.display = 'none';
    }
  }

  $$('[data-nav]').forEach((a) => {
    a.classList.toggle('active', a.dataset.nav === r.navHref || a.dataset.nav === location.hash);
  });
  $$('[data-toc]').forEach((a) => {
    a.classList.toggle('active', a.dataset.toc === r.target);
  });

  renderCloudBar();
  closeNav();
  closeSearch();

  if (r.target) {
    requestAnimationFrame(() => {
      const el = document.getElementById(r.target);
      if (el) {
        el.scrollIntoView({ block: 'start', behavior: 'auto' });
        if (r.target.startsWith('project-')) {
          el.style.background = '#dfefdc';
          setTimeout(() => {
            el.style.background = '';
          }, 2200);
        }
      } else {
        window.scrollTo(0, 0);
      }
    });
  } else if (!same) {
    window.scrollTo(0, 0);
  }
}

export function initNavigation() {
  window.addEventListener('hashchange', render);

  // Desktop sidebar collapse toggle
  try {
    if (localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1') {
      document.body.classList.add('sidebar-collapsed');
    }
  } catch {
    // ignore
  }

  const collapseBtn = $('#sidebar-collapse-btn');
  if (collapseBtn) {
    const syncCollapseBtn = () => {
      const collapsed = document.body.classList.contains('sidebar-collapsed');
      collapseBtn.setAttribute('aria-pressed', String(collapsed));
      collapseBtn.title = collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên';
      collapseBtn.textContent = collapsed ? '»' : '«';
    };
    syncCollapseBtn();
    collapseBtn.onclick = () => {
      const collapsed = document.body.classList.toggle('sidebar-collapsed');
      try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, collapsed ? '1' : '0');
      } catch {
        // ignore
      }
      syncCollapseBtn();
    };
  }

  const menuBtn = $('#menubtn');
  if (menuBtn) {
    menuBtn.onclick = () => {
      const side = $('.sidebar');
      const ov = $('.overlay');
      if (!side || !ov) return;
      side.classList.toggle('open');
      ov.classList.toggle('show');
      const open = side.classList.contains('open');
      document.body.classList.toggle('nav-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      if (open) $('.sidebar a')?.focus();
    };
  }

  const overlay = $('.overlay');
  if (overlay) overlay.onclick = closeNav;

  const printBtn = $('#printbtn');
  if (printBtn) printBtn.onclick = () => window.print();

  window.matchMedia('(max-width: 900px)').addEventListener('change', closeNav);
}
