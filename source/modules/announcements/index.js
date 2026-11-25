'use strict';

import { $, $$, esc, norm } from '../../shared/utils.js';
import { portal } from '../../shared/data-service.js';
import { openAnnouncementModal } from '../../shared/modals.js';

export function renderAnnouncementsPage(hostEl) {
  const list = portal.announcements || [];
  const types = [...new Set(list.map((a) => a.type).filter(Boolean))];

  hostEl.innerHTML = `
    <div class="pageheader">
      <div>
        <div class="eyebrow">ORGANIC WORKPLACE · THÔNG BÁO NỘI BỘ</div>
        <h1>Thông báo nội bộ</h1>
        <p>Thông báo cấp công ty, cập nhật chiến lược và các mốc triển khai trọng tâm.</p>
      </div>
      <div class="pageheader-actions">
        <a class="btn" href="#home">← Trang chủ</a>
      </div>
    </div>

    <section class="panel">
      <div class="filters" style="margin-top:0">
        <label class="field searchfield">
          Tìm kiếm thông báo
          <input type="search" id="ann-q" placeholder="Tiêu đề, nội dung, đơn vị phát hành…">
        </label>
        <label class="field">
          Phân loại
          <select id="ann-type">
            <option value="">Tất cả loại</option>
            ${types.map((t) => `<option>${esc(t)}</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="wp-list" id="ann-list"></div>
      <div class="notice" style="margin-top:14px">
        Dữ liệu thông báo được quản lý trong tệp cấu hình <code>source/data/announcements.json</code>. Chỉ hiển thị các thông báo thực tế đã ghi nhận trong hệ thống.
      </div>
    </section>
  `;

  const draw = () => {
    const q = norm($('#ann-q', hostEl).value);
    const tp = $('#ann-type', hostEl).value;
    const filtered = list.filter((a) => {
      const hay = norm([a.id, a.title, a.summary, a.departmentName, a.type].join(' '));
      return (!q || hay.includes(q)) && (!tp || a.type === tp);
    });
    $('#ann-list', hostEl).innerHTML =
      filtered
        .map((a) => {
          const origIdx = list.indexOf(a);
          return `
        <article class="wp-list-row">
          <div class="wp-list-main">
            <div class="wp-list-meta">
              <span>${esc(a.id)}</span>
              <span>·</span>
              <span>${esc(a.date)}</span>
              <span>·</span>
              <span>${esc(a.type)}</span>
              <span>·</span>
              <span>${esc(a.departmentName)}</span>
            </div>
            <h3><button type="button" class="wp-link-btn" data-ann-idx="${origIdx}">${esc(a.title)}</button></h3>
            <p>${esc(a.summary)}</p>
          </div>
          <div class="wp-list-side">
            <span class="wp-status-tag">${esc(a.status)}</span>
            ${a.route ? `<a href="${esc(a.route)}" class="btn small">Đi tới phân hệ →</a>` : ''}
          </div>
        </article>`;
        })
        .join('') || '<div class="notice">Không tìm thấy thông báo phù hợp.</div>';

    $$('[data-ann-idx]', hostEl).forEach((btn) => {
      btn.onclick = () => openAnnouncementModal(list[Number(btn.dataset.annIdx)]);
    });
  };

  $('#ann-q', hostEl).oninput = draw;
  $('#ann-type', hostEl).onchange = draw;
  draw();
}
