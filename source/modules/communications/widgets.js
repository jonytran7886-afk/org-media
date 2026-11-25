'use strict';

import {
  $,
  $$,
  esc,
  fmt,
  norm,
  getNow,
  dayStart,
  parseIsoDate,
  fmtDateVi,
  daysBetween,
  csv,
  toast,
  copyText,
  exportFile,
} from '../../shared/utils.js';
import {
  data,
  dashboard,
  state,
  save,
  saveLocal,
  fb,
  short,
  groups,
  statuses,
  getProject,
  getProjectProgress,
  computeCampaignActual,
  stats,
  dirtyProjects,
  savedProjects,
  updateRowSaveButton,
  scheduleRowSave,
  persistProject,
  syncPreferencesSoon,
  renderCloudBar,
  registerRemoteSyncHooks,
} from '../../shared/data-service.js';
import { ensureRoadmapOverlay, openCampaignModal, setTrackerJumpHandler } from '../../shared/modals.js';

let upcomingWindowDays = 7;
let trackerFocusId = '';

export function setUpcomingWindowDays(days) {
  upcomingWindowDays = days;
}

export function getCurrentMonthIdx(now) {
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  if (y === 2026 && m === 12) return 0;
  if (y === 2027) return m;
  return -1;
}

export function focusTrackerRow(projectId) {
  if (!projectId) return;
  requestAnimationFrame(() => {
    const tr = $(`tr[data-id="${projectId}"]`);
    if (tr) {
      tr.scrollIntoView({ block: 'center', behavior: 'smooth' });
      tr.classList.add('tracker-row-focus');
      setTimeout(() => tr.classList.remove('tracker-row-focus'), 2500);
    }
  });
}

export function openTrackerForProject(projectId) {
  trackerFocusId = projectId;
  if (location.hash === '#tracker' || location.hash === '#departments/truyen-thong/projects') {
    drawProjects();
    focusTrackerRow(projectId);
    trackerFocusId = '';
  } else {
    location.hash = '#tracker';
  }
}

setTrackerJumpHandler(openTrackerForProject);

