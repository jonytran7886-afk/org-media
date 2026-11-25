import { renderFeaturedStrategy, renderFocusTimeline } from './featured-strategy.js';
'use strict';

import { esc } from '../../shared/utils.js';
import {
  portal,
  onboardingState,
  getDepartmentProjectCount,
} from '../../shared/data-service.js';
import { openAnnouncementModal, openCampaignModal } from '../../shared/modals.js';
import { collectUpcomingItems, openTrackerForProject } from '../communications/widgets.js';

const HOME_ICONS = {
  documents:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M8 7h8"/><path d="M8 11h6"/></svg>',
  rules:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/></svg>',
  onboarding:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
  strategies:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/></svg>',
  projects:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>',
  organization:
    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><path d="M6.5 10v7.5H14"/><path d="M10 6.5h4"/></svg>',
  bell:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
  book:
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  docSmall:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  arrowUpRight:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>',
  chevronRight:
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
};

const DEPT_ICONS = {
  'truyen-thong':
    '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>',
  marketing:
    '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>',
  'kinh-doanh':
    '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M2 12h20"/></svg>',
  'san-pham-cong-nghe':
    '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>',
  'san-xuat-van-hanh':
    '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></svg>',
  'chuoi-cung-ung':
    '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>',
  'hanh-chinh-nhan-su':
    '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  'tai-chinh-ke-toan':
    '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>',
};

let activeHorizon = 7;

