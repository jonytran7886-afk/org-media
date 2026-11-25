'use strict';

import { esc } from '../../shared/utils.js';
import { data, portal, getDepartmentProjectCount } from '../../shared/data-service.js';
import { renderRoadmaps } from '../communications/widgets.js';

export function renderStrategiesOverviewPage(hostEl) {
  const catalog = portal.strategyCatalog?.groupStrategy || {};
  const company = portal.company || {};
  const departments = portal.departments || [];
  const milestones = catalog.corporateMilestones || [];
  const coord = catalog.crossDepartmentCoordination || [];

  hostEl.innerHTML = `
    <div class="pageheader">
      <div>
        <div class="eyebrow">MODULE 04 · STRATEGY &amp; PLANS</div>
        <h1>Chiến lược &amp; Kế hoạch phát triển</h1>
        <p>Phân tách rõ giữa Chiến lược cấp Tập đoàn, Chiến lược từng phòng ban, Lộ trình triển khai trọng tâm và Danh mục dự án.</p>
      </div>
      <div class="pageheader-actions">
        <a class="btn primary" href="#departments/truyen-thong">Phòng Truyền thông (V2.1) →</a>
        <a class="btn" href="#strategies/group">Chiến lược Tập đoàn</a>
      </div>
    </div>

    <div class="statusbar">
      <div class="tile"><strong>1</strong><small>Chiến lược phòng ban hoàn chỉnh (Truyền thông V2.1)</small></div>
      <div class="tile"><strong>${departments.length}</strong><small>Không gian phòng ban cấu hình</small></div>
      <div class="tile"><strong>01/2027</strong><small>Mốc mở bán thương mại sản phẩm gà</small></div>
      <div class="tile"><strong>${data.projects.length}</strong><small>Dự án triển khai trong hệ thống</small></div>
    </div>

    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel-head">
          <div>
            <div class="eyebrow">01 / CORPORATE STRATEGY</div>
            <h2>Chiến lược cấp Tập đoàn</h2>
          </div>
          <a href="#strategies/group" class="textlink">Xem chi tiết →</a>
        </div>
        <p><strong>Định vị:</strong> ${esc(company.positioning || '')}</p>
        <p><strong>Chuỗi giá trị chiến lược:</strong> <code>${esc(catalog.strategicFormula || company.strategicFormula || '')}</code></p>
        <p class="muted">${esc(catalog.horizon || '')}</p>
        <div class="notice">${esc(catalog.standaloneDocNote || '')}</div>
        <a class="btn small" href="#strategies/group">Mở không gian Chiến lược Tập đoàn →</a>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <div class="eyebrow">02 / CORPORATE MILESTONES</div>
            <h2>Mốc phát triển &amp; Thương mại 2026–2027</h2>
          </div>
          <a href="#projects" class="textlink">Danh mục dự án →</a>
        </div>
        <div class="wp-timeline">
          ${milestones
            .map(
              (m) => `
            <div class="wp-timeline-row">
              <div class="wp-timeline-period">${esc(m.period)}</div>
              <div>
                <div class="wp-list-meta"><strong>${esc(m.title)}</strong> · <span class="wp-status-tag">${esc(m.status)}</span></div>
                <p class="muted" style="margin:3px 0 0">${esc(m.detail)}</p>
              </div>
            </div>`
            )
            .join('')}
        </div>
      </section>
    </div>

    <section class="panel">
      <div class="panel-head">
        <div>
          <div class="eyebrow">03 / DEPARTMENT STRATEGIES</div>
          <h2>Chiến lược &amp; Kế hoạch các phòng ban</h2>
        </div>
        <a href="#departments" class="textlink">Danh mục phòng ban →</a>
      </div>
      <p class="muted" style="margin-bottom:14px">Danh mục 8 phòng ban theo cấu trúc đề xuất (chưa phải văn bản cơ cấu tổ chức chính thức). Các đơn vị chưa nộp tài liệu hiển thị trạng thái <strong>Chưa cập nhật</strong>.</p>
      <div class="wp-dept-grid">
        ${departments
          .map((d) => {
            const pCount = getDepartmentProjectCount(d);
            return `
          <a class="wp-dept-card" href="#departments/${esc(d.id)}">
            <div class="wp-dept-head">
              <span class="wp-dept-icon" aria-hidden="true">${esc(d.icon || '◈')}</span>
              <span class="wp-dept-code">${esc(d.code)}</span>
            </div>
            <h3>${esc(d.name)}</h3>
            <p>${esc(d.summary)}</p>
            <div class="wp-dept-foot">
              <div class="wp-dept-stat"><span>Trạng thái:</span><strong>${esc(d.strategyStatus)}</strong></div>
              <div class="wp-dept-stat"><span>Dự án:</span><strong>${pCount !== null ? `${pCount} dự án` : 'Chưa cập nhật'}</strong></div>
            </div>
          </a>`;
          })
          .join('')}
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <div class="eyebrow">04 / ENTERPRISE ROADMAP · DỮ LIỆU V2.1</div>
          <h2>Lộ trình triển khai trọng tâm 12/2026 – 12/2027</h2>
        </div>
        <a href="#departments/truyen-thong/plans" class="textlink">Chi tiết kế hoạch Truyền thông →</a>
      </div>
      <div class="roadmap-wrap" data-roadmap></div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <div class="eyebrow">05 / CROSS-DEPARTMENT COORDINATION</div>
          <h2>Các mốc phối hợp liên phòng ban</h2>
        </div>
      </div>
      <div class="cards">
        ${coord
          .map(
            (c) => `
          <div class="tile">
            <strong>${esc(c.scope)}</strong>
            <div class="muted" style="font-size:11px;margin-top:4px">${esc((c.departments || []).join(' · '))}</div>
            <p>${esc(c.focus)}</p>
          </div>`
          )
          .join('')}
      </div>
    </section>
  `;

  renderRoadmaps();
}