export function renderRoadmaps() {
  const containers = $$('[data-roadmap]');
  if (!containers.length) return;
  const { tt } = ensureRoadmapOverlay();
  const now = getNow();
  const curIdx = getCurrentMonthIdx(now);
  const months = data.roadmapMonths || [];
  const tracks = [...(data.campaigns || []), ...(data.ongoingTrack ? [data.ongoingTrack] : [])];
  const nowPhase =
    curIdx < 0
      ? 'Tiền ra mắt (11/2026)'
      : curIdx === 0
      ? 'Tiền ra mắt (12/2026)'
      : `Tháng ${months[curIdx].label} (${months[curIdx].quarter})`;

  const html = `
    <div class="roadmap-toolbar">
      <div class="roadmap-legend" aria-label="Chú giải giai đoạn">
        <span class="legend-item"><i class="legend-swatch sw-prep"></i>Chuẩn bị / Tiền ra mắt</span>
        <span class="legend-item"><i class="legend-swatch sw-launch"></i>Ra mắt chính thức (01/2027)</span>
        <span class="legend-item"><i class="legend-swatch sw-peak"></i>Cao điểm Tết (01–02/2027)</span>
        <span class="legend-item"><i class="legend-swatch sw-sales"></i>Hỗ trợ bán hàng thường xuyên (C08)</span>
        <span class="legend-item"><i class="legend-swatch sw-maintain"></i>Củng cố niềm tin & Duy trì</span>
        <span class="legend-item"><i class="legend-swatch sw-planned"></i>Theo tiến độ thực tế</span>
      </div>
      <div class="roadmap-now-chip" title="Mốc thời gian hiện tại của hệ thống">Hiện tại: ${esc(fmtDateVi(now))} · ${esc(nowPhase)}</div>
    </div>
    <div class="roadmap-scroll">
      <div class="roadmap-grid">
        <div class="rm-row rm-head-q">
          <div>Chiến dịch / Chương trình (nhấn để xem chi tiết)</div>
          <div style="grid-column:2 / span 1">Tiền ra mắt</div>
          <div style="grid-column:3 / span 3">Q1/2027 · Ra mắt & Tết</div>
          <div style="grid-column:6 / span 3">Q2/2027 · Niềm tin & Danh mục</div>
          <div style="grid-column:9 / span 3">Q3/2027 · Thị trường & Hệ sinh thái</div>
          <div style="grid-column:12 / span 3">Q4/2027 · Tích hợp & Tổng kết</div>
        </div>
        <div class="rm-row rm-head-m">
          <div>Mốc kế hoạch & Trạng thái thực tế</div>
          ${months
            .map((m) => {
              const cls = [m.idx === 1 ? 'col-launch' : '', m.idx === curIdx ? 'col-now' : ''].filter(Boolean).join(' ');
              return `<div class="${cls}">${esc(m.short)}${m.milestone ? `<span class="rm-milestone-tag">${esc(m.milestone)}</span>` : ''}</div>`;
            })
            .join('')}
        </div>
        ${tracks
          .map((tr, idx) => {
            const actual = computeCampaignActual(tr);
            const sDate = parseIsoDate(tr.startIso);
            const diffDays = sDate ? daysBetween(now, sDate) : null;
            const isUpcoming = diffDays !== null && diffDays >= 0 && diffDays <= 45;
            const isOngoingRow = tr.id === 'C08-SALES';
            const bgCells = months
              .map((m) => `<span class="${[m.idx === 1 ? 'col-launch' : '', m.idx === curIdx ? 'col-now' : ''].filter(Boolean).join(' ')}"></span>`)
              .join('');
            const barsHtml = (tr.segments || [])
              .map((seg) => {
                const colStart = seg.startMonth + 1;
                const span = seg.endMonth - seg.startMonth + 1;
                const barText =
                  seg.phase === 'launch'
                    ? 'Mở bán 01/2027'
                    : seg.phase === 'peak'
                    ? 'Cao điểm Tết'
                    : seg.phase === 'sales'
                    ? 'Bán hàng C08'
                    : seg.phase === 'prep'
                    ? 'Chuẩn bị'
                    : '';
                return `<button type="button" class="rm-bar phase-${esc(seg.phase)}" style="grid-column:${colStart}/span ${span}" data-track-idx="${idx}" data-seg-label="${esc(
                  seg.label
                )}" aria-label="${esc(tr.name)}: ${esc(seg.label)}">${esc(barText)}</button>`;
              })
              .join('');
            return `
              <div class="rm-row rm-item ${isOngoingRow ? 'rm-ongoing' : ''}">
                <div class="rm-label">
                  <button type="button" class="rm-title-btn" data-open-track="${idx}">
                    <span class="camp-badge">${esc(tr.code || tr.id)}</span>
                    <span>${esc(tr.name)}</span>
                    ${isUpcoming ? '<span class="upcoming-badge">Sắp tới</span>' : ''}
                  </button>
                  <div class="rm-meta">
                    <span>${esc(tr.focus)}</span>
                    <span>·</span>
                    <span class="rm-status-chip ${actual.cls}" title="Dữ liệu thực tế từ Tracker">${esc(actual.label)}</span>
                  </div>
                </div>
                <div class="rm-cells">
                  <div class="rm-cell-bg">${bgCells}</div>
                  ${barsHtml}
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    </div>
    <p class="muted roadmap-hint" style="margin-top:8px;font-size:11px">Di chuột hoặc chạm vào thanh tiến độ để xem mục tiêu & dự án liên quan; nhấn vào tên chiến dịch để mở chi tiết đầy đủ.</p>
  `;

  containers.forEach((c) => {
    c.innerHTML = html;
    $$('[data-open-track]', c).forEach((btn) => {
      btn.onclick = () => openCampaignModal(tracks[Number(btn.dataset.openTrack)]);
    });
    $$('.rm-bar', c).forEach((bar) => {
      const tr = tracks[Number(bar.dataset.trackIdx)];
      const actual = computeCampaignActual(tr);
      const showTip = (ev) => {
        tt.innerHTML = `
          <strong>${esc(tr.code || tr.id)} · ${esc(tr.name)}</strong>
          <div class="tt-row"><b>Thời gian:</b> ${esc(tr.timing)}</div>
          <div class="tt-row"><b>Pha này:</b> ${esc(bar.dataset.segLabel)}</div>
          <div class="tt-row"><b>Mục tiêu:</b> ${esc(tr.goal)}</div>
          <div class="tt-row"><b>Kế hoạch:</b> ${esc(tr.plannedStatus)}</div>
          <div class="tt-row"><b>Thực tế (Tracker):</b> ${esc(actual.label)}</div>
          <div class="tt-row"><b>Dự án liên kết:</b> ${esc((tr.relatedProjects || []).join(', '))}</div>
        `;
        tt.classList.add('open');
        const rect = bar.getBoundingClientRect();
        const x = ev && ev.clientX ? ev.clientX : rect.left + rect.width / 2;
        const y = ev && ev.clientY ? ev.clientY : rect.top;
        const left = Math.min(window.innerWidth - 355, Math.max(12, x + 12));
        const top = Math.min(window.innerHeight - 190, Math.max(12, y + 14));
        tt.style.left = left + 'px';
        tt.style.top = top + 'px';
      };
      bar.addEventListener('mouseenter', showTip);
      bar.addEventListener('mousemove', showTip);
      bar.addEventListener('focus', () => showTip());
      bar.addEventListener('mouseleave', () => tt.classList.remove('open'));
      bar.addEventListener('blur', () => tt.classList.remove('open'));
      bar.addEventListener('click', () => {
        tt.classList.remove('open');
        openCampaignModal(tr);
      });
    });
  });
}

