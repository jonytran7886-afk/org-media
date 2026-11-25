'use strict';

import { $, esc, statusToneClass } from '../../shared/utils.js';
import { data, portal, short, getDepartmentById, getDepartmentProjectCount } from '../../shared/data-service.js';
import {
  renderCommDashboard,
  renderRoadmaps,
  renderUpcomingPanel,
  renderTrackerPanel,
  bindTasks,
  bindBudget,
} from '../communications/widgets.js';
import { openCampaignModal } from '../../shared/modals.js';

const TABS = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'strategy', label: 'Chiến lược' },
  { id: 'plans', label: 'Kế hoạch' },
  { id: 'projects', label: 'Dự án & Công việc' },
  { id: 'documents', label: 'Tài liệu' },
  { id: 'budget-kpi', label: 'Ngân sách & KPI' },
];

export function renderDepartmentsDirectoryPage(hostEl) {
  const departments = portal.departments || [];
  hostEl.innerHTML = `
    <div class="pageheader">
      <div>
        <div class="eyebrow">MODULE 04 · DEPARTMENT WORKSPACES</div>
        <h1>Danh mục không gian các phòng ban</h1>
        <p>Không gian làm việc thống nhất cho 8 phòng ban theo cấu trúc đề xuất. Dữ liệu chiến lược truyền thông V2.1 được tích hợp đầy đủ tại Phòng Truyền thông.</p>
      </div>
      <div class="pageheader-actions">
        <a class="btn" href="#strategies">← Chiến lược &amp; Kế hoạch</a>
      </div>
    </div>

    <div class="notice">
      <strong>Lưu ý cấu trúc:</strong> Danh mục 8 phòng ban dưới đây được cấu hình trong <code>source/data/departments.json</code> để chuẩn hóa không gian làm việc trên cổng thông tin, chưa thay thế cho văn bản cơ cấu tổ chức chính thức của Tập đoàn.
    </div>

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
            <div class="wp-dept-stat"><span>Chiến lược:</span><strong>${esc(d.strategyStatus)}</strong></div>
            <div class="wp-dept-stat"><span>Dự án:</span><strong>${pCount !== null ? `${pCount} dự án` : 'Chưa cập nhật'}</strong></div>
          </div>
        </a>`;
        })
        .join('')}
    </div>
  `;
}

function renderStandardPendingNotice(dept, areaTitle, description) {
  return `
    <section class="panel">
      <div class="wp-empty-state">
        <div class="eyebrow">TRẠNG THÁI DỮ LIỆU · CHƯA CẬP NHẬT</div>
        <h2>${esc(areaTitle)} – ${esc(dept.name)}</h2>
        <p>${esc(description)}</p>
        <p class="muted">Hệ thống không tạo số liệu giả hoặc mặc định 0% khi chưa có dữ liệu chính thức từ đơn vị phụ trách. Khi có tài liệu hoặc kế hoạch mới, dữ liệu có thể bổ sung trực tiếp qua cấu trúc <code>source/data/departments.json</code> và <code>source/data/documents.json</code>.</p>
      </div>
    </section>
  `;
}

function renderDeptDocumentsList(dept) {
  const docs = (portal.documents || []).filter((d) => d.departmentId === dept.id);
  const categories = Object.fromEntries((portal.documentCategories || []).map((c) => [c.id, c.name]));

  if (!docs.length) {
    return renderStandardPendingNotice(
      dept,
      'Tài liệu chuyên môn & Quy trình',
      'Chưa có tài liệu riêng gắn với phòng ban này trong Thư viện tài liệu trung tâm.'
    );
  }

  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <div class="eyebrow">TÀI LIỆU CỦA PHÒNG BAN</div>
          <h2>Danh mục tài liệu (${docs.length})</h2>
        </div>
        <a href="#documents" class="textlink">Mở Thư viện trung tâm →</a>
      </div>
      <div class="table-scroll">
        <table class="tracker-table">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tên tài liệu</th>
              <th>Danh mục</th>
              <th>Phiên bản</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            ${docs
              .map(
                (d) => `
              <tr>
                <td><code>${esc(d.documentCode)}</code></td>
                <td><strong>${esc(d.title)}</strong><div class="tracker-deliverable">${esc(d.description)}</div></td>
                <td>${esc(categories[d.categoryId] || d.categoryId)}</td>
                <td>${esc(d.version || 'Chưa cập nhật')}</td>
                <td><span class="wp-status-tag ${statusToneClass(d.status)}">${esc(d.status)}</span></td>
                <td><a class="btn small" href="#documents/view/${esc(d.id)}">${d.status === 'Chưa cập nhật' ? 'Chi tiết' : 'Đọc tài liệu'}</a></td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

