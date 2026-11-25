'use strict';

import { esc, statusToneClass } from '../../shared/utils.js';
import { portal, getDepartmentProjectCount } from '../../shared/data-service.js';

export function renderOrganizationPage(hostEl, subtab = 'overview') {
  const company = portal.company || {};
  const orgChart = company.organizationChart || {};
  const departments = portal.departments || [];
  const documents = portal.documents || [];
  const foundations = company.foundations || [];
  const values = company.coreValues || [];
  const ecosystem = company.ecosystemComponents || [];

  const isDeptsTab = subtab === 'departments';

  hostEl.innerHTML = `
    <div class="pageheader">
      <div>
        <div class="eyebrow">MODULE 06 · ORGANIZATION &amp; GOVERNANCE</div>
        <h1>${isDeptsTab ? 'Thông tin các phòng ban' : 'Thông tin tổ chức &amp; Hệ sinh thái'}</h1>
        <p>${esc(company.positioning || 'Organic Việt Nam · Nông nghiệp · Thực phẩm · Công nghệ')}</p>
      </div>
      <div class="pageheader-actions">
        <a class="btn" href="#onboarding">Hội nhập nhân viên →</a>
      </div>
    </div>

    <nav class="wp-tabs" aria-label="Phân khu Thông tin tổ chức">
      <a class="wp-tab ${!isDeptsTab ? 'active' : ''}" href="#organization">Doanh nghiệp, Hệ sinh thái &amp; Cơ cấu</a>
      <a class="wp-tab ${isDeptsTab ? 'active' : ''}" href="#organization/departments">Thông tin ${departments.length} phòng ban</a>
    </nav>

    <div id="org-content"></div>
  `;

  const body = hostEl.querySelector('#org-content');

  if (isDeptsTab) {
    body.innerHTML = `
      <div class="notice">
        <strong>Ghi chú quản trị:</strong> Thông tin dưới đây mô tả chức năng và quan hệ phối hợp phục vụ vận hành Organic Workplace. Văn bản cơ cấu tổ chức chính thức hiện ở trạng thái <strong>${esc(
          orgChart.status || 'Chưa cập nhật'
        )}</strong>.
      </div>
      <div class="wp-org-dept-list">
        ${departments
          .map((d) => {
            const deptDocs = documents.filter((doc) => doc.departmentId === d.id);
            const pCount = getDepartmentProjectCount(d);
            return `
          <section class="panel" id="org-dept-${esc(d.id)}">
            <div class="panel-head">
              <div>
                <div class="eyebrow">${esc(d.code)} · ${esc(d.structureStatus.toUpperCase())}</div>
                <h2>${esc(d.icon || '')} ${esc(d.name)}</h2>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <a class="btn small primary" href="#departments/${esc(d.id)}">Mở Workspace →</a>
              </div>
            </div>
            <p>${esc(d.summary)}</p>
            <div class="wp-org-dept-grid">
              <div>
                <div class="eyebrow">CHỨC NĂNG &amp; NHIỆM VỤ</div>
                <ul class="wp-clean-list">
                  ${(d.functions || []).map((f) => `<li>${esc(f)}</li>`).join('')}
                </ul>
              </div>
              <div>
                <div class="eyebrow">QUAN HỆ PHỐI HỢP</div>
                <ul class="wp-clean-list">
                  ${(d.coordination || []).map((c) => `<li>${esc(c)}</li>`).join('')}
                </ul>
              </div>
              <div>
                <div class="eyebrow">TÀI LIỆU &amp; DỮ LIỆU HIỆN CÓ</div>
                <p class="muted" style="margin-bottom:8px">Chiến lược: <strong>${esc(d.strategyStatus)}</strong> · Dự án: <strong>${
              pCount !== null ? `${pCount} dự án` : 'Chưa cập nhật'
            }</strong></p>
                ${
                  deptDocs.length
                    ? `<ul class="wp-clean-list">${deptDocs
                        .slice(0, 4)
                        .map(
                          (doc) =>
                            `<li><a href="#documents/view/${esc(doc.id)}" class="textlink">${esc(doc.title)}</a> <span class="wp-status-tag ${statusToneClass(
                              doc.status
                            )}">${esc(doc.status)}</span></li>`
                        )
                        .join('')}</ul>`
                    : '<div class="notice">Chưa có tài liệu chuyên môn riêng được cập nhật.</div>'
                }
              </div>
            </div>
          </section>`;
          })
          .join('')}
      </div>
    `;
    return;
  }

  body.innerHTML = `
    <section class="panel">
      <div class="panel-head">
        <div>
          <div class="eyebrow">01 / GIỚI THIỆU DOANH NGHIỆP</div>
          <h2>Tầm nhìn, Sứ mệnh &amp; Giá trị cốt lõi</h2>
        </div>
      </div>
      <div class="dashboard-grid" style="margin-bottom:0">
        <div>
          <h3>Tầm nhìn</h3>
          <p>${esc(company.vision || '')}</p>
          <h3 style="margin-top:16px">Sứ mệnh</h3>
          <p>${esc(company.mission || '')}</p>
          <h3 style="margin-top:16px">Ba lĩnh vực nền tảng</h3>
          <div class="cards" style="margin-top:10px">
            ${foundations
              .map(
                (f) => `
              <div class="tile">
                <strong>${esc(f.title)}</strong>
                <p>${esc(f.desc)}</p>
              </div>`
              )
              .join('')}
          </div>
        </div>
        <div>
          <h3>Giá trị cốt lõi</h3>
          <div class="steps" style="margin-top:8px">
            ${values
              .map(
                (v, i) => `
              <div class="step">
                <span class="stepnum">${String(i + 1).padStart(2, '0')}</span>
                <div><strong>${esc(v.title)}</strong><p>${esc(v.desc)}</p></div>
              </div>`
              )
              .join('')}
          </div>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <div class="eyebrow">02 / KIẾN TRÚC HỆ SINH THÁI</div>
          <h2>Mô hình hệ sinh thái Organic Việt Nam &amp; ADIGO</h2>
        </div>
        <a href="#p2" class="textlink">Chi tiết trong tài liệu V2.1 →</a>
      </div>
      <div class="diagram">
        <div class="node dark"><strong>ORGANIC VIỆT NAM</strong><small>Chiến lược · Đầu tư · Quản trị · Phát triển</small></div>
        <div class="connector">↓</div>
        <div class="diagram-row three">
          <div class="node"><strong>ORGANIC FARM</strong><small>Nông nghiệp · Nguồn nguyên liệu</small></div>
          <div class="node"><strong>ORGANIC FOOD</strong><small>Thực phẩm · Giá trị sản phẩm</small></div>
          <div class="node"><strong>ORGANIC DISTRIBUTION</strong><small>Chuỗi cung ứng · Lưu chuyển hàng hóa</small></div>
        </div>
        <div class="connector">↓</div>
        <div class="node blue"><strong>ADIGO</strong><small>Nền tảng công nghệ quản trị và thương mại · Dữ liệu · Vận hành · Truy xuất</small></div>
        <div class="connector">↓</div>
        <div class="diagram-row two">
          <div class="node lightblue"><strong>ADIGO MART</strong><small>Bán lẻ &amp; trải nghiệm</small></div>
          <div class="node lightblue"><strong>ADIGO MARKETPLACE</strong><small>Kết nối thương mại số</small></div>
        </div>
        <div class="connector">↓</div>
        <div class="node dark"><strong>CUSTOMER</strong><small>Người tiêu dùng · Khách hàng · Đối tác</small></div>
      </div>
      <div class="cards" style="margin-top:14px">
        ${ecosystem
          .map(
            (c) => `
          <div class="tile">
            <strong>${esc(c.name)}</strong>
            <div class="muted" style="font-size:11px;margin-top:2px">${esc(c.role)}</div>
            <p>${esc(c.summary)}</p>
          </div>`
          )
          .join('')}
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <div class="eyebrow">03 / CƠ CẤU TỔ CHỨC</div>
          <h2>Khung sơ đồ tổ chức &amp; Kết nối phòng ban</h2>
        </div>
        <span class="wp-status-tag">${esc(orgChart.status || 'Chưa cập nhật')}</span>
      </div>
      <div class="notice">
        <strong>Sơ đồ cơ cấu tổ chức chính thức: ${esc(orgChart.status || 'Chưa cập nhật')}.</strong> ${esc(orgChart.note || '')}
      </div>
      <div class="diagram" style="margin-top:14px">
        <div class="node dark"><strong>BAN LÃNH ĐẠO / BAN ĐIỀU HÀNH</strong><small>Sơ đồ chính thức: Chưa cập nhật văn bản ban hành</small></div>
        <div class="connector">↓</div>
        <div class="wp-org-chart-grid">
          ${departments
            .map(
              (d) => `
            <a class="node" href="#organization/departments">
              <strong>${esc(d.name)}</strong>
              <small>${esc(d.code)} · ${esc(d.strategyStatus)}</small>
            </a>`
            )
            .join('')}
        </div>
      </div>
      <div style="margin-top:14px">
        <a class="btn small" href="#organization/departments">Xem chức năng chi tiết từng phòng ban →</a>
      </div>
    </section>
  `;
}