export function collectUpcomingItems(days) {
  const now = dayStart(getNow());
  const items = [];
  data.projects.forEach((p) => {
    const rec = getProject(p.id);
    if (rec.status === 'Hoàn thành') return;
    const dl = parseIsoDate(p.deadlineIso);
    const st = parseIsoDate(p.startIso);
    if (dl) {
      const diff = daysBetween(now, dl);
      if (diff >= 0 && diff <= days) {
        items.push({
          kind: 'project',
          id: p.id,
          title: p.name,
          dateObj: dl,
          dateText: `Hạn: ${p.deadline}`,
          diff,
          preLaunch: p.preLaunchRequired,
          status: rec.status,
          sub: `${p.relatedCampaign} · Phụ trách: ${rec.owner || p.defaultOwner}`,
        });
        return;
      }
    }
    if (st) {
      const diff = daysBetween(now, st);
      if (diff >= 0 && diff <= days) {
        items.push({
          kind: 'project',
          id: p.id,
          title: p.name,
          dateObj: st,
          dateText: `Bắt đầu: ${p.startDate}`,
          diff,
          preLaunch: p.preLaunchRequired,
          status: rec.status,
          sub: `${p.relatedCampaign} · Phụ trách: ${rec.owner || p.defaultOwner}`,
        });
      }
    }
  });
  [...(data.campaigns || []), ...(data.ongoingTrack ? [data.ongoingTrack] : [])].forEach((c) => {
    const st = parseIsoDate(c.startIso);
    if (!st) return;
    const diff = daysBetween(now, st);
    if (diff >= 0 && diff <= days) {
      const actual = computeCampaignActual(c);
      items.push({
        kind: 'campaign',
        id: c.code || c.id,
        track: c,
        title: c.name,
        dateObj: st,
        dateText: `Khởi động: ${fmtDateVi(st)}`,
        diff,
        preLaunch: c.id === 'CAM-02' || c.id === 'CAM-03',
        status: actual.label,
        sub: c.timing,
      });
    }
  });
  return items.sort((a, b) => a.diff - b.diff || Number(b.preLaunch) - Number(a.preLaunch) || a.id.localeCompare(b.id));
}

export function renderUpcomingPanel(targetSelector = '#dash-upcoming', limit = 8) {
  const hosts = $$(targetSelector);
  if (!hosts.length) return;
  const counts = {
    7: collectUpcomingItems(7).length,
    15: collectUpcomingItems(15).length,
    30: collectUpcomingItems(30).length,
  };
  const list = collectUpcomingItems(upcomingWindowDays);
  hosts.forEach((host) => {
    host.innerHTML = `
      <div class="upcoming-tabs" role="tablist" aria-label="Khoảng thời gian sắp tới">
        ${[7, 15, 30]
          .map(
            (d) =>
              `<button type="button" class="upcoming-tab ${upcomingWindowDays === d ? 'active' : ''}" data-up-days="${d}">${d} ngày tới (${counts[d]})</button>`
          )
          .join('')}
      </div>
      <div class="upcoming-list">
        ${
          list
            .slice(0, limit)
            .map(
              (item) => `
          <div class="upcoming-item" data-up-kind="${item.kind}" data-up-id="${esc(item.id)}" role="button" tabindex="0">
            <div class="upcoming-item-main">
              <div class="upcoming-item-title">
                <span class="camp-badge">${esc(item.id)}</span>
                <span>${esc(item.title)}</span>
                ${item.preLaunch ? '<span class="req-badge">Bắt buộc trước mở bán</span>' : ''}
              </div>
              <div class="upcoming-item-meta">
                <span>${esc(item.dateText)}</span>
                <span>·</span>
                <span>${esc(item.sub)}</span>
              </div>
            </div>
            <div class="upcoming-item-side">
              <span class="upcoming-due">${item.diff === 0 ? 'Hôm nay' : `Còn ${item.diff} ngày`}</span>
              <span class="rm-status-chip">${esc(item.status)}</span>
            </div>
          </div>
        `
            )
            .join('') ||
          `<div class="notice">Không có mốc khởi động hoặc deadline mới trong ${upcomingWindowDays} ngày tới tính từ ${esc(
            fmtDateVi(getNow())
          )}. Hãy chuyển sang mốc 15/30 ngày hoặc mở Master Project Tracker.</div>`
        }
      </div>
      ${
        list.length > limit
          ? `<p class="muted" style="margin-top:8px;font-size:11px">Hiển thị ${limit}/${list.length} đầu việc gần nhất trong ${upcomingWindowDays} ngày tới. <a href="#tracker" class="textlink">Xem đầy đủ trong Tracker →</a></p>`
          : ''
      }
    `;
    $$('[data-up-days]', host).forEach((btn) => {
      btn.onclick = () => {
        upcomingWindowDays = Number(btn.dataset.upDays);
        renderUpcomingPanel(targetSelector, limit);
      };
    });
    $$('.upcoming-item', host).forEach((el) => {
      const activate = () => {
        if (el.dataset.upKind === 'project') openTrackerForProject(el.dataset.upId);
        else {
          const tr = [...(data.campaigns || []), ...(data.ongoingTrack ? [data.ongoingTrack] : [])].find(
            (x) => (x.code || x.id) === el.dataset.upId
          );
          if (tr) openCampaignModal(tr);
        }
      };
      el.onclick = activate;
      el.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
      };
    });
  });
}

