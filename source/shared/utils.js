'use strict';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));

export const fmt = (n) => Number(n).toLocaleString('vi-VN', { maximumFractionDigits: 1 });

export const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

export const getNow = () => {
  const raw = window.__ovnNow ? new Date(window.__ovnNow) : new Date();
  return Number.isNaN(raw.getTime()) ? new Date() : raw;
};

export const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const parseIsoDate = (iso) => {
  if (!iso || typeof iso !== 'string') return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};

export const fmtDateVi = (d) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

export const daysBetween = (a, b) =>
  Math.round((dayStart(b).getTime() - dayStart(a).getTime()) / 86400000);

export const fmtTime = (ts) => {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const csv = (rows) =>
  '\uFEFF' + rows.map((r) => r.map((v) => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n');

let toastTimer;
export function toast(msg) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

export function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => toast('Đã sao chép nội dung.'))
      .catch(() => fallbackCopy());
  } else {
    fallbackCopy();
  }
  function fallbackCopy() {
    const t = document.createElement('textarea');
    t.value = text;
    t.style.position = 'fixed';
    t.style.opacity = '0';
    document.body.appendChild(t);
    t.select();
    try {
      document.execCommand('copy');
      toast('Đã sao chép nội dung.');
    } catch {
      toast('Không thể sao chép tự động.');
    }
    t.remove();
  }
}

export function exportFile(filename, content, type) {
  const b = new Blob([content], { type });
  const u = URL.createObjectURL(b);
  const a = document.createElement('a');
  a.href = u;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 500);
}

export function statusToneClass(status) {
  const s = String(status || '');
  if (s === 'Hoàn thành' || s === 'Đang có hiệu lực' || s === 'Đã ban hành' || s === 'Đang áp dụng') return 'tone-done';
  if (s === 'Đang thực hiện' || s === 'Đang triển khai') return 'tone-active';
  if (s === 'Chờ phê duyệt' || s === 'Bản dự thảo') return 'tone-warn';
  if (s === 'Tạm dừng' || s === 'Hết hiệu lực') return 'tone-pause';
  return 'tone-muted';
}
