'use strict';

import { $, $$, esc, norm, statusToneClass } from '../../shared/utils.js';
import { data, portal } from '../../shared/data-service.js';
import { bindWidgets } from '../communications/widgets.js';

export { renderDocumentLibrary as renderDocumentsPage } from './library.js';

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
