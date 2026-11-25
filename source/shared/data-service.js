'use strict';

import { $, $$, esc, fmtTime, toast } from './utils.js';

export const data = JSON.parse(document.getElementById('strategy-data').textContent);
export const portal = data.portal || {};
export const dashboard = document.getElementById('dashboard-template').innerHTML;

export const KEY = 'ovn-communications-2027-v2';
export const ONBOARDING_KEY = 'ovn-workplace-onboarding-v1';

export const short = [
  'Bối cảnh & định hướng',
  'Kiến trúc hệ sinh thái',
  'Đối tượng & thị trường',
  '10 trụ cột truyền thông',
  'Nội dung & sáng tạo',
  'Lộ trình triển khai',
  'Tổ chức & quản trị',
  'Ngân sách',
  'KPI & đánh giá',
  'Danh mục dự án',
  'Điều hành Giám đốc',
  'Tổng kết chiến lược',
  'Phụ lục & phê duyệt',
];

export const groups = [
  'A · Chiến lược & quản trị',
  'B · Thương hiệu & nhận diện',
  'C · Sản phẩm & thương mại',
  'D · Digital & nội dung',
  'E · Báo chí & sự kiện',
  'F · Danh tiếng & nội bộ',
];

export const statuses = ['Chưa cập nhật', 'Chưa bắt đầu', 'Đang thực hiện', 'Hoàn thành', 'Tạm dừng'];

export let state = {
  tasks: {},
  projects: {},
  budget: 3000,
  weights: [...data.weights],
};

export let onboardingState = {
  steps: {},
};

let persisted = true;
try {
  const stored = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (stored) {
    state = { ...state, ...stored };
    if (!Array.isArray(state.weights) || state.weights.length !== 8) {
      state.weights = [...data.weights];
    }
  }
} catch {
  persisted = false;
}

try {
  const obStored = JSON.parse(localStorage.getItem(ONBOARDING_KEY) || 'null');
  if (obStored && typeof obStored.steps === 'object') {
    onboardingState = { steps: { ...obStored.steps } };
  }
} catch {
  // ignore localStorage read issues
}

export function saveLocal() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    persisted = false;
    toast('Trình duyệt không cho lưu dữ liệu cục bộ. Hãy xuất bản sao lưu.');
  }
}

export function save() {
  saveLocal();
}

export function saveOnboardingLocal() {
  try {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(onboardingState));
  } catch {
    toast('Không thể lưu tiến độ hội nhập vào trình duyệt.');
  }
}

export function isLocalPersisted() {
  return persisted;
}

export const fb = window.__ovnFirebaseTracker;
export const dirtyProjects = new Set();
export const savedProjects = new Set();
const rowSaveTimers = {};
let prefsTimer = null;

export const getProject = (id) => state.projects[id] || { status: statuses[0], owner: '', note: '' };

export function getAllProjectsUnified() {
  return (data.projects || []).map((p) => ({
    ...p,
    departmentId: 'truyen-thong',
    departmentName: 'Phòng Truyền thông',
  }));
}

export function getDepartmentById(deptId) {
  return (portal.departments || []).find((d) => d.id === deptId) || null;
}

export function getDepartmentProjectCount(dept) {
  if (!dept || dept.projectCountSource !== 'communications') return null;
  return (data.projects || []).length;
}

export function getProjectProgress(status) {
  if (status === 'Hoàn thành') return { pct: 100, label: '100%', cls: 'done' };
  if (status === 'Đang thực hiện') return { pct: 50, label: '50%', cls: 'active' };
  if (status === 'Tạm dừng') return { pct: 0, label: 'Tạm dừng', cls: 'pause' };
  if (status === 'Chưa bắt đầu') return { pct: 0, label: '0%', cls: 'idle' };
  return { pct: 0, label: '—', cls: 'idle' };
}

export function stats() {
  const counts = Object.fromEntries(statuses.map((s) => [s, 0]));
  data.projects.forEach((p) => {
    const s = getProject(p.id).status || statuses[0];
    counts[s] = (counts[s] || 0) + 1;
  });
  return counts;
}

export function computeCampaignActual(item) {
  const ids = item.relatedProjects || [];
  if (!ids.length) return { label: 'Chưa gắn dự án', cls: '' };
  const recs = ids.map((id) => getProject(id));
  const done = recs.filter((r) => r.status === 'Hoàn thành').length;
  const active = recs.filter((r) => r.status === 'Đang thực hiện').length;
  const paused = recs.filter((r) => r.status === 'Tạm dừng').length;
  const notStarted = recs.filter((r) => r.status === 'Chưa bắt đầu').length;
  if (done === ids.length) return { label: `Hoàn thành (${done}/${ids.length} dự án)`, cls: 'done' };
  if (active > 0 || done > 0) return { label: `Đang triển khai (${done} xong · ${active} đang chạy / ${ids.length})`, cls: 'active' };
  if (paused > 0) return { label: `Có dự án tạm dừng (${paused}/${ids.length})`, cls: 'pause' };
  if (notStarted > 0) return { label: `Chưa bắt đầu (${notStarted}/${ids.length})`, cls: '' };
  return { label: 'Chưa cập nhật thực tế', cls: '' };
}