export function updateTasks() {
  const total = data.priorities ? data.priorities.length : 20;
  const reqIndices = (data.priorities || []).map((p, i) => (p.preLaunchRequired ? i : -1)).filter((i) => i >= 0);
  const n = Object.values(state.tasks).filter(Boolean).length;
  const reqDone = reqIndices.filter((i) => Boolean(state.tasks[String(i)])).length;
  $$('[data-checkcount]').forEach((e) => (e.textContent = `${n}/${total}`));
  $$('[data-prelaunchcount]').forEach((e) => (e.textContent = `${reqDone}/${reqIndices.length} nhiệm vụ bắt buộc trước mở bán`));
  $$('[data-checkbar]').forEach((e) => (e.style.width = (n / total) * 100 + '%'));
}

export function bindTasks() {
  $$('[data-task]').forEach((el) => {
    el.checked = !!state.tasks[el.dataset.task];
    el.onchange = () => {
      state.tasks[el.dataset.task] = el.checked;
      save();
      updateTasks();
      syncPreferencesSoon();
    };
  });
  $$('[data-copytasks]').forEach(
    (b) =>
      (b.onclick = () =>
        copyText(
          $$('[data-task]')
            .map((el) => `${el.checked ? '[x]' : '[ ]'} ${el.nextElementSibling.innerText.replace(/\n/g, ' – ')}`)
            .join('\n')
        ))
  );
  updateTasks();
}

