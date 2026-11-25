'use strict';

import { $$, esc, statusToneClass, toast } from '../../shared/utils.js';
import { portal, onboardingState, saveOnboardingLocal } from '../../shared/data-service.js';

export function renderOnboardingPage(hostEl) {
  const steps = portal.onboarding || [];
  const documents = portal.documents || [];
  const docMap = Object.fromEntries(documents.map((d) => [d.id, d]));

  const computeProgress = () => {
    const done = steps.filter((s) => Boolean(onboardingState.steps[s.id])).length;
    const pct = steps.length ? Math.round((done / steps.length) * 100) : 0;
    return { done, pct };
  };

  const initial = computeProgress();

  hostEl.innerHTML = `
    <div class="pageheader">
      <div>
        <div class="eyebrow">MODULE 03 · NEW EMPLOYEE ONBOARDING</div>
        <h1>Hội nhập nhân viên mới</h1>
        <p>Lộ trình 7 bước tìm hiểu doanh nghiệp, cơ cấu tổ chức, nội quy, chính sách, hệ sinh thái và phương thức làm việc.</p>
      </div>
      <div class="pageheader-actions">
        <a class="btn" href="#documents/required">Tài liệu cần đọc</a>
        <button type="button" class="btn" id="ob-reset-btn">Đặt lại tiến độ</button>
      </div>
    </div>

    <section class="panel">
      <div class="panel-head">
        <div>
          <div class="eyebrow">TIẾN ĐỘ HỘI NHẬP CÁ NHÂN</div>
          <h2>Hoàn thành <span id="ob-count">${initial.done}/${steps.length}</span> bước</h2>
        </div>
        <strong id="ob-pct" style="font-size:24px;color:var(--green)">${initial.pct}%</strong>
      </div>
      <div class="track" style="height:10px"><span id="ob-bar" style="width:${initial.pct}%"></span></div>
      <p class="muted" style="margin-top:8px">Đánh dấu từng bước sau khi bạn đã đọc các tài liệu liên kết từ Thư viện tài liệu trung tâm. Tiến độ được lưu trên trình duyệt của bạn.</p>
    </section>

    <div class="wp-ob-steps">
      ${steps
        .map((step) => {
          const checked = Boolean(onboardingState.steps[step.id]);
          const docsHtml = (step.documentIds || [])
            .map((id) => docMap[id])
            .filter(Boolean)
            .map(
              (d) => `
              <a class="wp-ob-doc" href="${d.readerKind === 'company-profile' ? '#about-company' : '#documents/view/' + esc(d.id)}">
                <div>
                  <div class="wp-list-meta"><code>${esc(d.documentCode)}</code> · <span>${esc(d.fileType || 'Tài liệu')}</span></div>
                  <strong>${esc(d.title)}</strong>
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex:none">
                  <span class="wp-status-tag ${statusToneClass(d.status)}">${esc(d.status)}</span>
                  <span class="textlink">${d.status === 'Chưa cập nhật' ? 'Chi tiết →' : 'Đọc tài liệu →'}</span>
                </div>
              </a>`
            )
            .join('');

          return `
        <section class="panel wp-ob-card ${checked ? 'is-done' : ''}" data-ob-card="${esc(step.id)}">
          <div class="wp-ob-head">
            <div class="wp-ob-num">BƯỚC ${esc(step.stepNumber)}</div>
            <div style="flex:1;min-width:0">
              <h2>${esc(step.title)}</h2>
              <p class="wp-ob-obj"><strong>Mục tiêu:</strong> ${esc(step.objective)}</p>
              <p class="muted">${esc(step.description)}</p>
            </div>
            <label class="wp-ob-check">
              <input type="checkbox" data-ob-step="${esc(step.id)}" ${checked ? 'checked' : ''}>
              <span>${checked ? 'Đã hoàn thành' : 'Đánh dấu đã đọc'}</span>
            </label>
          </div>

          <div class="wp-ob-body">
            <div>
              <div class="eyebrow">NỘI DUNG CẦN NẮM</div>
              <ul class="wp-clean-list">
                ${(step.topics || []).map((t) => `<li>${esc(t)}</li>`).join('')}
              </ul>
              ${
                (step.links || []).length
                  ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">${step.links
                      .map((l) => `<a class="btn small" href="${esc(l.route)}">${esc(l.label)} →</a>`)
                      .join('')}</div>`
                  : ''
              }
            </div>
            <div>
              <div class="eyebrow">TÀI LIỆU LIÊN KẾT TỪ THƯ VIỆN</div>
              <div class="wp-ob-docs">
                ${docsHtml || '<div class="notice">Chưa có tài liệu đính kèm cho bước này.</div>'}
              </div>
            </div>
          </div>
        </section>`;
        })
        .join('')}
    </div>
  `;

  const syncProgressUI = () => {
    const { done, pct } = computeProgress();
    const countEl = hostEl.querySelector('#ob-count');
    const pctEl = hostEl.querySelector('#ob-pct');
    const barEl = hostEl.querySelector('#ob-bar');
    if (countEl) countEl.textContent = `${done}/${steps.length}`;
    if (pctEl) pctEl.textContent = `${pct}%`;
    if (barEl) barEl.style.width = `${pct}%`;
  };

  $$('[data-ob-step]', hostEl).forEach((cb) => {
    cb.onchange = () => {
      const id = cb.dataset.obStep;
      onboardingState.steps[id] = cb.checked;
      saveOnboardingLocal();
      const card = cb.closest('[data-ob-card]');
      if (card) card.classList.toggle('is-done', cb.checked);
      const labelSpan = cb.nextElementSibling;
      if (labelSpan) labelSpan.textContent = cb.checked ? 'Đã hoàn thành' : 'Đánh dấu đã đọc';
      syncProgressUI();
    };
  });

  const resetBtn = hostEl.querySelector('#ob-reset-btn');
  if (resetBtn) {
    resetBtn.onclick = () => {
      onboardingState.steps = {};
      saveOnboardingLocal();
      $$('[data-ob-step]', hostEl).forEach((cb) => {
        cb.checked = false;
        cb.closest('[data-ob-card]')?.classList.remove('is-done');
        if (cb.nextElementSibling) cb.nextElementSibling.textContent = 'Đánh dấu đã đọc';
      });
      syncProgressUI();
      toast('Đã đặt lại tiến độ hội nhập.');
    };
  }
}