export function syncPreferencesSoon() {
  if (!fb || !fb.getSyncState().user) return;
  clearTimeout(prefsTimer);
  prefsTimer = setTimeout(() => {
    fb.savePreferences({ budget: state.budget, weights: state.weights, tasks: state.tasks });
  }, 500);
}

export function updateRowSaveButton(id) {
  const btn = $(`[data-save="${id}"]`);
  if (!btn) return;
  const isDirty = dirtyProjects.has(id);
  const isSaved = savedProjects.has(id);
  btn.classList.toggle('dirty', isDirty);
  btn.classList.toggle('saved', !isDirty && isSaved);
  btn.textContent = isDirty ? 'Lưu' : isSaved ? 'Đã lưu ✓' : 'Lưu';
}

export function scheduleRowSave(id) {
  clearTimeout(rowSaveTimers[id]);
  rowSaveTimers[id] = setTimeout(() => persistProject(id, false), 800);
}

export async function persistProject(id, explicitNotify) {
  clearTimeout(rowSaveTimers[id]);
  const rec = getProject(id);
  state.projects[id] = rec;
  saveLocal();
  const user = fb?.getSyncState().user;
  if (user) {
    const btn = $(`[data-save="${id}"]`);
    if (btn) {
      btn.textContent = 'Đang lưu…';
      btn.disabled = true;
    }
    const ok = await fb.saveProject(id, rec);
    if (btn) btn.disabled = false;
    if (ok) {
      dirtyProjects.delete(id);
      savedProjects.add(id);
      updateRowSaveButton(id);
      if (explicitNotify) toast(`Đã lưu ${id} (${rec.status}) lên Cloud.`);
    } else {
      dirtyProjects.add(id);
      updateRowSaveButton(id);
    }
  } else {
    dirtyProjects.delete(id);
    savedProjects.add(id);
    updateRowSaveButton(id);
    if (explicitNotify) toast(`Đã lưu cục bộ ${id} (${rec.status}). Đăng nhập Google để lưu lên Cloud.`);
  }
}