export function bindBudget() {
  $$('[data-budget]').forEach((el) => {
    el.innerHTML = `<div class="notice">Mô phỏng tương tác — giữ nguyên tổng ngân sách tham chiếu của chiến lược (Phương án B: 3.000 triệu/năm). Ngân sách chuẩn bị tiền ra mắt 11–12/2026 lập dự toán phê duyệt riêng.</div><div class="budget-controls"><label class="field">Tổng ngân sách năm (triệu đồng)<input type="number" data-budget-total min="0" step="100" value="${esc(
      state.budget
    )}"></label>${[1800, 3000, 4800]
      .map((v) => `<button class="btn small" data-scenario="${v}">${fmt(v / 1000)} tỷ</button>`)
      .join('')}<button class="btn small" data-resetbudget>Về mặc định</button></div><div>${data.budgetnames
      .map(
        (n, i) =>
          `<div class="budget-row"><label for="weight-${i}">${esc(
            n
          )}</label><input type="range" data-range="${i}" aria-label="Tỷ trọng ${esc(
            n
          )}" min="0" max="60" step="1" value="${state.weights[i]}"><input id="weight-${i}" type="number" data-weight="${i}" aria-label="Phần trăm ${esc(
            n
          )}" min="0" max="60" value="${state.weights[i]}"><span class="money" data-money="${i}"></span></div>`
      )
      .join('')}</div><div class="budget-total" data-summary></div><button class="btn" data-copybudget>Sao chép dự toán</button> <button class="btn" data-exportbudget>Xuất CSV</button>`;
    function refresh() {
      const total = state.weights.reduce((a, b) => a + Number(b), 0);
      const amount = Number(state.budget) || 0;
      $$('[data-money]', el).forEach((e, i) => (e.textContent = fmt((amount * state.weights[i]) / 100) + ' tr'));
      const s = $('[data-summary]', el);
      s.classList.toggle('warn', total !== 100);
      s.innerHTML = `<span>Tổng tỷ trọng <strong>${total}%</strong></span><span>Đã phân bổ <strong>${fmt(
        (amount * total) / 100
      )} tr/năm</strong></span><span>Bình quân <strong>${fmt((amount * total) / 1200)} tr/tháng</strong></span>${
        total !== 100 ? '<small>Cần điều chỉnh tổng tỷ trọng về 100%.</small>' : ''
      }`;
      $$('[data-scenario]', el).forEach((b) => b.classList.toggle('primary', Number(b.dataset.scenario) === amount));
    }
    function update(i, v) {
      state.weights[i] = Math.min(60, Math.max(0, Math.round(Number(v) || 0)));
      $(`[data-range="${i}"]`, el).value = state.weights[i];
      $(`[data-weight="${i}"]`, el).value = state.weights[i];
      save();
      syncPreferencesSoon();
      refresh();
    }
    $('[data-budget-total]', el).oninput = (e) => {
      state.budget = Math.max(0, Number(e.target.value) || 0);
      save();
      syncPreferencesSoon();
      refresh();
    };
    $$('[data-range]', el).forEach((e) => (e.oninput = () => update(Number(e.dataset.range), e.value)));
    $$('[data-weight]', el).forEach((e) => (e.oninput = () => update(Number(e.dataset.weight), e.value)));
    $$('[data-scenario]', el).forEach(
      (b) =>
        (b.onclick = () => {
          state.budget = Number(b.dataset.scenario);
          $('[data-budget-total]', el).value = state.budget;
          save();
          syncPreferencesSoon();
          refresh();
        })
    );
    $('[data-resetbudget]', el).onclick = () => {
      state.budget = 3000;
      state.weights = [...data.weights];
      save();
      syncPreferencesSoon();
      bindBudget();
    };
    $('[data-copybudget]', el).onclick = () =>
      copyText(
        'DỰ TOÁN NGÂN SÁCH TRUYỀN THÔNG 2027 (V2.1)\nTổng ngân sách: ' +
          fmt(state.budget) +
          ' triệu đồng\n' +
          data.budgetnames.map((n, i) => `${n}: ${state.weights[i]}% – ${fmt((state.budget * state.weights[i]) / 100)} triệu đồng`).join('\n') +
          '\nTổng tỷ trọng: ' +
          state.weights.reduce((a, b) => a + b, 0) +
          '%'
      );
    $('[data-exportbudget]', el).onclick = () =>
      exportFile(
        'OrganicVN-Ngan-sach-2027-V2.1.csv',
        csv([
          ['Hạng mục', 'Tỷ trọng (%)', 'Ngân sách (triệu đồng)'],
          ...data.budgetnames.map((n, i) => [n, state.weights[i], (state.budget * state.weights[i]) / 100]),
        ]),
        'text/csv;charset=utf-8'
      );
    refresh();
  });
}

export function bindWidgets() {
  bindTasks();
  bindBudget();
  renderRoadmaps();
}

export function updateTrackerStatsOnly() {
  const el = $('#tracker-stats');
  if (!el) return;
  const c = stats();
  const preList = data.projects.filter((p) => p.preLaunchRequired);
  const preDone = preList.filter((p) => getProject(p.id).status === 'Hoàn thành').length;
  el.innerHTML =
    statuses.map((s) => `<div class="tile"><strong>${c[s] || 0}</strong><small>${s}</small></div>`).join('') +
    `<div class="tile" style="border-color:#ebc7b7;background:#fff8f5"><strong style="color:#9b3b1e">${preDone}/${preList.length}</strong><small>Xong trước mở bán (T0)</small></div>`;
}

export function updateDash() {
  const el = $('#dash-progress');
  const totalProj = data.projects.length;
  const preTotal = data.projects.filter((p) => p.preLaunchRequired).length;
  const preDone = data.projects.filter((p) => p.preLaunchRequired && getProject(p.id).status === 'Hoàn thành').length;
  const totalTasks = data.priorities ? data.priorities.length : 20;
  if (el) {
    const c = stats();
    const done = c['Hoàn thành'] || 0;
    const tc = Object.values(state.tasks).filter(Boolean).length;
    el.innerHTML = `<div class="progresssummary"><div class="tile"><strong>${done}/${totalProj}</strong><small>Dự án hoàn thành</small></div><div class="tile"><strong>${preDone}/${preTotal}</strong><small>Xong trước mở bán</small></div><div class="tile"><strong>${tc}/${totalTasks}</strong><small>Nhiệm vụ cấp thiết</small></div></div><div class="track"><span style="width:${
      (done / totalProj) * 100
    }%"></span></div><p class="muted" style="margin-top:8px">${c['Đang thực hiện'] || 0} dự án đang thực hiện · ${
      c['Chưa cập nhật'] || 0
    } dự án chưa nhập trạng thái.</p>`;
  }
  renderUpcomingPanel('#dash-upcoming', 8);
  renderRoadmaps();
}

function quarterMatch(p, q) {
  if (!q) return true;
  const s = p.schedule || '';
  if (q === '11-12/2026')
    return (
      (p.startIso && p.startIso.startsWith('2026-')) ||
      (p.deadlineIso && p.deadlineIso.startsWith('2026-')) ||
      s.includes('11/2026') ||
      s.includes('12/2026')
    );
  if (q === '01/2027') return s.includes('01/2027') || (p.deadlineIso && p.deadlineIso.startsWith('2027-01'));
  if (/^Q\d$/.test(q)) {
    if (s.includes('Xuyên suốt') || s.includes('01–12/2027')) return true;
    if (q === 'Q1' && (s.includes('01/2027') || s.includes('03/2027') || s.includes('Q1'))) return true;
    const m = [...s.matchAll(/Q([1-4])/g)].map((x) => +x[1]);
    const k = +q[1];
    return m.length && k >= m[0] && k <= m[m.length - 1];
  }
  return s.toLowerCase().includes(q.toLowerCase());
}

export function drawProjects() {
  if (!$('#project-rows')) return;
  updateTrackerStatsOnly();
  const q = norm($('#pq').value);
  const g = $('#pg').value;
  const p = $('#pp').value;
  const t = $('#pt').value;
  const r = $('#pr').value;
  const c = $('#pc').value;
  const s = $('#ps').value;
  const list = data.projects.filter((x) => {
    const v = getProject(x.id);
    const hay = norm([x.id, x.name, x.deliverable, x.dependencies, x.relatedCampaign, x.defaultOwner, v.owner, v.note].join(' '));
    return (
      (!q || hay.includes(q)) &&
      (!g || x.id.startsWith(g)) &&
      (!p || x.priority === p) &&
      quarterMatch(x, t) &&
      (!r || (r === 'req' ? x.preLaunchRequired : !x.preLaunchRequired)) &&
      (!c || (x.relatedCampaign || '').includes(c)) &&
      (!s || v.status === s)
    );
  });
  $('#tracker-count').textContent = `Hiển thị ${list.length}/${data.projects.length} dự án`;
  $('#project-rows').innerHTML =
    list
      .map((x) => {
        const v = getProject(x.id);
        const prog = getProjectProgress(v.status);
        const isDirty = dirtyProjects.has(x.id);
        const isSaved = !isDirty && (savedProjects.has(x.id) || v.status !== statuses[0] || Boolean(v.owner) || Boolean(v.note));
        const btnCls = isDirty ? 'dirty' : isSaved ? 'saved' : '';
        const btnTxt = isDirty ? 'Lưu' : isSaved ? 'Đã lưu ✓' : 'Lưu';
        return `<tr data-id="${x.id}"><td data-label="Mã"><a class="textlink" href="#p10/project-${x.id}">${x.id}</a></td><td data-label="Dự án" class="tracker-project-cell"><strong>${esc(
          x.name
        )}</strong><div class="tracker-deliverable"><b>Bàn giao:</b> ${esc(x.deliverable)}</div><div class="tracker-submeta"><span class="${
          x.preLaunchRequired ? 'req-badge' : 'opt-badge'
        }">${esc(x.launchReadiness)}</span><span class="camp-badge">${esc(x.relatedCampaign)}</span><span>Phụ thuộc: ${esc(
          x.dependencies
        )}</span></div></td><td data-label="Ưu tiên"><span class="priority ${x.priority.toLowerCase()}">${
          x.priority
        }</span></td><td data-label="Thời gian" class="tracker-dates"><div>BĐ: ${esc(x.startDate)}</div><div><b>Hạn: ${esc(
          x.deadline
        )}</b></div><div class="muted">${esc(x.schedule)}</div></td><td data-label="Tiến độ" class="tracker-prog"><strong>${esc(
          prog.label
        )}</strong><div class="tracker-prog-bar"><span style="width:${prog.pct}%"></span></div></td><td data-label="Trạng thái"><select data-field="status" aria-label="Trạng thái ${x.id}">${statuses
          .map((st) => `<option ${st === v.status ? 'selected' : ''}>${esc(st)}</option>`)
          .join('')}</select></td><td data-label="Phụ trách"><input data-field="owner" type="text" value="${esc(
          v.owner || ''
        )}" placeholder="Đề xuất: ${esc(x.defaultOwner)}" title="Đề xuất: ${esc(x.defaultOwner)}" aria-label="Phụ trách ${
          x.id
        }"></td><td data-label="Ghi chú"><input data-field="note" type="text" value="${esc(
          v.note || ''
        )}" placeholder="Ghi chú" aria-label="Ghi chú ${
          x.id
        }"></td><td data-label="Cập nhật"><button type="button" class="btn small save-row-btn ${btnCls}" data-save="${x.id}">${btnTxt}</button></td></tr>`;
      })
      .join('') || '<tr><td colspan="9">Không tìm thấy dự án phù hợp.</td></tr>';

  $$('[data-field]', $('#project-rows')).forEach((e) => {
    e.addEventListener(e.tagName === 'SELECT' ? 'change' : 'input', () => {
      const id = e.closest('tr').dataset.id;
      state.projects[id] = { ...getProject(id), [e.dataset.field]: e.value };
      saveLocal();
      if (e.tagName === 'SELECT') {
        dirtyProjects.add(id);
        drawProjects();
        persistProject(id, true);
      } else {
        dirtyProjects.add(id);
        savedProjects.delete(id);
        updateRowSaveButton(id);
        scheduleRowSave(id);
      }
    });
    if (e.tagName === 'INPUT') {
      e.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          const id = e.closest('tr').dataset.id;
          persistProject(id, true);
        }
      });
    }
  });
  $$('[data-save]', $('#project-rows')).forEach((b) => {
    b.onclick = () => persistProject(b.dataset.save, true);
  });
}

