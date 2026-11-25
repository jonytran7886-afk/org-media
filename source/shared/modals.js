'use strict';

import { $, $$, esc } from './utils.js';
import { data, getProject, getProjectProgress, computeCampaignActual } from './data-service.js';

let trackerJumpHandler = null;
export function setTrackerJumpHandler(fn) {
  trackerJumpHandler = fn;
}

export function ensureRoadmapOverlay() {
  let tt = $('#rm-tooltip');
  if (!tt) {
    tt = document.createElement('div');
    tt.id = 'rm-tooltip';
    tt.className = 'rm-tooltip';
    tt.setAttribute('role', 'tooltip');
    document.body.appendChild(tt);
  }
  let modal = $('#campaign-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'campaign-modal';
    modal.className = 'modal-backdrop';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML =
      '<div class="modal-card"><div class="modal-head"><div><div class="eyebrow" id="cm-code"></div><h2 id="cm-title"></h2></div><button type="button" class="iconbtn" id="cm-close" aria-label="Đóng">×</button></div><div id="cm-body"></div></div>';
    document.body.appendChild(modal);
    $('#cm-close', modal).onclick = () => modal.classList.remove('open');
    modal.onclick = (e) => {
      if (e.target === modal) modal.classList.remove('open');
    };
  }
  return { tt, modal };
}

export function openCampaignModal(track) {
  const { modal } = ensureRoadmapOverlay();
  const actual = computeCampaignActual(track);
  $('#cm-code', modal).textContent = `${track.code || track.id} · ${track.type}`;
  $('#cm-title', modal).textContent = track.name;
  const projLinks = (track.relatedProjects || [])
    .map((pid) => {
      const pObj = data.projects.find((p) => p.id === pid);
      const st = getProject(pid).status;
      return `<button type="button" class="proj-chip" data-jump-proj="${esc(pid)}"><strong>${esc(pid)}</strong><span>${esc(
        pObj ? pObj.name : ''
      )}</span><span class="rm-status-chip ${getProjectProgress(st).cls}">${esc(st)}</span></button>`;
    })
    .join('');
  const segList = (track.segments || [])
    .map(
      (seg) =>
        `<li><strong>${esc(data.roadmapMonths[seg.startMonth]?.label || '')} → ${esc(
          data.roadmapMonths[seg.endMonth]?.label || ''
        )}:</strong> ${esc(seg.label)}</li>`
    )
    .join('');
  $('#cm-body', modal).innerHTML = `
    <p>${esc(track.goal)}</p>
    <div class="modal-grid">
      <div class="modal-box"><small>Thời gian dự kiến</small><strong>${esc(track.timing)}</strong></div>
      <div class="modal-box"><small>Cấu phần trọng tâm</small><strong>${esc(track.focus)}</strong></div>
      <div class="modal-box"><small>Trạng thái kế hoạch</small><strong>${esc(track.plannedStatus)}</strong></div>
      <div class="modal-box"><small>Trạng thái thực tế (Tracker)</small><span class="rm-status-chip ${actual.cls}">${esc(
        actual.label
      )}</span></div>
    </div>
    <h4 style="margin:12px 0 6px">Các pha triển khai trên Roadmap</h4>
    <ul style="margin:0 0 12px;padding-left:18px;font-size:12px">${segList}</ul>
    <h4 style="margin:12px 0 6px">Dự án liên kết trong Master Project Tracker</h4>
    <div class="proj-chip-list">${projLinks || '<span class="muted">Không có dự án liên kết.</span>'}</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:16px">
      <a class="btn primary small" href="#p6/m27" id="cm-goto-m27">Xem Mục 27 trong tài liệu →</a>
      <a class="btn small" href="#tracker" id="cm-goto-tracker">Mở Master Project Tracker →</a>
    </div>
  `;
  $$('[data-jump-proj]', modal).forEach((btn) => {
    btn.onclick = () => {
      modal.classList.remove('open');
      if (trackerJumpHandler) trackerJumpHandler(btn.dataset.jumpProj);
      else location.hash = '#tracker';
    };
  });
  $('#cm-goto-m27', modal).onclick = () => modal.classList.remove('open');
  $('#cm-goto-tracker', modal).onclick = () => modal.classList.remove('open');
  modal.classList.add('open');
}

export function openAnnouncementModal(item) {
  const { modal } = ensureRoadmapOverlay();
  $('#cm-code', modal).textContent = `${item.type} · ${item.date}`;
  $('#cm-title', modal).textContent = item.title;
  $('#cm-body', modal).innerHTML = `
    <p>${esc(item.summary)}</p>
    <div class="modal-grid">
      <div class="modal-box"><small>Đơn vị phát hành / phụ trách</small><strong>${esc(item.departmentName)}</strong></div>
      <div class="modal-box"><small>Trạng thái</small><strong>${esc(item.status)}</strong></div>
    </div>
    ${
      item.route
        ? `<div style="margin-top:14px"><a class="btn primary small" href="${esc(item.route)}" id="ann-goto-link">Đi tới phân hệ liên quan →</a></div>`
        : ''
    }
  `;
  const goto = $('#ann-goto-link', modal);
  if (goto) goto.onclick = () => modal.classList.remove('open');
  modal.classList.add('open');
}