export function renderCloudBar() {
  const bar = $('#cloud-sync-bar');
  const topAuth = $('#topbar-auth');
  const sideAuth = $('#sidebar-auth');
  const dashNote = $('#dash-sync-note');
  const dashActions = $('#dash-auth-actions');
  if (!fb) {
    if (bar) {
      bar.className = 'cloud-bar offline';
      bar.innerHTML = '<div class="cloud-info"><span class="cloud-dot"></span><span>Đang lưu cục bộ trên trình duyệt này.</span></div>';
    }
    if (topAuth) topAuth.innerHTML = '';
    if (sideAuth) {
      sideAuth.className = 'cloud-side offline';
      sideAuth.innerHTML = '<div class="cloud-side-head"><span class="cloud-dot"></span><span class="cloud-side-title">Lưu cục bộ</span></div>';
    }
    return;
  }
  const st = fb.getSyncState();
  const stateClass = st.user ? (st.syncing ? 'syncing' : 'online') : 'offline';
  const userLabel = st.user ? st.user.displayName || st.user.email || 'Tài khoản Google' : '';
  if (topAuth) {
    if (!st.user) {
      topAuth.innerHTML = '<button type="button" class="btn small primary" id="topbar-signin-btn">Đăng nhập để lưu</button>';
      $('#topbar-signin-btn', topAuth).onclick = () => fb.signIn();
    } else {
      topAuth.innerHTML = `<span class="auth-chip" title="${esc(st.user.email || userLabel)}"><span class="cloud-dot"></span><span class="auth-name">${esc(userLabel)}</span></span><button type="button" class="btn small" id="topbar-signout-btn">Đăng xuất</button>`;
      $('#topbar-signout-btn', topAuth).onclick = () => fb.signOut();
    }
  }
  if (sideAuth) {
    sideAuth.className = `cloud-side ${stateClass}`;
    if (!st.user) {
      sideAuth.innerHTML =
        '<div class="cloud-side-head"><span class="cloud-dot"></span><span class="cloud-side-title">Chế độ cục bộ</span></div><small>Đăng nhập để lưu & đồng bộ giữa các thiết bị.</small><button type="button" class="btn small primary" id="side-signin-btn">Đăng nhập Google để lưu</button>';
      $('#side-signin-btn', sideAuth).onclick = () => fb.signIn();
    } else {
      const subTxt = st.syncing ? 'Đang lưu lên Cloud…' : st.lastSavedAt ? `Đã lưu lúc ${fmtTime(st.lastSavedAt)}` : 'Đã kết nối Cloud';
      sideAuth.innerHTML = `<div class="cloud-side-head"><span class="cloud-dot"></span><span class="cloud-side-title" title="${esc(st.user.email || userLabel)}">${esc(userLabel)}</span></div><small>${esc(subTxt)}</small>`;
    }
  }
  if (dashNote) {
    dashNote.textContent = st.user
      ? `Đã đồng bộ Cloud (${st.user.email || st.user.displayName || 'Google'}).`
      : 'Trạng thái do người dùng nhập. Đăng nhập Google để lưu vĩnh viễn và đồng bộ lên Cloud.';
  }
  if (dashActions) {
    if (!st.user) {
      dashActions.innerHTML =
        '<button type="button" class="btn primary" id="dash-signin-btn">Đăng nhập Google để lưu Cloud</button><a class="btn" href="#p10/m44">Checklist 20 nhiệm vụ cấp thiết →</a>';
      $('#dash-signin-btn', dashActions).onclick = () => fb.signIn();
    } else {
      dashActions.innerHTML =
        '<a class="btn primary" href="#tracker">Cập nhật trạng thái Tracker →</a><a class="btn" href="#p10/m44">Checklist 20 nhiệm vụ cấp thiết →</a>';
    }
  }
  if (!bar) return;
  if (!st.user) {
    bar.className = 'cloud-bar offline';
    bar.innerHTML =
      '<div class="cloud-info"><span class="cloud-dot"></span><span><strong>Chế độ cục bộ:</strong> Dữ liệu đang lưu trên trình duyệt này. Đăng nhập Google để lưu vĩnh viễn và đồng bộ giữa các thiết bị.</span></div><div class="cloud-actions"><button type="button" class="btn small primary" id="cloud-signin">Đăng nhập Google để lưu Cloud</button></div>';
    $('#cloud-signin', bar).onclick = () => fb.signIn();
    return;
  }
  const statusTxt = st.syncing
    ? 'Đang lưu lên Cloud…'
    : st.error
    ? 'Lỗi đồng bộ Cloud — dữ liệu vẫn giữ cục bộ'
    : st.lastSavedAt
    ? `Đã lưu Cloud lúc ${fmtTime(st.lastSavedAt)}`
    : 'Đã kết nối Cloud (Firestore)';
  bar.className = `cloud-bar ${stateClass}`;
  bar.innerHTML = `<div class="cloud-info"><span class="cloud-dot"></span><span><strong>${esc(
    st.user.email || st.user.displayName || 'Tài khoản Google'
  )}</strong> · ${esc(statusTxt)}</span></div><div class="cloud-actions"><button type="button" class="btn small" id="cloud-save-all">Lưu tất cả</button><button type="button" class="btn small" id="cloud-signout">Đăng xuất</button></div>`;
  $('#cloud-save-all', bar).onclick = async () => {
    const entries = data.projects
      .filter(
        (p) =>
          dirtyProjects.has(p.id) ||
          (state.projects[p.id] &&
            (state.projects[p.id].status !== statuses[0] || state.projects[p.id].owner || state.projects[p.id].note))
      )
      .map((p) => [p.id, getProject(p.id)]);
    if (!entries.length) {
      toast('Tất cả dự án đã được đồng bộ.');
      return;
    }
    const ok = await fb.saveProjectsBatch(entries);
    if (ok) {
      entries.forEach(([id]) => {
        dirtyProjects.delete(id);
        savedProjects.add(id);
        updateRowSaveButton(id);
      });
      toast(`Đã lưu ${entries.length} dự án lên Cloud.`);
    }
  };
  $('#cloud-signout', bar).onclick = () => fb.signOut();
}

let remoteHooks = {};
export function registerRemoteSyncHooks(hooks) {
  remoteHooks = { ...remoteHooks, ...hooks };
}

export function initFirebaseSync() {
  if (fb) {
    fb.init({
      getLocalState: () => state,
      applyRemoteProjects: (remoteProjects) => {
        let changed = false;
        for (const [id, rec] of Object.entries(remoteProjects)) {
          if (!dirtyProjects.has(id)) {
            state.projects[id] = { status: rec.status, owner: rec.owner, note: rec.note };
            savedProjects.add(id);
            changed = true;
          }
        }
        if (changed) saveLocal();
        remoteHooks.onProjectsUpdated?.(remoteProjects);
      },
      applyRemotePreferences: (prefs) => {
        state.budget = prefs.budget;
        state.weights = prefs.weights;
        const nextTasks = {};
        prefs.completedTasks.forEach((idx) => {
          nextTasks[String(idx)] = true;
        });
        state.tasks = nextTasks;
        saveLocal();
        remoteHooks.onPreferencesUpdated?.();
      },
      onSyncStateChange: () => {
        renderCloudBar();
      },
      onToast: (msg) => toast(msg),
    });
  }
  renderCloudBar();
}