export function renderTrackerPanel(hostEl) {
  hostEl.innerHTML = `<section class="panel"><div id="cloud-sync-bar" class="cloud-bar offline"></div><div class="statusbar" id="tracker-stats"></div><div class="filters"><label class="field searchfield">Tìm dự án<input id="pq" type="search" placeholder="Mã, tên, sản phẩm bàn giao, phụ trách…"></label><label class="field">Nhóm<select id="pg"><option value="">Tất cả nhóm</option>${groups
    .map((g, i) => `<option value="${'ABCDEF'[i]}">${esc(g)}</option>`)
    .join('')}</select></label><label class="field">Ưu tiên<select id="pp"><option value="">Tất cả</option><option>P1</option><option>P2</option><option>P3</option></select></label><label class="field">Kỳ kế hoạch<select id="pt"><option value="">Tất cả</option><option value="11-12/2026">Tiền ra mắt (11–12/2026)</option><option value="01/2027">Mở bán (01/2027)</option><option>Q1</option><option>Q2</option><option>Q3</option><option>Q4</option><option>Theo tiến độ</option><option>Xuyên suốt</option></select></label><label class="field">Sẵn sàng mở bán<select id="pr"><option value="">Tất cả</option><option value="req">Bắt buộc trước mở bán</option><option value="post">Giai đoạn sau / theo tiến độ</option></select></label><label class="field">Chiến dịch<select id="pc"><option value="">Tất cả chiến dịch</option>${(
    data.campaigns || []
  )
    .map((c) => `<option value="${esc(c.id)}">${esc(c.id)}</option>`)
    .join('')}</select></label><label class="field">Trạng thái<select id="ps"><option value="">Tất cả</option>${statuses
    .map((s) => `<option>${esc(s)}</option>`)
    .join('')}</select></label></div><div class="panel-head"><span id="tracker-count" class="muted"></span><div><button id="exportcsv" class="btn small">Xuất CSV</button> <button id="backup" class="btn small">Sao lưu JSON</button> <button id="restore" class="btn small">Khôi phục</button><input type="file" accept="application/json,.json" id="restorefile" hidden></div></div><div class="table-scroll"><table class="tracker-table"><thead><tr><th>Mã</th><th>Dự án · Bàn giao · Phụ thuộc · Chiến dịch</th><th>Ưu tiên</th><th>Thời gian (Bắt đầu → Deadline)</th><th>Tiến độ</th><th>Trạng thái</th><th>Phụ trách</th><th>Ghi chú</th><th>Cập nhật</th></tr></thead><tbody id="project-rows"></tbody></table></div></section>`;
  renderCloudBar();
  ['pq', 'pg', 'pp', 'pt', 'pr', 'pc', 'ps'].forEach((id) => $('#' + id).addEventListener(id === 'pq' ? 'input' : 'change', drawProjects));
  $('#exportcsv').onclick = () =>
    exportFile(
      'OrganicVN-Master-Project-2027-V2.1.csv',
      csv([
        [
          'Mã',
          'Dự án',
          'Ưu tiên',
          'Ngày bắt đầu',
          'Deadline',
          'Kỳ kế hoạch',
          'Tiến độ (%)',
          'Trạng thái',
          'Phụ trách (người dùng)',
          'Phụ trách đề xuất',
          'Sản phẩm bàn giao',
          'Phụ thuộc',
          'Chiến dịch liên quan',
          'Sẵn sàng mở bán',
          'Ghi chú',
        ],
        ...data.projects.map((p) => {
          const v = getProject(p.id);
          const prog = getProjectProgress(v.status);
          return [
            p.id,
            p.name,
            p.priority,
            p.startDate,
            p.deadline,
            p.schedule,
            prog.label,
            v.status,
            v.owner,
            p.defaultOwner,
            p.deliverable,
            p.dependencies,
            p.relatedCampaign,
            p.launchReadiness,
            v.note,
          ];
        }),
      ]),
      'text/csv;charset=utf-8'
    );
  $('#backup').onclick = () =>
    exportFile('OrganicVN-2027-backup.json', JSON.stringify({ version: 2, state }, null, 2), 'application/json');
  $('#restore').onclick = () => $('#restorefile').click();
  $('#restorefile').onchange = async (e) => {
    try {
      const x = JSON.parse(await e.target.files[0].text());
      if (
        x.version !== 2 ||
        !x.state ||
        typeof x.state.projects !== 'object' ||
        !Array.isArray(x.state.weights) ||
        x.state.weights.length !== 8 ||
        !x.state.weights.every((v) => typeof v === 'number' && v >= 0 && v <= 60)
      ) {
        throw Error();
      }
      if (!confirm('Khôi phục bản sao lưu sẽ thay thế dữ liệu theo dõi hiện tại. Tiếp tục?')) return;
      const s = x.state;
      state.tasks = {};
      state.projects = {};
      state.budget = Math.max(0, Number(s.budget) || 0);
      state.weights = s.weights;
      for (let i = 0; i < 20; i++) state.tasks[i] = !!s.tasks?.[i];
      data.projects.forEach((p) => {
        const r = s.projects[p.id];
        if (r) {
          state.projects[p.id] = {
            status: statuses.includes(r.status) ? r.status : statuses[0],
            owner: String(r.owner || ''),
            note: String(r.note || ''),
          };
        }
      });
      save();
      if (fb && fb.getSyncState().user) {
        const entries = Object.entries(state.projects);
        if (entries.length) await fb.saveProjectsBatch(entries);
        await fb.savePreferences({ budget: state.budget, weights: state.weights, tasks: state.tasks });
      }
      drawProjects();
      toast('Đã khôi phục dữ liệu.');
    } catch {
      toast('Tệp sao lưu không hợp lệ.');
    }
    e.target.value = '';
  };
  drawProjects();
  if (trackerFocusId) {
    focusTrackerRow(trackerFocusId);
    trackerFocusId = '';
  }
}