export function renderGroupStrategyPage(hostEl) {
  const company = portal.company || {};
  const catalog = portal.strategyCatalog?.groupStrategy || {};
  const milestones = catalog.corporateMilestones || [];
  const foundations = company.foundations || [];
  const values = company.coreValues || [];
  const comps = company.ecosystemComponents || [];

  hostEl.innerHTML = `
    <div class="pageheader">
      <div>
        <div class="eyebrow">MODULE 04 · CHIẾN LƯỢC TẬP ĐOÀN</div>
        <h1>${esc(catalog.title || 'Chiến lược phát triển Tập đoàn Organic Việt Nam')}</h1>
        <p>${esc(catalog.horizon || 'Định hướng hệ sinh thái Nông nghiệp · Thực phẩm · Công nghệ')}</p>
      </div>
      <div class="pageheader-actions">
        <a class="btn" href="#strategies">← Tổng quan Chiến lược</a>
        <a class="btn primary" href="#organization">Thông tin tổ chức →</a>
      </div>
    </div>

    <section class="panel">
      <div class="notice">
        <strong>Tình trạng văn bản Chiến lược Tập đoàn độc lập:</strong> ${esc(catalog.standaloneDocStatus || 'Chưa cập nhật')}. ${esc(
    catalog.standaloneDocNote || ''
  )}
      </div>
      <div class="dashboard-grid" style="margin-bottom:0">
        <div>
          <div class="eyebrow">TẦM NHÌN CHIẾN LƯỢC</div>
          <p>${esc(company.vision || '')}</p>
          <div class="eyebrow" style="margin-top:14px">SỨ MỆNH</div>
          <p>${esc(company.mission || '')}</p>
        </div>
        <div>
          <div class="eyebrow">BA NỀN TẢNG PHÁT TRIỂN</div>
          <div class="steps">
            ${foundations
              .map(
                (f, i) => `
              <div class="step">
                <span class="stepnum">${String(i + 1).padStart(2, '0')}</span>
                <div><strong>${esc(f.title)}</strong><p>${esc(f.desc)}</p></div>
              </div>`
              )
              .join('')}
          </div>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <div class="eyebrow">ECOSYSTEM ARCHITECTURE</div>
          <h2>Kiến trúc hệ sinh thái giá trị</h2>
        </div>
        <span class="muted"><code>${esc(company.strategicFormula || '')}</code></span>
      </div>
      <div class="cards">
        ${comps
          .map(
            (c) => `
          <div class="tile">
            <strong>${esc(c.name)}</strong>
            <div class="muted" style="font-size:11px;margin-top:3px">${esc(c.role)}</div>
            <p>${esc(c.summary)}</p>
          </div>`
          )
          .join('')}
      </div>
    </section>

    <div class="dashboard-grid">
      <section class="panel">
        <div class="panel-head">
          <div>
            <div class="eyebrow">CORE VALUES</div>
            <h2>Giá trị cốt lõi</h2>
          </div>
        </div>
        <div class="steps">
          ${values
            .map(
              (v, i) => `
            <div class="step">
              <span class="stepnum">${String(i + 1).padStart(2, '0')}</span>
              <div><strong>${esc(v.title)}</strong><p>${esc(v.desc)}</p></div>
            </div>`
            )
            .join('')}
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <div class="eyebrow">CORPORATE ROADMAP</div>
            <h2>Mục tiêu &amp; Lộ trình theo năm</h2>
          </div>
        </div>
        <div class="wp-timeline">
          ${milestones
            .map(
              (m) => `
            <div class="wp-timeline-row">
              <div class="wp-timeline-period">${esc(m.period)}</div>
              <div>
                <div class="wp-list-meta"><strong>${esc(m.title)}</strong> · <span class="wp-status-tag">${esc(m.status)}</span></div>
                <p class="muted" style="margin:3px 0 0">${esc(m.detail)}</p>
              </div>
            </div>`
            )
            .join('')}
        </div>
      </section>
    </div>

    <section class="panel">
      <div class="panel-head">
        <div>
          <div class="eyebrow">LỘ TRÌNH THÁNG HIỆN CÓ</div>
          <h2>Biểu đồ lộ trình 12/2026 – 12/2027 (liên kết dữ liệu Truyền thông V2.1)</h2>
        </div>
        <a href="#departments/truyen-thong" class="textlink">Mở Phòng Truyền thông →</a>
      </div>
      <div class="roadmap-wrap" data-roadmap></div>
    </section>
  `;

  renderRoadmaps();
}
