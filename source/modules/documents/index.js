'use strict';

import { $, $$, esc, norm, statusToneClass } from '../../shared/utils.js';
import { data, portal } from '../../shared/data-service.js';
import { bindWidgets } from '../communications/widgets.js';

const DOC_STATUSES = [
  'Đang có hiệu lực',
  'Đã ban hành',
  'Chờ phê duyệt',
  'Bản dự thảo',
  'Đã thay thế',
  'Hết hiệu lực',
  'Chưa cập nhật',
];

export function renderDocumentsPage(hostEl, options = {}) {
  const docs = portal.documents || [];
  const categories = [...(portal.documentCategories || [])].sort((a, b) => a.order - b.order);
  const departments = portal.departments || [];
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d]));

  const initialCategory = options.categoryId || '';
  const initialRequiredOnly = Boolean(options.requiredOnly);

  const countTotal = docs.length;
  const countReady = docs.filter((d) => d.status !== 'Chưa cập nhật').length;
  const countPending = docs.filter((d) => d.status === 'Chưa cập nhật').length;
  const countRequired = docs.filter((d) => d.requiredReading).length;

  const activeCategoryObj = initialCategory ? catMap[initialCategory] : null;
  const pageTitle = initialRequiredOnly
    ? 'Tài liệu cần đọc & Hội nhập'
    : activeCategoryObj
    ? `${activeCategoryObj.code} – ${activeCategoryObj.name}`
    : 'Thư viện tài liệu nội bộ';

  const pageDesc = activeCategoryObj
    ? activeCategoryObj.description
    : 'Document Center tập trung: tài liệu doanh nghiệp, nội quy, quy chế, chính sách, quy trình, quy chuẩn thương hiệu, biểu mẫu và tài liệu đào tạo.';

  hostEl.innerHTML = `
    <div class="pageheader">
      <div>
        <div class="eyebrow">MODULE 02 · DOCUMENT CENTER</div>
        <h1>${esc(pageTitle)}</h1>
        <p>${esc(pageDesc)}</p>
      </div>
      <div class="pageheader-actions">
        <a class="btn" href="#onboarding">Lộ trình hội nhập →</a>
      </div>
    </div>

    <div class="statusbar">
      <div class="tile"><strong>${countTotal}</strong><small>Tổng mục danh mục</small></div>
      <div class="tile"><strong>${countReady}</strong><small>Tài liệu đã có nội dung / tệp</small></div>
      <div class="tile"><strong>${countPending}</strong><small>Đang chờ cập nhật văn bản</small></div>
      <div class="tile"><strong>${countRequired}</strong><small>Tài liệu đánh dấu cần đọc</small></div>
    </div>

    <section class="panel">
      <div class="wp-cat-strip" role="navigation" aria-label="Nhóm danh mục tài liệu">
        <a class="wp-cat-pill ${!initialCategory && !initialRequiredOnly ? 'active' : ''}" href="#documents">Tất cả (${countTotal})</a>
        <a class="wp-cat-pill ${initialRequiredOnly ? 'active' : ''}" href="#documents/required">Tài liệu cần đọc (${countRequired})</a>
        ${categories
          .map((c) => {
            const n = docs.filter((d) => d.categoryId === c.id).length;
            return `<a class="wp-cat-pill ${initialCategory === c.id ? 'active' : ''}" href="#documents/category/${esc(
              c.id
            )}">${esc(c.code)} · ${esc(c.name)} (${n})</a>`;
          })
          .join('')}
      </div>

      <div class="filters">
        <label class="field searchfield">
          Tìm kiếm tài liệu
          <input type="search" id="doc-q" placeholder="Mã tài liệu, tên tài liệu, mô tả…">
        </label>
        <label class="field">
          Danh mục
          <select id="doc-cat">
            <option value="">Tất cả danh mục</option>
            ${categories
              .map((c) => `<option value="${esc(c.id)}" ${initialCategory === c.id ? 'selected' : ''}>${esc(c.code)} · ${esc(c.name)}</option>`)
              .join('')}
          </select>
        </label>
        <label class="field">
          Phòng ban phụ trách
          <select id="doc-dept">
            <option value="">Tất cả phòng ban</option>
            ${departments.map((d) => `<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          Trạng thái
          <select id="doc-status">
            <option value="">Tất cả trạng thái</option>
            ${DOC_STATUSES.map((s) => `<option>${esc(s)}</option>`).join('')}
          </select>
        </label>
      </div>

      <div class="panel-head">
        <span id="doc-count" class="muted"></span>
        <label class="wp-inline-check">
          <input type="checkbox" id="doc-req-only" ${initialRequiredOnly ? 'checked' : ''}>
          <span>Chỉ hiện tài liệu cần đọc</span>
        </label>
      </div>

      <div class="table-scroll">
        <table class="tracker-table wp-doc-table">
          <thead>
            <tr>
              <th>Mã tài liệu</th>
              <th>Tên tài liệu &amp; mô tả</th>
              <th>Danh mục</th>
              <th>Đơn vị phụ trách</th>
              <th>Phiên bản</th>
              <th>Ngày cập nhật</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody id="doc-rows"></tbody>
        </table>
      </div>
    </section>
  `;

  const draw = () => {
    const q = norm($('#doc-q', hostEl).value);
    const cat = $('#doc-cat', hostEl).value;
    const dept = $('#doc-dept', hostEl).value;
    const st = $('#doc-status', hostEl).value;
    const reqOnly = $('#doc-req-only', hostEl).checked;

    const list = docs.filter((d) => {
      const hay = norm([d.id, d.documentCode, d.title, d.description, d.version, d.fileType].join(' '));
      return (
        (!q || hay.includes(q)) &&
        (!cat || d.categoryId === cat) &&
        (!dept || d.departmentId === dept) &&
        (!st || d.status === st) &&
        (!reqOnly || Boolean(d.requiredReading))
      );
    });

    $('#doc-count', hostEl).textContent = `Hiển thị ${list.length}/${docs.length} tài liệu`;
    $('#doc-rows', hostEl).innerHTML =
      list
        .map((d) => {
          const cObj = catMap[d.categoryId];
          const dObj = deptMap[d.departmentId];
          const hasDownload = Boolean(d.filePath) && d.readerKind !== 'strategy-v21';
          const canRead = d.status !== 'Chưa cập nhật';
          return `
        <tr>
          <td data-label="Mã"><code>${esc(d.documentCode)}</code></td>
          <td data-label="Tài liệu" class="tracker-project-cell">
            <strong><a href="#documents/view/${esc(d.id)}" class="textlink" style="font-size:13px">${esc(d.title)}</a></strong>
            <div class="tracker-deliverable">${esc(d.description)}</div>
            <div class="tracker-submeta">
              ${d.requiredReading ? '<span class="req-badge">Cần đọc</span>' : ''}
              <span class="opt-badge">${esc(d.fileType || 'Chưa cập nhật')}</span>
            </div>
          </td>
          <td data-label="Danh mục">${esc(cObj ? `${cObj.code} · ${cObj.name}` : d.categoryId)}</td>
          <td data-label="Đơn vị phụ trách">${esc(dObj ? dObj.name : d.departmentId)}</td>
          <td data-label="Phiên bản">${esc(d.version || 'Chưa cập nhật')}</td>
          <td data-label="Ngày cập nhật">${esc(d.updatedAt || 'Chưa cập nhật')}</td>
          <td data-label="Trạng thái"><span class="wp-status-tag ${statusToneClass(d.status)}">${esc(d.status)}</span></td>
          <td data-label="Thao tác">
            <div class="wp-row-actions">
              <a class="btn small ${canRead ? 'primary' : ''}" href="#documents/view/${esc(d.id)}">${canRead ? 'Đọc tài liệu' : 'Xem chi tiết'}</a>
              ${
                hasDownload
                  ? `<a class="btn small" href="${esc(d.filePath)}" download>Tải xuống</a>`
                  : ''
              }
            </div>
          </td>
        </tr>`;
        })
        .join('') || '<tr><td colspan="8">Không tìm thấy tài liệu phù hợp bộ lọc.</td></tr>';
  };

  ['#doc-q', '#doc-cat', '#doc-dept', '#doc-status', '#doc-req-only'].forEach((sel) => {
    const el = $(sel, hostEl);
    el.addEventListener(sel === '#doc-q' ? 'input' : 'change', draw);
  });
  draw();
}

export function renderDocumentDetailPage(hostEl, docId) {
  const docs = portal.documents || [];
  const doc = docs.find((d) => d.id === docId);
  if (!doc) {
    hostEl.innerHTML = `
      <div class="pageheader">
        <div>
          <div class="eyebrow">MODULE 02 · DOCUMENT DETAIL</div>
          <h1>Không tìm thấy tài liệu</h1>
          <p>Mã tài liệu "${esc(docId)}" không có trong danh mục hiện tại.</p>
        </div>
        <a class="btn" href="#documents">← Quay lại thư viện tài liệu</a>
      </div>
    `;
    return;
  }

  const categories = portal.documentCategories || [];
  const departments = portal.departments || [];
  const cat = categories.find((c) => c.id === doc.categoryId);
  const dept = departments.find((d) => d.id === doc.departmentId);
  const related = (doc.relatedDocumentIds || [])
    .map((rid) => docs.find((x) => x.id === rid))
    .filter(Boolean);

  const hasFile = Boolean(doc.filePath);
  let readerBody = '';

  if (doc.readerKind === 'strategy-v21') {
    const tocHtml = (data.sections || [])
      .map((s) => `<a href="#part-${s.p}">${s.p <= 12 ? `Phần ${String(s.p).padStart(2, '0')}` : 'Phụ lục'} · ${esc(s.title.split('. ').slice(1).join('. ') || s.title)}</a>`)
      .join('');
    readerBody = `
      <div class="reader-layout">
        <article class="article">
          <div class="introdoc">${data.intro}</div>
          ${(data.sections || [])
            .map((s) => `<section class="docpart" id="part-${s.p}"><h1 class="part-title">${esc(s.title)}</h1>${s.html}</section>`)
            .join('')}
        </article>
        <aside class="toc">
          <h4>Mục lục toàn văn V2.1</h4>
          <div class="toclinks">${tocHtml}</div>
        </aside>
      </div>
    `;
  } else if (doc.readerKind === 'html-frame' && doc.contentPath) {
    readerBody = `
      <section class="panel">
        <div class="panel-head">
          <div>
            <div class="eyebrow">TRÌNH ĐỌC TÀI LIỆU HTML LƯU TRỮ</div>
            <h2>Xem trực tiếp bản gốc lưu trữ</h2>
          </div>
          <a class="btn small" href="${esc(doc.contentPath)}" target="_blank" rel="noopener">Mở trong tab riêng ↗</a>
        </div>
        <div class="wp-frame-wrap">
          <iframe src="${esc(doc.contentPath)}" title="${esc(doc.title)}" class="wp-doc-iframe"></iframe>
        </div>
      </section>
    `;
  } else if (doc.readerKind === 'image' && doc.filePath) {
    readerBody = `
      <section class="panel">
        <div class="panel-head">
          <div>
            <div class="eyebrow">TÀI NGUYÊN NHẬN DIỆN THƯƠNG HIỆU</div>
            <h2>Xem trước tệp hình ảnh chuẩn</h2>
          </div>
          <a class="btn primary small" href="${esc(doc.filePath)}" download>Tải tệp gốc ↓</a>
        </div>
        <div class="wp-image-preview">
          <img src="${esc(doc.filePath)}" alt="${esc(doc.title)}">
        </div>
      </section>
    `;
  } else if (doc.readerKind === 'pdf' && doc.filePath) {
    readerBody = `
      <section class="panel">
        <div class="panel-head">
          <div>
            <div class="eyebrow">TRÌNH XEM PDF TÍCH HỢP</div>
            <h2>Xem trực tiếp tài liệu PDF</h2>
          </div>
          <a class="btn primary small" href="${esc(doc.filePath)}" download>Tải xuống PDF ↓</a>
        </div>
        <div class="wp-frame-wrap">
          <iframe src="${esc(doc.filePath)}" title="${esc(doc.title)}" class="wp-doc-iframe"></iframe>
        </div>
      </section>
    `;
  } else if (hasFile) {
    readerBody = `
      <section class="panel">
        <div class="panel-head">
          <div>
            <div class="eyebrow">TỆP TÀI LIỆU ĐÍNH KÈM (${esc(doc.fileType || 'FILE')})</div>
            <h2>Tải xuống tài liệu để xem chi tiết</h2>
          </div>
        </div>
        <p>${esc(doc.description)}</p>
        <a class="btn primary" href="${esc(doc.filePath)}" download>Tải tệp tài liệu (${esc(doc.fileType || '')}) ↓</a>
      </section>
    `;
  } else {
    readerBody = `
      <section class="panel">
        <div class="wp-empty-state">
          <div class="eyebrow">TRẠNG THÁI DỮ LIỆU · CHƯA CẬP NHẬT</div>
          <h2>Văn bản chính thức chưa được cập nhật lên hệ thống</h2>
          <p>${esc(doc.description)}</p>
          <p class="muted">Hệ thống không tự tạo nội dung văn bản hành chính hoặc đường dẫn tải giả. Khi có tệp PDF, DOCX, XLSX, Markdown hoặc HTML đã ban hành từ đơn vị phụ trách, quản trị viên có thể bổ sung vào thư mục <code>public/documents/</code> và khai báo đường dẫn trong <code>source/data/documents.json</code>.</p>
          ${
            doc.internalRoute
              ? `<div style="margin-top:12px"><a class="btn primary" href="${esc(doc.internalRoute)}">Xem nội dung liên quan hiện có trong hệ thống →</a></div>`
              : ''
          }
        </div>
      </section>
    `;
  }

  hostEl.innerHTML = `
    <div class="pageheader">
      <div>
        <div class="eyebrow">${esc(cat ? `${cat.code} · ${cat.name}` : 'THƯ VIỆN TÀI LIỆU')} · ${esc(doc.documentCode)}</div>
        <h1>${esc(doc.title)}</h1>
        <p>${esc(doc.description)}</p>
      </div>
      <div class="pageheader-actions">
        <a class="btn" href="#documents">← Quay lại thư viện</a>
        ${
          doc.readerKind === 'strategy-v21'
            ? '<button type="button" class="btn primary" onclick="window.print()">In / Lưu PDF</button>'
            : hasFile
            ? `<a class="btn primary" href="${esc(doc.filePath)}" download>Tải tài liệu ↓</a>`
            : ''
        }
      </div>
    </div>

    <section class="panel wp-doc-meta-panel">
      <div class="wp-doc-meta-grid">
        <div><small>Mã tài liệu</small><strong><code>${esc(doc.documentCode)}</code></strong></div>
        <div><small>Phiên bản</small><strong>${esc(doc.version || 'Chưa cập nhật')}</strong></div>
        <div><small>Đơn vị phụ trách</small><strong>${esc(dept ? dept.name : doc.departmentId)}</strong></div>
        <div><small>Ngày ban hành</small><strong>${esc(doc.issuedDate || 'Chưa cập nhật')}</strong></div>
        <div><small>Ngày hiệu lực</small><strong>${esc(doc.effectiveDate || 'Chưa cập nhật')}</strong></div>
        <div><small>Trạng thái</small><strong><span class="wp-status-tag ${statusToneClass(doc.status)}">${esc(doc.status)}</span></strong></div>
      </div>
    </section>

    ${readerBody}

    ${
      related.length
        ? `
      <section class="panel" style="margin-top:16px">
        <div class="panel-head">
          <div>
            <div class="eyebrow">RELATED DOCUMENTS</div>
            <h2>Tài liệu liên quan</h2>
          </div>
        </div>
        <div class="chaptergrid">
          ${related
            .map(
              (r) => `
            <a class="chapter-card" href="#documents/view/${esc(r.id)}">
              <span>${esc(r.documentCode)}</span>
              <strong>${esc(r.title)}</strong>
              <small>${esc(r.status)} →</small>
            </a>`
            )
            .join('')}
        </div>
      </section>`
        : ''
    }
  `;

  if (doc.readerKind === 'strategy-v21') {
    bindWidgets();
    $$('.toclinks a', hostEl).forEach((a) => {
      a.onclick = (e) => {
        e.preventDefault();
        const target = document.getElementById(a.getAttribute('href').slice(1));
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
    });
  }
}