export function renderHomePage(hostEl) {
  const sys = portal.system || {};
  const company = portal.company || {};
  const milestone = company.keyCommercialMilestone || {};
  const announcements = portal.announcements || [];
  const documents = portal.documents || [];
  const departments = portal.departments || [];
  const onboarding = portal.onboarding || [];

  const requiredPriorityOrder = [
    'DOC-CORP-PROFILE',
    'DOC-HR-RULES',
    'DOC-HR-WORK-REG',
    'DOC-HR-POLICY',
    'DOC-STR-COM-2027-V21',
    'DOC-TRN-CHICKEN-01',
  ];

  const requiredDocs = [...documents]
    .filter((d) => d.requiredReading || requiredPriorityOrder.includes(d.id))
    .sort((a, b) => {
      const ia = requiredPriorityOrder.indexOf(a.id);
      const ib = requiredPriorityOrder.indexOf(b.id);
      const ra = ia === -1 ? 99 : ia;
      const rb = ib === -1 ? 99 : ib;
      return ra - rb;
    })
    .slice(0, 5);

  const obDone = onboarding.filter((s) => Boolean(onboardingState.steps[s.id])).length;
  const obTotal = onboarding.length;
  const obPct = obTotal ? Math.round((obDone / obTotal) * 100) : 0;
  const obBtnLabel =
    obDone === 0 ? 'Bắt đầu hội nhập' : obDone < obTotal ? 'Tiếp tục hội nhập' : 'Xem lại lộ trình hội nhập';

  const quickCards = [
    {
      icon: HOME_ICONS.documents,
      title: 'Thư viện tài liệu',
      desc: 'Tra cứu tài liệu và biểu mẫu nội bộ.',
      route: '#documents',
    },
    {
      icon: HOME_ICONS.rules,
      title: 'Nội quy & Quy chế',
      desc: 'Quy định, chính sách và hướng dẫn làm việc.',
      route: '#documents/category/noi-quy-quy-che',
    },
    {
      icon: HOME_ICONS.onboarding,
      title: 'Hội nhập nhân viên',
      desc: 'Lộ trình tìm hiểu doanh nghiệp dành cho nhân viên mới.',
      route: '#onboarding',
    },
    {
      icon: HOME_ICONS.strategies,
      title: 'Chiến lược & Kế hoạch',
      desc: 'Định hướng phát triển và kế hoạch các phòng ban.',
      route: '#strategies',
    },
    {
      icon: HOME_ICONS.projects,
      title: 'Dự án & Công việc',
      desc: 'Theo dõi tiến độ, nhiệm vụ và thời hạn.',
      route: '#projects',
    },
    {
      icon: HOME_ICONS.organization,
      title: 'Thông tin tổ chức',
      desc: 'Cơ cấu tổ chức, chức năng và nhiệm vụ.',
      route: '#organization',
    },
  ];

  const horizon7 = collectUpcomingItems(7);
  const horizon15 = collectUpcomingItems(15);
  const horizon30 = collectUpcomingItems(30);
  const horizonMap = { 7: horizon7, 15: horizon15, 30: horizon30 };

  function renderHorizonListHtml(days) {
    const list = horizonMap[days] || [];
    if (!list.length) {
      return `
        <div class="wp-home-upcoming-empty">
          <span>Không có đầu việc hoặc mốc chiến dịch đến hạn trong ${days} ngày tới.</span>
          <a href="#projects" class="wp-home-inline-link">Mở Dự án &amp; Công việc →</a>
        </div>`;
    }
    return `
      <div class="wp-home-upcoming-list">
        ${list
          .slice(0, 4)
          .map(
            (item) => `
          <button type="button" class="wp-home-upcoming-row" data-up-kind="${esc(item.kind)}" data-up-id="${esc(item.id)}">
            <div class="wp-home-upcoming-main">
              <div class="wp-home-upcoming-title">
                <span class="wp-home-code">${esc(item.id)}</span>
                <span>${esc(item.title)}</span>
              </div>
              <div class="wp-home-upcoming-meta">
                <span>${esc(item.dateText)}</span>
                <span aria-hidden="true">·</span>
                <span>${esc(item.sub)}</span>
              </div>
            </div>
            <div class="wp-home-upcoming-side">
              <span class="wp-home-due">${item.diff === 0 ? 'Hôm nay' : `Còn ${item.diff} ngày`}</span>
              <span class="wp-home-status-text">${esc(item.status)}</span>
            </div>
          </button>`
          )
          .join('')}
      </div>
      ${
        list.length > 4
          ? `<div class="wp-home-upcoming-more"><a href="#projects" class="wp-home-inline-link">Xem tất cả ${list.length} đầu việc trong Dự án &amp; Công việc →</a></div>`
          : ''
      }`;
  }

  hostEl.innerHTML = `
    <div class="wp-home-page">
      <section class="wp-banner" aria-labelledby="wp-banner-title">
        <div class="wp-banner-content">
          <div class="wp-banner-eyebrow">${esc(sys.name || 'ORGANIC WORKPLACE')}</div>
          <h1 id="wp-banner-title">${esc(sys.vietnameseName || 'Cổng thông tin nội bộ Organic Việt Nam')}</h1>
          <p class="wp-banner-tagline">${esc(sys.tagline || 'Kết nối con người. Đồng hành phát triển.')}</p>
          <p class="wp-banner-pillars">${esc(sys.pillarsLine || 'Nông nghiệp · Thực phẩm · Công nghệ')}</p>
        </div>
        <div class="wp-banner-visual" aria-hidden="true">
          <img src="assets/organic-vietnam-symbol.svg" alt="" class="wp-banner-watermark">
        </div>
      </section>

      ${renderFeaturedStrategy({ department: departments.find(d => d.id === 'truyen-thong'), banner: 'assets/images/banners/organicvn-strategy-banner-2027.webp?v=2' })}

      <section class="wp-home-card-panel wp-home-focus-panel" aria-labelledby="home-plans-title">
        <div class="wp-home-panel-head">
          <h2 id="home-plans-title">Kế hoạch trọng tâm sắp tới</h2>
          <a href="#strategies/group" class="wp-home-inline-link">Xem kế hoạch →</a>
        </div>

        ${renderFocusTimeline()}

        <div class="wp-home-horizon-block">
          <div class="wp-home-horizon-grid" role="tablist" aria-label="Mốc kế hoạch sắp tới">
            ${[7, 15, 30]
              .map((days) => {
                const count = horizonMap[days].length;
                const isActive = activeHorizon === days;
                return `
                  <button type="button" role="tab" aria-selected="${isActive}" class="wp-home-horizon-card ${isActive ? 'active' : ''}" data-home-horizon="${days}">
                    <strong>${days} ngày tới</strong>
                    <span>${count > 0 ? `Xem ${count} công việc` : 'Chưa có mốc đến hạn'}</span>
                  </button>`;
              })
              .join('')}
          </div>
          <div id="home-upcoming-list" class="wp-home-upcoming-wrap">
            ${renderHorizonListHtml(activeHorizon)}
          </div>
        </div>
      </section>

      <section class="wp-home-section" aria-labelledby="home-quick-title">
        <div class="wp-home-head">
          <div class="wp-home-head-text">
            <h2 id="home-quick-title">Không gian làm việc</h2>
            <p class="wp-home-subtitle">Truy cập các tài liệu và công cụ làm việc nội bộ.</p>
          </div>
          <span class="wp-home-head-meta">${quickCards.length} phân hệ</span>
        </div>
        <div class="wp-home-quick-grid">
          ${quickCards
            .map(
              (c) => `
            <a class="wp-home-quick-card" href="${esc(c.route)}">
              <div class="wp-home-quick-top">
                <span class="wp-home-icon-box" aria-hidden="true">${c.icon}</span>
                <span class="wp-home-card-arrow" aria-hidden="true">${HOME_ICONS.arrowUpRight}</span>
              </div>
              <h3>${esc(c.title)}</h3>
              <p>${esc(c.desc)}</p>
            </a>`
            )
            .join('')}
        </div>
      </section>

      <section class="wp-home-split" aria-label="Thông báo và tài liệu cần đọc">
        <div class="wp-home-card-panel" aria-labelledby="home-ann-title">
          <div class="wp-home-panel-head">
            <h2 id="home-ann-title">Thông báo nội bộ</h2>
            <span class="wp-home-panel-icon" aria-hidden="true">${HOME_ICONS.bell}</span>
          </div>
          <div class="wp-home-panel-body">
            ${
              announcements.length
                ? `<div class="wp-home-item-list">
                    ${announcements
                      .slice(0, 4)
                      .map(
                        (a, i) => `
                      <article class="wp-home-ann-row">
                        <div class="wp-home-ann-content">
                          <div class="wp-home-row-meta">
                            <span>${esc(a.date)}</span>
                            <span aria-hidden="true">·</span>
                            <span>${esc(a.departmentName)}</span>
                          </div>
                          <h3><button type="button" class="wp-home-row-btn" data-open-ann="${i}">${esc(a.title)}</button></h3>
                          <p>${esc(a.summary)}</p>
                        </div>
                        <button type="button" class="wp-home-row-chevron" data-open-ann="${i}" aria-label="Xem chi tiết ${esc(a.title)}">${HOME_ICONS.chevronRight}</button>
                      </article>`
                      )
                      .join('')}
                  </div>`
                : `<div class="wp-home-empty-inline">
                    <span class="wp-home-panel-icon" aria-hidden="true">${HOME_ICONS.bell}</span>
                    <p>Chưa có thông báo mới</p>
                  </div>`
            }
          </div>
          <div class="wp-home-panel-foot">
            <a href="#announcements" class="wp-home-inline-link">Xem tất cả thông báo →</a>
          </div>
        </div>

        <div class="wp-home-card-panel" aria-labelledby="home-docs-title">
          <div class="wp-home-panel-head">
            <h2 id="home-docs-title">Tài liệu cần đọc</h2>
            <span class="wp-home-panel-icon" aria-hidden="true">${HOME_ICONS.book}</span>
          </div>
          <div class="wp-home-panel-body">
            ${
              requiredDocs.length
                ? `<div class="wp-home-doc-list">
                    ${requiredDocs
                      .map(
                        (d) => `
                      <a href="#documents/view/${esc(d.id)}" class="wp-home-doc-row">
                        <span class="wp-home-doc-icon" aria-hidden="true">${HOME_ICONS.docSmall}</span>
                        <span class="wp-home-doc-info">
                          <span class="wp-home-doc-title">${esc(d.title)}</span>
                          <span class="wp-home-doc-meta">${esc(d.documentCode)} · ${esc(d.status)}</span>
                        </span>
                        <span class="wp-home-doc-chevron" aria-hidden="true">${HOME_ICONS.chevronRight}</span>
                      </a>`
                      )
                      .join('')}
                  </div>`
                : `<div class="wp-home-empty-inline">
                    <p>Chưa cập nhật tài liệu cần đọc</p>
                  </div>`
            }
          </div>
          <div class="wp-home-panel-foot">
            <a href="#documents" class="wp-home-inline-link">Mở thư viện tài liệu →</a>
          </div>
        </div>
      </section>

      <section class="wp-home-section" aria-labelledby="home-depts-title">
        <div class="wp-home-head">
          <div class="wp-home-head-text">
            <h2 id="home-depts-title">Không gian các phòng ban</h2>
            <p class="wp-home-subtitle">Truy cập không gian làm việc, chiến lược và tài liệu theo từng đơn vị.</p>
          </div>
          <a href="#departments" class="wp-home-inline-link">Xem tất cả →</a>
        </div>
        <div class="wp-home-dept-grid">
          ${departments
            .map((d) => {
              const pCount = getDepartmentProjectCount(d);
              const iconSvg = DEPT_ICONS[d.id] || HOME_ICONS.organization;
              return `
                <a class="wp-home-dept-card" href="#departments/${esc(d.id)}">
                  <div class="wp-home-dept-top">
                    <span class="wp-home-dept-icon" aria-hidden="true">${iconSvg}</span>
                    <span class="wp-home-card-arrow" aria-hidden="true">${HOME_ICONS.arrowUpRight}</span>
                  </div>
                  <h3>${esc(d.name)}</h3>
                  <p>${esc(d.summary)}</p>
                  <div class="wp-home-dept-meta">
                    <span>${esc(d.hasStrategyData ? d.strategyStatus : 'Chưa cập nhật')}</span>
                    ${pCount !== null ? `<span>· ${pCount} dự án</span>` : ''}
                  </div>
                </a>`;
            })
            .join('')}
        </div>
      </section>


    </div>
  `;

  function bindUpcomingClicks() {
    hostEl.querySelectorAll('#home-upcoming-list [data-up-kind]').forEach((btn) => {
      btn.onclick = () => {
        if (btn.dataset.upKind === 'project') {
          openTrackerForProject(btn.dataset.upId);
        } else {
          const item = (horizonMap[activeHorizon] || []).find((x) => x.id === btn.dataset.upId && x.track);
          if (item && item.track) openCampaignModal(item.track);
        }
      };
    });
  }

  hostEl.querySelectorAll('[data-open-ann]').forEach((btn) => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.openAnn);
      if (announcements[idx]) openAnnouncementModal(announcements[idx]);
    };
  });

  hostEl.querySelectorAll('[data-home-horizon]').forEach((tab) => {
    tab.onclick = () => {
      activeHorizon = Number(tab.dataset.homeHorizon);
      hostEl.querySelectorAll('[data-home-horizon]').forEach((b) => {
        const active = Number(b.dataset.homeHorizon) === activeHorizon;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', String(active));
      });
      const listEl = hostEl.querySelector('#home-upcoming-list');
      if (listEl) {
        listEl.innerHTML = renderHorizonListHtml(activeHorizon);
        bindUpcomingClicks();
      }
    };
  });

  bindUpcomingClicks();
}