export function renderDepartmentWorkspace(hostEl, deptId, tab = 'overview') {
  const dept = getDepartmentById(deptId);
  if (!dept) {
    hostEl.innerHTML = `
      <div class="pageheader">
        <div>
          <div class="eyebrow">DEPARTMENT WORKSPACE</div>
          <h1>Không tìm thấy phòng ban</h1>
          <p>Không có phòng ban với mã "${esc(deptId)}".</p>
        </div>
        <a class="btn" href="#departments">← Danh mục phòng ban</a>
      </div>
    `;
    return;
  }

  const activeTab = TABS.some((t) => t.id === tab) ? tab : 'overview';
  const isComms = dept.workspaceMode === 'communications';
  const projectCount = getDepartmentProjectCount(dept);

  const tabHref = (tId) => (tId === 'overview' ? `#departments/${dept.id}` : `#departments/${dept.id}/${tId}`);

  hostEl.innerHTML = `
    <div class="pageheader">
      <div>
        <div class="eyebrow">DEPARTMENT WORKSPACE · ${esc(dept.code)} · ${esc(dept.structureStatus.toUpperCase())}</div>
        <h1>${esc(dept.icon || '')} ${esc(dept.name)}</h1>
        <p>${esc(dept.summary)}</p>
      </div>
      <div class="pageheader-actions">
        <a class="btn" href="#departments">← Tất cả phòng ban</a>
        ${isComms ? '<a class="btn primary" href="#all">Xem toàn văn V2.1</a>' : ''}
      </div>
    </div>

    <nav class="wp-tabs" role="tablist" aria-label="Phân khu không gian phòng ban">
      ${TABS.map(
        (t) => `<a class="wp-tab ${activeTab === t.id ? 'active' : ''}" href="${esc(tabHref(t.id))}" role="tab" aria-selected="${
          activeTab === t.id ? 'true' : 'false'
        }">${esc(t.label)}</a>`
      ).join('')}
    </nav>

    <div id="dept-tab-body"></div>
  `;

  const body = $('#dept-tab-body', hostEl);

  if (isComms) {
    if (activeTab === 'overview') {
      renderCommDashboard(body);
      return;
    }

    if (activeTab === 'strategy') {
      const ver = data.versionMeta || {};
      body.innerHTML = `
        <section class="panel">
          <div class="panel-head">
            <div>
              <div class="eyebrow">CHIẾN LƯỢC PHÒNG TRUYỀN THÔNG</div>
              <h2>${esc(ver.title || 'Chiến lược truyền thông tổng thể 2027')}</h2>
            </div>
            <span class="version-pill">${esc(ver.version || 'V2.1')} · ${esc(ver.status || 'Chờ phê duyệt')}</span>
          </div>
          <p>Toàn bộ 12 phần · 50 mục nội dung · Phụ lục 15 tài liệu triển khai và mốc thương mại sản phẩm gà tháng 01/2027 được giữ nguyên vẹn.</p>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 18px">
            <a class="btn primary" href="#all">Đọc toàn văn Chiến lược V2.1 →</a>
            <a class="btn" href="toan-van.html" target="_blank" rel="noopener">Đối chiếu bản lưu trữ V2.0 Final ↗</a>
          </div>
          <div class="chaptergrid">
            ${(data.sections || [])
              .map((s) => {
                const label = s.p <= 12 ? String(s.p).padStart(2, '0') : 'PL';
                const headingCount = s.headings.filter((h) => h.level === 2).length;
                const cleanTitle = s.title.split('. ').slice(1).join('. ') || s.title;
                return `
              <a href="#p${s.p}" class="chapter-card">
                <span>${label}</span>
                <strong>${esc(cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1).toLowerCase())}</strong>
                <small>${headingCount ? `${headingCount} mục` : '15 tài liệu'} · Đọc chương →</small>
              </a>`;
              })
              .join('')}
          </div>
        </section>
      `;
      return;
    }

    if (activeTab === 'plans') {
      const tracks = [...(data.campaigns || []), ...(data.ongoingTrack ? [data.ongoingTrack] : [])];
      body.innerHTML = `
        <section class="panel">
          <div class="panel-head">
            <div>
              <div class="eyebrow">QUARTERLY PLAN · 2027</div>
              <h2>Chiến lược triển khai theo quý</h2>
            </div>
            <a href="#p6/m26" class="textlink">Kế hoạch 12 tháng →</a>
          </div>
          <div class="quartergrid">
            ${(data.quarters || [])
              .map(
                (q) => `
              <div class="tile quarter">
                <span>${esc(q.label)}</span>
                <div class="muted" style="font-size:10px;margin-top:2px">${esc(q.prepNote)}</div>
                <h4>${esc(q.title)}</h4>
                <p>${esc(q.desc)}</p>
              </div>`
              )
              .join('')}
          </div>
        </section>

        <section class="panel">
          <div class="panel-head">
            <div>
              <div class="eyebrow">ROADMAP 12/2026 – 12/2027</div>
              <h2>Biểu đồ lộ trình chiến dịch &amp; Chương trình C08</h2>
            </div>
            <a href="#p6/m28" class="textlink">Kế hoạch 90 ngày →</a>
          </div>
          <div class="roadmap-wrap" data-roadmap></div>
        </section>

        <div class="dashboard-grid">
          <section class="panel">
            <div class="panel-head">
              <div>
                <div class="eyebrow">UPCOMING 7 · 15 · 30 DAYS</div>
                <h2>Kế hoạch sắp tới</h2>
              </div>
              <a href="#tracker" class="textlink">Mở Tracker →</a>
            </div>
            <div id="dept-comms-upcoming"></div>
          </section>

          <section class="panel">
            <div class="panel-head">
              <div>
                <div class="eyebrow">CAMPAIGN CATALOG</div>
                <h2>11 Chiến dịch &amp; Chương trình hỗ trợ bán hàng C08</h2>
              </div>
              <a href="#p6/m27" class="textlink">Mục 27 →</a>
            </div>
            <div class="wp-list">
              ${tracks
                .map(
                  (c, idx) => `
                <div class="wp-list-row">
                  <div class="wp-list-main">
                    <div class="wp-list-meta"><strong>${esc(c.code || c.id)}</strong> · <span>${esc(c.timing)}</span></div>
                    <h3><button type="button" class="wp-link-btn" data-dept-camp="${idx}">${esc(c.name)}</button></h3>
                    <p>${esc(c.goal)}</p>
                  </div>
                </div>`
                )
                .join('')}
            </div>
          </section>
        </div>
      `;
      renderRoadmaps();
      renderUpcomingPanel('#dept-comms-upcoming', 8);
      body.querySelectorAll('[data-dept-camp]').forEach((btn) => {
        btn.onclick = () => openCampaignModal(tracks[Number(btn.dataset.deptCamp)]);
      });
      return;
    }

    if (activeTab === 'projects') {
      const checklistHtml =
        `<section class="panel"><div class="checklist"><div class="panel-head"><div><h4>Checklist 20 nhiệm vụ ưu tiên theo tác động mở bán 01/2027</h4><div class="checklist-meta"><span data-prelaunchcount>0/14 nhiệm vụ bắt buộc trước mở bán</span></div></div><strong data-checkcount>0/20</strong></div><div class="track"><span data-checkbar style="width:0%"></span></div>` +
        (data.priorities || [])
          .map(
            (item, i) =>
              `<label class="checkrow"><input type="checkbox" data-task="${i}"><span><div class="checkrow-head"><strong>${i + 1}. ${esc(
                item.title
              )}</strong>${
                item.preLaunchRequired
                  ? '<span class="req-badge">Bắt buộc trước mở bán</span>'
                  : '<span class="opt-badge">Nền tảng & vận hành</span>'
              }</div><small>${esc(item.group)} · Dự án liên quan: ${esc(item.projectId)}</small></span></label>`
          )
          .join('') +
        '<button class="btn" data-copytasks>Sao chép danh sách công việc</button></div></section>';

      body.innerHTML = `<div id="dept-tracker-slot"></div>${checklistHtml}`;
      renderTrackerPanel($('#dept-tracker-slot', body));
      bindTasks();
      return;
    }

    if (activeTab === 'documents') {
      body.innerHTML =
        renderDeptDocumentsList(dept) +
        `<section class="panel"><div class="panel-head"><div><div class="eyebrow">PHỤ LỤC CHIẾN LƯỢC V2.1</div><h2>Danh sách 15 tài liệu triển khai sau chiến lược</h2></div><a href="#p13" class="textlink">Xem Phụ lục →</a></div><p class="muted">Bao gồm Đề án tổ chức, Brand Guidelines, Messaging Guidelines, Kế hoạch ra mắt gà 01/2027 – Tết 2027, Dự toán ngân sách, Master Content Plan, Quy chế phát ngôn và Quản trị khủng hoảng.</p><a class="btn small" href="#p13">Mở Phụ lục &amp; Phê duyệt →</a></section>`;
      return;
    }

    if (activeTab === 'budget-kpi') {
      body.innerHTML = `
        <section class="panel">
          <div class="panel-head">
            <div>
              <div class="eyebrow">RESOURCE &amp; BUDGET SIMULATOR</div>
              <h2>Mô hình dự toán ngân sách 2027 (Phương án B: 3 tỷ/năm)</h2>
            </div>
            <a href="#p8" class="textlink">Phần VIII Ngân sách →</a>
          </div>
          <div class="budget-widget">
            <div class="budget-interactive" data-budget></div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-head">
            <div>
              <div class="eyebrow">KPI &amp; EVALUATION FRAMEWORK</div>
              <h2>Hệ thống KPI trước mở bán, sau mở bán &amp; Điều hành</h2>
            </div>
            <a href="#p9" class="textlink">Phần IX KPI đầy đủ →</a>
          </div>
          <p>${esc(dept.kpiSummary)}</p>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
            <a class="btn small" href="#p9/m37">KPI trước mở bán (11–12/2026) →</a>
            <a class="btn small" href="#p9/m38">KPI sau mở bán (01–03/2027) →</a>
            <a class="btn small" href="#p11/m46">KPI Giám đốc Truyền thông →</a>
          </div>
        </section>
      `;
      bindBudget();
      return;
    }
  }

  // Standard unified layout for the other 7 departments (consistent Workspace component)
  if (activeTab === 'overview') {
    body.innerHTML = `
      <div class="statusbar">
        <div class="tile"><strong>${esc(dept.strategyStatus)}</strong><small>Tình trạng chiến lược</small></div>
        <div class="tile"><strong>${projectCount !== null ? projectCount : 'Chưa cập nhật'}</strong><small>Dự án đang quản lý</small></div>
        <div class="tile"><strong>${esc(dept.budgetSummary)}</strong><small>Ngân sách</small></div>
        <div class="tile"><strong>${esc(dept.kpiSummary)}</strong><small>Chỉ tiêu KPI</small></div>
      </div>

      <div class="dashboard-grid" style="margin-bottom:0">
        <section class="panel">
          <div class="panel-head">
            <div>
              <div class="eyebrow">CHỨC NĂNG &amp; NHIỆM VỤ</div>
              <h2>Phạm vi đảm nhiệm chính</h2>
            </div>
          </div>
          <ul class="wp-clean-list">
            ${(dept.functions || []).map((f) => `<li>${esc(f)}</li>`).join('')}
          </ul>
        </section>

        <section class="panel">
          <div class="panel-head">
            <div>
              <div class="eyebrow">PHỐI HỢP LIÊN PHÒNG BAN</div>
              <h2>Đầu mối phối hợp trọng tâm</h2>
            </div>
            <a href="#organization/departments" class="textlink">Hồ sơ đơn vị →</a>
          </div>
          <ul class="wp-clean-list">
            ${(dept.coordination || []).map((c) => `<li>${esc(c)}</li>`).join('')}
          </ul>
        </section>
      </div>
    `;
  } else if (activeTab === 'strategy') {
    body.innerHTML = renderStandardPendingNotice(
      dept,
      'Chiến lược phòng ban',
      'Tài liệu chiến lược riêng của phòng ban này đang ở trạng thái Chưa cập nhật. Khi có bản chiến lược được ban hành, nội dung sẽ hiển thị đầy đủ tại tab này cùng mục tiêu, trụ cột, phiên bản và trạng thái phê duyệt.'
    );
  } else if (activeTab === 'plans') {
    body.innerHTML = renderStandardPendingNotice(
      dept,
      'Kế hoạch năm / quý / tháng',
      'Kế hoạch hoạt động chi tiết theo năm, quý, tháng và kế hoạch 90 ngày của phòng ban chưa được cập nhật dữ liệu.'
    );
  } else if (activeTab === 'projects') {
    body.innerHTML = renderStandardPendingNotice(
      dept,
      'Danh mục dự án & Công việc',
      'Phòng ban này chưa có danh mục dự án độc lập được đưa lên cổng thông tin. Các đầu việc phối hợp mở bán 01/2027 hiện đang theo dõi tập trung tại Master Project Tracker.'
    );
  } else if (activeTab === 'documents') {
    body.innerHTML = renderDeptDocumentsList(dept);
  } else if (activeTab === 'budget-kpi') {
    body.innerHTML = renderStandardPendingNotice(
      dept,
      'Ngân sách & KPI phòng ban',
      'Dự toán ngân sách và bộ chỉ số KPI chính thức của phòng ban chưa được cập nhật dữ liệu (không hiển thị mặc định 0%).'
    );
  }
}
