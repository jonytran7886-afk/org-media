'use strict';

import { $, $$, esc, norm, getNow, dayStart, parseIsoDate, daysBetween, statusToneClass } from '../../shared/utils.js';
import {
  data,
  portal,
  statuses,
  getAllProjectsUnified,
  getDepartmentProjectCount,
  getProject,
  getProjectProgress,
  renderCloudBar,
} from '../../shared/data-service.js';
import { bindTasks, openTrackerForProject, renderUpcomingPanel } from '../communications/widgets.js';

export function renderProjectsEnterprisePage(hostEl, mode = 'portfolio') {
  const isTasksMode = mode === 'tasks';
  const allProjects = getAllProjectsUnified();
  const departments = portal.departments || [];
  const now = dayStart(getNow());

  const enriched = allProjects.map((p) => {
    const rec = getProject(p.id);
    const prog = getProjectProgress(rec.status);
    const dl = parseIsoDate(p.deadlineIso);
    const diffDays = dl ? daysBetween(now, dl) : null;
    const isDone = rec.status === 'Hoàn thành';
    const isOverdue = !isDone && diffDays !== null && diffDays < 0;
    const isDueSoon = !isDone && diffDays !== null && diffDays >= 0 && diffDays <= 15;
    return {
      ...p,
      rec,
      prog,
      diffDays,
      isOverdue,
      isDueSoon,
    };
  });

  const totalCount = enriched.length;
  const inProgressCount = enriched.filter((x) => x.rec.status === 'Đang thực hiện').length;
  const doneCount = enriched.filter((x) => x.rec.status === 'Hoàn thành').length;
  const dueSoonCount = enriched.filter((x) => x.isDueSoon).length;
  const overdueCount = enriched.filter((x) => x.isOverdue).length;
  const preLaunchCount = enriched.filter((x) => x.preLaunchRequired).length;
  const preLaunchDone = enriched.filter((x) => x.preLaunchRequired && x.rec.status === 'Hoàn thành').length;

  hostEl.innerHTML = `
    <div class="pageheader">
      <div>
        <div class="eyebrow">MODULE 05 · ENTERPRISE PROJECTS &amp; TASKS</div>
        <h1>${isTasksMode ? 'Công việc ưu tiên &amp; Mốc Deadline' : 'Dự án &amp; Công việc cấp doanh nghiệp'}</h1>
        <p>Tổng hợp trực tiếp từ nguồn dữ liệu thống nhất (Master Project Tracker hiện có ${totalCount} dự án · Không tạo bản sao độc lập).</p>
      </div>
      <div class="pageheader-actions">
        <a class="btn primary" href="#tracker">Cập nhật trên Tracker →</a>
      </div>
    </div>

    <nav class="wp-tabs" aria-label="Phân khu Dự án và Công việc">
      <a class="wp-tab ${!isTasksMode ? 'active' : ''}" href="#projects">Danh mục dự án (${totalCount})</a>
      <a class="wp-tab ${isTasksMode ? 'active' : ''}" href="#projects/tasks">Công việc &amp; Deadline (20 nhiệm vụ)</a>
    </nav>

    <div class="statusbar">
      <div class="tile"><strong>${totalCount}</strong><small>Tổng số dự án</small></div>
      <div class="tile"><strong>${inProgressCount}</strong><small>Đang thực hiện</small></div>
      <div class="tile"><strong>${doneCount}</strong><small>Hoàn thành</small></div>
      <div class="tile"><strong>${dueSoonCount}</strong><small>Sắp đến hạn (≤ 15 ngày)</small></div>
      <div class="tile"><strong>${overdueCount}</strong><small>Quá hạn</small></div>
      <div class="tile"><strong>${preLaunchDone}/${preLaunchCount}</strong><small>Bắt buộc trước mở bán</small></div>
    </div>

    <section class="panel">
      <div id="cloud-sync-bar" class="cloud-bar offline"></div>
      <div class="panel-head" style="margin-top:12px">
        <div>
          <div class="eyebrow">PHÂN BỔ THEO PHÒNG BAN</div>
          <h2>Dữ liệu dự án hiện có theo đơn vị</h2>
        </div>
      </div>
      <div class="wp-dept-summary-row">
        ${departments
          .map((d) => {
            const c = getDepartmentProjectCount(d);
            return `
          <a class="wp-dept-mini" href="#departments/${esc(d.id)}/projects">
            <strong>${esc(d.shortName)}</strong>
            <span>${c !== null ? `${c} dự án` : 'Chưa cập nhật'}</span>
          </a>`;
          })
          .join('')}
      </div>
    </section>

    <div id="ent-proj-body"></div>
  `;

  renderCloudBar();
  const body = $('#ent-proj-body', hostEl);

  if (isTasksMode) {
    const checklistHtml =
      `<section class="panel"><div class="checklist"><div class="panel-head"><div><h4>20 nhiệm vụ ưu tiên theo tác động mở bán 01/2027</h4><div class="checklist-meta"><span data-prelaunchcount>0/14 nhiệm vụ bắt buộc trước mở bán</span></div></div><strong data-checkcount>0/20</strong></div><div class="track"><span data-checkbar style="width:0%"></span></div>` +
      (data.priorities || [])
        .map(
          (item, i) =>
            `<label class="checkrow"><input type="checkbox" data-task="${i}"><span><div class="checkrow-head"><strong>${i + 1}. ${esc(
              item.title
            )}</strong>${
              item.preLaunchRequired
                ? '<span class="req-badge">Bắt buộc trước mở bán</span>'
                : '<span class="opt-badge">Nền tảng & vận hành</span>'
            }</div><small>${esc(item.group)} · Dự án liên quan: <button type="button" class="wp-link-inline" data-ent-jump="${esc(
              item.projectId
            )}">${esc(item.projectId)}</button></small></span></label>`
        )
        .join('') +
      '<button class="btn" data-copytasks>Sao chép danh sách công việc</button></div></section>';

    body.innerHTML = `
      <div class="dashboard-grid" style="margin-bottom:0">
        <section class="panel">
          <div class="panel-head">
            <div>
              <div class="eyebrow">UPCOMING DEADLINES</div>
              <h2>Mốc công việc 7 · 15 · 30 ngày tới</h2>
            </div>
            <a href="#tracker" class="textlink">Cập nhật trạng thái →</a>
          </div>
          <div id="ent-upcoming"></div>
        </section>
        ${checklistHtml}
      </div>
    `;
    renderUpcomingPanel('#ent-upcoming', 12);
    bindTasks();
    $$('[data-ent-jump]', body).forEach((btn) => {
      btn.onclick = () => {
        const firstId = btn.dataset.entJump.split(',')[0].trim();
        if (/^[A-F]\d\d$/.test(firstId)) openTrackerForProject(firstId);
      };
    });
    return;
  }

  // Enterprise portfolio table
  body.innerHTML = `
    <section class="panel">
      <div class="filters" style="margin-top:0">
        <label class="field searchfield">
          Tìm kiếm dự án
          <input type="search" id="ep-q" placeholder="Mã, tên dự án, phụ trách, chiến dịch…">
        </label>
        <label class="field">
          Phòng ban
          <select id="ep-dept">
            <option value="">Tất cả phòng ban</option>
            ${departments.map((d) => `<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          Ưu tiên
          <select id="ep-prio">
            <option value="">Tất cả</option>
            <option>P1</option>
            <option>P2</option>
            <option>P3</option>
          </select>
        </label>
        <label class="field">
          Trạng thái
          <select id="ep-status">
            <option value="">Tất cả trạng thái</option>
            ${statuses.map((s) => `<option>${esc(s)}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          Mốc hạn
          <select id="ep-due">
            <option value="">Tất cả</option>
            <option value="soon">Sắp đến hạn (≤ 15 ngày)</option>
            <option value="overdue">Quá hạn</option>
            <option value="pre">Bắt buộc trước mở bán</option>
          </select>
        </label>
        <label class="field">
          Sắp xếp
          <select id="ep-sort">
            <option value="id">Theo mã dự án (A01–F07)</option>
            <option value="deadline">Deadline gần nhất</option>
            <option value="priority">Mức độ ưu tiên (P1 → P3)</option>
          </select>
        </label>
      </div>

      <div class="panel-head">
        <span id="ep-count" class="muted"></span>
        <span class="muted">Nhấn "Cập nhật" ở từng dòng để chỉnh trực tiếp trên Master Project Tracker.</span>
      </div>

      <div class="table-scroll">
        <table class="tracker-table">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tên dự án</th>
              <th>Phòng ban</th>
              <th>Người phụ trách</th>
              <th>Ngày bắt đầu</th>
              <th>Deadline</th>
              <th>Ưu tiên</th>
              <th>Tiến độ</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody id="ep-rows"></tbody>
        </table>
      </div>
    </section>
  `;

  const draw = () => {
    const q = norm($('#ep-q', body).value);
    const dept = $('#ep-dept', body).value;
    const prio = $('#ep-prio', body).value;
    const st = $('#ep-status', body).value;
    const due = $('#ep-due', body).value;
    const sortBy = $('#ep-sort', body).value;

    let list = enriched.filter((x) => {
      const hay = norm([x.id, x.name, x.departmentName, x.rec.owner, x.defaultOwner, x.relatedCampaign].join(' '));
      return (
        (!q || hay.includes(q)) &&
        (!dept || x.departmentId === dept) &&
        (!prio || x.priority === prio) &&
        (!st || x.rec.status === st) &&
        (!due || (due === 'soon' ? x.isDueSoon : due === 'overdue' ? x.isOverdue : x.preLaunchRequired))
      );
    });

    if (sortBy === 'deadline') {
      list = [...list].sort((a, b) => (a.deadlineIso || '9999').localeCompare(b.deadlineIso || '9999'));
    } else if (sortBy === 'priority') {
      list = [...list].sort((a, b) => a.priority.localeCompare(b.priority) || a.id.localeCompare(b.id));
    }

    $('#ep-count', body).textContent = `Hiển thị ${list.length}/${totalCount} dự án`;
    $('#ep-rows', body).innerHTML =
      list
        .map(
          (x) => `
      <tr>
        <td data-label="Mã"><strong>${esc(x.id)}</strong></td>
        <td data-label="Tên dự án" class="tracker-project-cell">
          <strong>${esc(x.name)}</strong>
          <div class="tracker-submeta">
            ${x.preLaunchRequired ? '<span class="req-badge">Trước mở bán</span>' : ''}
            ${x.isOverdue ? '<span class="wp-status-tag pause">Quá hạn</span>' : x.isDueSoon ? '<span class="wp-status-tag warn">Sắp đến hạn</span>' : ''}
            <span>${esc(x.relatedCampaign)}</span>
          </div>
        </td>
        <td data-label="Phòng ban">${esc(x.departmentName)}</td>
        <td data-label="Phụ trách">${esc(x.rec.owner || x.defaultOwner)}</td>
        <td data-label="Bắt đầu">${esc(x.startDate)}</td>
        <td data-label="Deadline"><strong>${esc(x.deadline)}</strong></td>
        <td data-label="Ưu tiên"><span class="priority ${x.priority.toLowerCase()}">${esc(x.priority)}</span></td>
        <td data-label="Tiến độ" class="tracker-prog"><strong>${esc(x.prog.label)}</strong><div class="tracker-prog-bar"><span style="width:${x.prog.pct}%"></span></div></td>
        <td data-label="Trạng thái"><span class="wp-status-tag ${statusToneClass(x.rec.status)}">${esc(x.rec.status)}</span></td>
        <td data-label="Thao tác">
          <div class="wp-row-actions">
            <button type="button" class="btn small primary" data-open-tracker="${esc(x.id)}">Cập nhật</button>
            <a class="btn small" href="#p10/project-${esc(x.id)}">Hồ sơ gốc</a>
          </div>
        </td>
      </tr>`
        )
        .join('') || '<tr><td colspan="10">Không tìm thấy dự án phù hợp.</td></tr>';

    $$('[data-open-tracker]', body).forEach((btn) => {
      btn.onclick = () => openTrackerForProject(btn.dataset.openTracker);
    });
  };

  ['#ep-q', '#ep-dept', '#ep-prio', '#ep-status', '#ep-due', '#ep-sort'].forEach((sel) => {
    const el = $(sel, body);
    el.addEventListener(sel === '#ep-q' ? 'input' : 'change', draw);
  });
  draw();
}