export function renderTrackerPage(hostEl) {
  const totalProj = data.projects.length;
  hostEl.innerHTML = `<div class="pageheader"><div><div class="eyebrow">PHÒNG TRUYỀN THÔNG · MASTER PORTFOLIO · V2.1</div><h1>Master Project Tracker</h1><p>${totalProj} dự án · 6 nhóm · Đủ 10 trường điều hành phục vụ mở bán 01/2027.</p></div><div class="pageheader-actions"><a class="btn" href="#departments/truyen-thong">Không gian Truyền thông</a><a class="btn" href="#p10/m43">Danh mục gốc →</a></div></div><div id="tracker-host"></div>`;
  renderTrackerPanel($('#tracker-host', hostEl));
}

export function renderCommDashboard(hostEl) {
  hostEl.innerHTML = dashboard;
  updateDash();
  renderCloudBar();
}

export function renderAllStrategyDoc(hostEl) {
  const verShort = data.versionMeta?.shortVersion || 'V2.1 · Chờ phê duyệt';
  hostEl.innerHTML = `<div class="pageheader"><div><div class="eyebrow">PHÒNG TRUYỀN THÔNG · DOCUMENT LIBRARY · ${esc(
    verShort.toUpperCase()
  )}</div><h1>Chiến lược truyền thông tổng thể 2027</h1><p>12 phần · 50 mục · Phụ lục · <span class="version-pill">${esc(
    data.versionMeta?.version || 'V2.1'
  )} (${esc(
    data.versionMeta?.status || 'Chờ phê duyệt'
  )})</span> · <a href="toan-van.html" class="textlink">Đối chiếu bản gốc V2.0 Final ↗</a></p></div><div class="pageheader-actions"><a class="btn" href="#departments/truyen-thong">← Không gian Truyền thông</a><button class="btn primary" onclick="window.print()">Tải tài liệu PDF</button></div></div><article class="article"><div class="introdoc">${
    data.intro
  }</div>${data.sections
    .map((s) => `<section class="docpart" id="part-${s.p}"><h1 class="part-title">${esc(s.title)}</h1>${s.html}</section>`)
    .join('')}</article>`;
  bindWidgets();
}

export function renderChapterView(hostEl, n) {
  const s = data.sections[n - 1];
  const verShort = data.versionMeta?.shortVersion || 'V2.1 · Chờ phê duyệt';
  const pt = s.title.split('. ').slice(1).join('. ');
  hostEl.innerHTML = `<div class="pageheader"><div><div class="eyebrow">PHÒNG TRUYỀN THÔNG · ${
    n === 13 ? 'APPENDIX' : 'CHAPTER ' + String(n).padStart(2, '0') + ' / 12'
  } · ${esc(verShort.toUpperCase())}</div><h1>${esc(pt.charAt(0) + pt.slice(1).toLowerCase())}</h1><p>${
    s.headings.filter((h) => h.level === 2).length
      ? s.headings.filter((h) => h.level === 2).length + ' mục chiến lược · '
      : ''
  }Organic Việt Nam & ADIGO · <span class="version-pill">${esc(
    data.versionMeta?.status || 'Chờ phê duyệt'
  )}</span></p></div><div class="pageheader-actions"><a class="btn" href="#departments/truyen-thong">← Phòng Truyền thông</a><a class="btn" href="#all">Xem tài liệu V2.1</a></div></div><div class="reader-layout"><article class="article">${
    s.html
  }</article><aside class="toc"><h4>Trong chương này</h4><div class="toclinks">${
    s.headings.length
      ? s.headings
          .map((h) => `<a class="${h.level === 3 ? 'sub' : ''}" href="#p${n}/${h.id}" data-toc="${h.id}">${esc(h.title)}</a>`)
          .join('')
      : '<a href="#p13">Hệ thống tài liệu và phê duyệt</a>'
  }</div></aside></div><div class="page-nav">${
    n > 1 ? `<a class="btn" href="#p${n - 1}">← ${esc(short[n - 2])}</a>` : '<a class="btn" href="#departments/truyen-thong">← Phòng Truyền thông</a>'
  }${n < 13 ? `<a class="btn" href="#p${n + 1}">${esc(short[n])} →</a>` : '<a class="btn" href="#departments/truyen-thong">Phòng Truyền thông →</a>'}</div>`;
  bindWidgets();
}

registerRemoteSyncHooks({
  onProjectsUpdated: (remoteProjects) => {
    if ($('#dash-progress')) updateDash();
    else renderRoadmaps();
    if ($('#project-rows')) {
      const activeInTable = $('#project-rows')?.contains(document.activeElement);
      if (activeInTable) {
        updateTrackerStatsOnly();
        for (const [id, rec] of Object.entries(remoteProjects)) {
          if (dirtyProjects.has(id)) continue;
          const tr = $(`tr[data-id="${id}"]`);
          if (!tr) continue;
          const sel = $('[data-field="status"]', tr);
          const ow = $('[data-field="owner"]', tr);
          const nt = $('[data-field="note"]', tr);
          if (sel && document.activeElement !== sel) sel.value = rec.status;
          if (ow && document.activeElement !== ow) ow.value = rec.owner || '';
          if (nt && document.activeElement !== nt) nt.value = rec.note || '';
          updateRowSaveButton(id);
        }
      } else {
        drawProjects();
      }
    }
  },
  onPreferencesUpdated: () => {
    updateTasks();
    if ($('#dash-progress')) updateDash();
    if ($('#main [data-budget]')) bindBudget();
  },
});
