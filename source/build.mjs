import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const outDir = path.resolve(root, '..');
const dataDir = path.join(root, 'data');

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function inlineMd(text) {
  let s = String(text ?? '');
  s = s.replace(/<br\s*\/?>/gi, '%%BR%%');
  s = esc(s);
  s = s.replace(/%%BR%%/g, '<br>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return s;
}

function splitTableRow(line) {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
  return trimmed.split('|').map((c) => c.trim());
}

function isTableSeparator(line) {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((c) => /^:?-{3,}:?$/.test(c));
}

function mdToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    if (/^<!--\s*WIDGET:\w+\s*-->$/.test(trimmed)) {
      out.push(trimmed);
      i++;
      continue;
    }

    const hMatch = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      out.push(`<h${level}>${inlineMd(hMatch[2].trim())}</h${level}>`);
      i++;
      continue;
    }

    if (trimmed.startsWith('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headers = splitTableRow(trimmed);
      const sepCells = splitTableRow(lines[i + 1]);
      const aligns = sepCells.map((c) => {
        if (c.startsWith(':') && c.endsWith(':')) return 'center';
        if (c.endsWith(':')) return 'right';
        return '';
      });
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      const thHtml = headers
        .map((h, idx) => `<th${aligns[idx] ? ` style="text-align:${aligns[idx]}"` : ''}>${inlineMd(h)}</th>`)
        .join('');
      const tbHtml = rows
        .map(
          (r) =>
            '<tr>' +
            headers
              .map((_, idx) => `<td${aligns[idx] ? ` style="text-align:${aligns[idx]}"` : ''}>${inlineMd(r[idx] ?? '')}</td>`)
              .join('') +
            '</tr>'
        )
        .join('');
      out.push(`<table><thead><tr>${thHtml}</tr></thead><tbody>${tbHtml}</tbody></table>`);
      continue;
    }

    if (/^-\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^-\s+/.test(lines[i].trim())) {
        items.push(`<li>${inlineMd(lines[i].trim().replace(/^-\s+/, ''))}</li>`);
        i++;
      }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(`<li>${inlineMd(lines[i].trim().replace(/^\d+\.\s+/, ''))}</li>`);
        i++;
      }
      out.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    const pLines = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,4}\s+/.test(lines[i].trim()) &&
      !/^-\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^<!--\s*WIDGET:\w+\s*-->$/.test(lines[i].trim()) &&
      !(lines[i].trim().startsWith('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1]))
    ) {
      pLines.push(lines[i].trim());
      i++;
    }
    out.push(`<p>${inlineMd(pLines.join(' '))}</p>`);
  }

  return out.join('\n');
}

function stripTags(htmlStr) {
  return String(htmlStr ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const planMeta = readJson(path.join(root, 'plan-meta.json'));
const aboutMarkdown = fs.readFileSync(path.join(dataDir, 'about-company.md'), 'utf8');
const aboutSections = [...aboutMarkdown.matchAll(/^## (\d{2})\. (.+)\r?\n([\s\S]*?)(?=^## \d{2}\. |$(?![\s\S]))/gm)].map((m) => ({
  id: `company-${m[1]}`,
  title: m[2],
  html: mdToHtml(m[3].trim()),
  body: m[3].replace(/[#*]/g, '').trim(),
}));
if (aboutSections.length !== 14) throw new Error('Expected 14 company profile sections');
const portalData = {
  aboutCompany: { title: 'Organic Việt Nam', sections: aboutSections, media: readJson(path.join(dataDir, 'about-company-media.json')) },
  ...readJson(path.join(dataDir, 'company.json')),
  documentCategories: readJson(path.join(dataDir, 'document-categories.json')),
  departments: readJson(path.join(dataDir, 'departments.json')),
  documents: readJson(path.join(dataDir, 'documents.json')),
  announcements: readJson(path.join(dataDir, 'announcements.json')),
  onboarding: readJson(path.join(dataDir, 'onboarding.json')),
  strategyCatalog: readJson(path.join(dataDir, 'strategy-catalog.json')),
};

const cards = (items, cls = 'cards', caption = '') =>
  `<div class="${cls}">` +
  items.map(([a, b]) => `<div class="tile"><strong>${esc(a)}</strong><p>${esc(b)}</p></div>`).join('') +
  `</div>` +
  (caption ? `<div class="figcaption">${esc(caption)}</div>` : '');

const bars = (items, caption = '') =>
  '<div class="bars">' +
  items
    .map(
      ([a, v]) =>
        `<div class="baritem"><div><span>${esc(a)}</span><strong>${v}%</strong></div><div class="track"><span style="width:${v}%"></span></div></div>`
    )
    .join('') +
  '</div>' +
  (caption ? `<p class="figcaption">${esc(caption)}</p>` : '');

const steps = (items, title = '') =>
  (title ? `<h4>${esc(title)}</h4>` : '') +
  '<div class="steps">' +
  items
    .map(
      ([a, b], i) =>
        `<div class="step"><span class="stepnum">${String(i + 1).padStart(2, '0')}</span><div><strong>${esc(a)}</strong>${
          b ? `<p>${esc(b)}</p>` : ''
        }</div></div>`
    )
    .join('') +
  '</div>';

const node = (a, b = '', href = '', cls = '') => {
  const tag = href ? 'a' : 'div';
  return `<${tag} class="node ${cls}"${href ? ` href="${href}"` : ''}><strong>${esc(a)}</strong>${
    b ? `<small>${esc(b)}</small>` : ''
  }</${tag}>`;
};

const ecosystem = (link = false) => {
  const l = (x) => (link ? `#p2/m5-${x}` : '');
  return (
    '<div class="diagram">' +
    node('ORGANIC VIỆT NAM', 'Chiến lược · Đầu tư · Quản trị · Phát triển', l(1), 'dark') +
    '<div class="connector">↓</div><div class="diagram-row three">' +
    node('ORGANIC FARM', 'Nông nghiệp · Nguồn nguyên liệu', l(2)) +
    node('ORGANIC FOOD', 'Thực phẩm · Giá trị sản phẩm', l(3)) +
    node('ORGANIC DISTRIBUTION', 'Chuỗi cung ứng · Lưu chuyển hàng hóa', l(4)) +
    '</div><div class="connector">↓</div>' +
    node('ADIGO', 'Nền tảng công nghệ quản trị và thương mại · Dữ liệu · Vận hành · Truy xuất · Kết nối thị trường', l(5), 'blue') +
    '<div class="connector">↓</div><div class="diagram-row two">' +
    node('ADIGO MART', 'Bán lẻ & trải nghiệm', l(6), 'lightblue') +
    node('ADIGO MARKETPLACE', 'Kết nối thương mại số', l(7), 'lightblue') +
    '</div><div class="connector">↓</div>' +
    node('CUSTOMER', 'Người tiêu dùng · Khách hàng · Đối tác', '', 'dark') +
    node('DOANH THU · DỮ LIỆU · PHẢN HỒI · TĂNG TRƯỞNG', 'Hệ sinh thái mở rộng thông qua nhà cung cấp và đối tác', l(8)) +
    '</div><p class="figcaption">Kiến trúc hệ sinh thái Organic Việt Nam – Mô hình định hướng chiến lược 2027–2029</p>'
  );
};

const pillars = [
  'Quản trị thương hiệu',
  'Truyền thông doanh nghiệp',
  'Sản phẩm & chuỗi giá trị',
  'Truyền thông ADIGO',
  'Báo chí & quan hệ công chúng',
  'Truyền thông lãnh đạo',
  'Truyền thông số',
  'Sự kiện & trải nghiệm',
  'Cộng đồng & nội bộ',
  'Danh tiếng & khủng hoảng',
];

const pillargrid = () =>
  '<div class="pillars">' +
  pillars
    .map((t, i) => `<a href="#p4/m${i + 12}" class="pillar"><span>${String(i + 1).padStart(2, '0')}</span><strong>${esc(t)}</strong><b>↗</b></a>`)
    .join('') +
  '</div>';

const chain = () =>
  '<div class="chain">' +
  [
    ['FARM', 'Nguyên liệu'],
    ['FOOD', 'Sản phẩm'],
    ['DISTRIBUTION', 'Lưu chuyển'],
    ['ADIGO', 'Thương mại'],
    ['CUSTOMER', 'Giá trị'],
  ]
    .map(([a, b]) => node(a, b, '', a === 'ADIGO' ? 'blue' : ''))
    .join('') +
  '</div>' +
  node('ADIGO – HẠ TẦNG CÔNG NGHỆ XUYÊN SUỐT', 'Quản trị · Dữ liệu · Truy xuất · Kết nối', '', 'lightblue') +
  '<div class="feedback">↶ Dữ liệu · Nhu cầu · Phản hồi khách hàng<br><strong>TỪ NÔNG NGHIỆP ĐẾN BÀN ĂN</strong></div>';

const quartercards = () =>
  '<div class="quartergrid">' +
  planMeta.quarters
    .map(
      (q) =>
        `<div class="tile quarter"><span>${esc(q.label)}</span><div class="muted" style="font-size:10px;margin-top:2px">${esc(
          q.prepNote
        )}</div><h4>${esc(q.title)}</h4><p>${esc(q.desc)}</p></div>`
    )
    .join('') +
  '</div>';

const ganttPlaceholderHtml = () => {
  const rows = [...planMeta.campaigns, planMeta.ongoingTrack];
  return (
    `<div class="roadmap-wrap" data-roadmap>` +
    `<div class="notice">Đang tải biểu đồ lộ trình 12/2026–12/2027 (${rows.length} luồng triển khai).</div>` +
    `</div>` +
    `<p class="figcaption">Lộ trình theo tháng (12/2026–12/2027) phân biệt rõ giai đoạn chuẩn bị trước mở bán, ra mắt chính thức tháng 01/2027, cao điểm Tết 01–02/2027, hỗ trợ bán hàng thường xuyên theo lứa (C08) và củng cố niềm tin/mua lại. Trạng thái thực tế lấy từ dữ liệu Tracker của người dùng.</p>`
  );
};

const budgetnames = [
  'Nhân sự phòng Truyền thông',
  'Sản xuất hình ảnh, video và TVC',
  'Thương hiệu, thiết kế và ấn phẩm',
  'Báo chí và quan hệ công chúng',
  'Sự kiện và trải nghiệm',
  'Phân phối nội dung truyền thông số',
  'Công cụ, phần mềm và dữ liệu',
  'Dự phòng và xử lý phát sinh',
];
const weights = [35, 15, 10, 10, 12, 10, 3, 5];

const preLaunchProjectsCount = Object.values(planMeta.projectsMeta).filter((p) => p.preLaunchRequired).length;
const preLaunchTasksCount = planMeta.priorities.filter((p) => p.preLaunchRequired).length;

const widgets = {
  foundations: cards([
    ['NÔNG NGHIỆP', 'Phát triển năng lực sản xuất và nguồn nguyên liệu.'],
    ['THỰC PHẨM', 'Phát triển sản phẩm, chất lượng và giá trị gia tăng.'],
    ['CÔNG NGHỆ', 'Quản trị, kết nối dữ liệu, thương mại và thị trường.'],
  ]),
  goals: steps([
    ['Xác lập vị thế thương hiệu', 'Xây dựng hình ảnh Organic Việt Nam là doanh nghiệp phát triển hệ sinh thái nông nghiệp, thực phẩm và công nghệ có định hướng dài hạn.'],
    ['Xây dựng niềm tin thị trường', 'Minh bạch thông tin về nguồn gốc, quy trình sản xuất, kiểm soát chất lượng và giá trị sản phẩm.'],
    ['Hỗ trợ phát triển kinh doanh', 'Tạo nhận biết, nhu cầu và nền tảng thị trường cho sản phẩm, hệ thống bán lẻ, đại lý, nhà phân phối và cộng tác viên.'],
    ['Phát triển thương hiệu ADIGO', 'Định vị ADIGO là nền tảng công nghệ quản trị và thương mại xuyên suốt chuỗi giá trị.'],
    ['Phát triển quan hệ đối ngoại', 'Xây dựng quan hệ với cơ quan quản lý, báo chí, hiệp hội, đối tác, nhà đầu tư và cộng đồng.'],
    ['Xây dựng năng lực quản trị truyền thông', 'Chuẩn hóa tổ chức, nhân sự, quy trình, quản trị thương hiệu, văn hóa và kiểm soát danh tiếng toàn hệ sinh thái.'],
  ]),
  ecosystem: ecosystem(true),
  chain: chain(),
  messages: cards(
    [
      ['THÔNG ĐIỆP DOANH NGHIỆP · Kiến tạo hệ sinh thái giá trị', 'Nông nghiệp · Thực phẩm · Công nghệ'],
      ['THÔNG ĐIỆP SẢN PHẨM · Chất lượng làm nên sự khác biệt', 'Phát triển giá trị sản phẩm từ nguồn sản xuất, quy trình kiểm soát chất lượng và sự minh bạch thông tin.'],
      ['THÔNG ĐIỆP CÔNG NGHỆ ADIGO · Công nghệ kết nối giá trị', 'Kết nối dữ liệu, quản trị vận hành, tổ chức thương mại và phát triển thị trường.'],
    ],
    'messagecards'
  ),
  market: cards(
    [
      ['KỲ ANH', 'Thương mại từ 01/2027'],
      ['HÀ TĨNH', 'Mở rộng quan hệ'],
      ['BẮC TRUNG BỘ', 'Phát triển thị trường'],
      ['TOÀN QUỐC', 'Thương hiệu doanh nghiệp'],
    ],
    'cards four',
    'Phát triển thị trường theo từng cấp độ, đồng thời xây dựng thương hiệu ở phạm vi rộng hơn.'
  ),
  journey: steps([
    ['NHẬN BIẾT', 'Biết đến Organic Việt Nam và hệ sinh thái.'],
    ['THẤU HIỂU', 'Hiểu mô hình sản xuất, sản phẩm và công nghệ.'],
    ['TIN TƯỞNG', 'Có niềm tin dựa trên thông tin và bằng chứng.'],
    ['LỰA CHỌN', 'Mua sản phẩm, sử dụng dịch vụ hoặc hợp tác.'],
    ['GẮN KẾT', 'Tiếp tục lựa chọn, phản hồi và giới thiệu.'],
  ]),
  pillars:
    node('CHIẾN LƯỢC TRUYỀN THÔNG TÍCH HỢP', 'Organic Việt Nam – ADIGO', '', 'dark') +
    pillargrid() +
    node('THƯƠNG HIỆU – NIỀM TIN – THỊ TRƯỜNG', 'Tích lũy giá trị và nâng cao năng lực cạnh tranh', '', 'dark'),
  productflow: steps([
    ['ORGANIC FARM – Giá trị từ nguồn sản xuất', 'Giống vật nuôi, vùng sản xuất, thức ăn, thảo dược, kỹ thuật nuôi và quy trình chăm sóc.'],
    ['ORGANIC FOOD – Giá trị từ sản phẩm', 'Quy cách, giết mổ, sơ chế, pha lóc, đóng gói và kiểm soát chất lượng.'],
    ['ORGANIC DISTRIBUTION – Giá trị từ chuỗi cung ứng', 'Bảo quản, lưu kho, vận chuyển, giao nhận và lưu chuyển hàng hóa.'],
    ['ADIGO – Giá trị từ công nghệ', 'Quản trị thông tin, kết nối dữ liệu, truy xuất và tổ chức thương mại.'],
    ['ADIGO MART & MARKETPLACE – Giá trị từ thương mại', 'Điểm tiếp cận sản phẩm, trải nghiệm mua hàng và kết nối thị trường.'],
    ['CUSTOMER – Giá trị từ trải nghiệm', 'Chất lượng sử dụng, dịch vụ, phản hồi và sự gắn kết với thương hiệu.'],
  ]),
  adigo:
    node('ADIGO', 'Digital Business Platform', '', 'blue') +
    cards(
      [
        ['Quản trị sản xuất', 'Production Management'],
        ['Quản trị chất lượng', 'Quality Management'],
        ['Chuỗi cung ứng', 'Supply Chain'],
        ['Thương mại', 'Commerce'],
        ['Quản trị khách hàng', 'Customer Management'],
        ['Truy xuất nguồn gốc', 'Traceability'],
      ],
      'cards',
      'Các nhóm năng lực công nghệ định hướng truyền thông của ADIGO (chỉ công bố tính năng đã sẵn sàng vận hành thực tế).'
    ),
  executive: bars(
    [
      ['Năng lực doanh nghiệp và hệ sinh thái', 50],
      ['Đội ngũ, chuyên gia và người lao động', 30],
      ['Chủ tịch và Ban lãnh đạo', 20],
    ],
    'Định hướng tỷ trọng khai thác hình ảnh trong nội dung doanh nghiệp'
  ),
  peso: cards(
    [
      ['Paid Media · Truyền thông trả phí', 'Quảng cáo thương hiệu, phân phối nội dung, hợp tác truyền thông có trả phí.'],
      ['Earned Media · Truyền thông lan tỏa tự nhiên', 'Báo chí đưa tin độc lập, đánh giá, đề cập thương hiệu và uy tín cộng đồng.'],
      ['Shared Media · Truyền thông chia sẻ', 'Mạng xã hội, cộng đồng, đối tác, nhân viên và khách hàng.'],
      ['Owned Media · Kênh truyền thông sở hữu', 'Website, ứng dụng, Fanpage, email và hệ thống nội dung doanh nghiệp.'],
    ],
    'cards two'
  ),
  contentmix: bars(
    [
      ['Doanh nghiệp & thương hiệu', 25],
      ['Sản xuất & thảo dược', 20],
      ['Sản phẩm & chất lượng', 25],
      ['Chuỗi cung ứng & phân phối', 5],
      ['Công nghệ & thương mại ADIGO', 15],
      ['Khách hàng, đối tác & cộng đồng', 10],
    ],
    'Tỷ trọng đề xuất cho hệ thống nội dung truyền thông tích hợp toàn hệ sinh thái. Điều chỉnh theo từng quý và chiến dịch.'
  ),
  folders: steps(
    [
      ['01. Strategy & Brand Management', 'Chiến lược, guideline, logo, nhận diện'],
      ['02. Corporate Communications', 'Hồ sơ doanh nghiệp, lãnh đạo, đối ngoại'],
      ['03. Organic Farm', 'Vùng sản xuất, nguyên liệu, thảo dược'],
      ['04. Organic Food', 'Sản phẩm, bao bì, catalog, chất lượng'],
      ['05. Organic Distribution', 'Kho, bảo quản, giao nhận, vận chuyển'],
      ['06. ADIGO Ecosystem', 'Công nghệ, Mart, Marketplace'],
      ['07. Media Production', 'Ảnh gốc, video gốc, file dựng, thành phẩm'],
      ['08. PR & Events', 'Báo chí, press kit, sự kiện'],
      ['09. Campaigns', 'Chiến dịch và nội dung xuất bản'],
      ['10. Reports & Archive', 'Báo cáo, KPI, lưu trữ'],
    ],
    'ORGANIC COMMUNICATIONS'
  ),
  quarters: quartercards(),
  gantt: ganttPlaceholderHtml(),
  batch: steps(
    [
      ['T-14 đến T-7 · Chuẩn bị thị trường & nhận diện', 'Giới thiệu vùng sản xuất, mô hình chăn nuôi ứng dụng thảo dược, hồ sơ chất lượng; phối hợp Sale/CTV tiếp nhận nhu cầu đặt trước.'],
      ['T-7 đến T-1 · Đếm ngược & hoàn tất điểm bán', 'Hoàn tất POSM, bao bì, tem nhãn, bảng giá tại điểm bán thực tế; kiểm tra truy xuất và sẵn sàng thông cáo ra mắt.'],
      ['T0 · Chính thức ra mắt & mở bán (01/2027)', 'Công bố chính thức sản phẩm gà, quy cách, kênh mua hàng, điểm bán thực tế; phát hành TVC/video, PR báo chí & sự kiện ra mắt phù hợp ngân sách.'],
      ['T+1 đến T+7 · Tuần đầu sau mở bán', 'Tăng cường nội dung tại điểm bán, hướng dẫn chế biến – bảo quản, trải nghiệm & phản hồi khách hàng đầu tiên, phối hợp chiến dịch Tết 2027.'],
      ['T+8 đến T+14 · Chuyển giao lứa gối đầu 15 ngày', 'Đánh giá sức mua từng lứa cùng Kinh doanh và nối tiếp truyền thông lứa mới trong chương trình hỗ trợ bán hàng thường xuyên (C08), không mở lại chiến dịch ra mắt mới.'],
    ],
    'Chu kỳ triển khai quanh T0 và lứa sản phẩm gối đầu 15 ngày'
  ),
  org:
    node('BAN LÃNH ĐẠO', '', '', 'dark') +
    '<div class="connector">↓</div>' +
    node('GIÁM ĐỐC TRUYỀN THÔNG', 'Chiến lược · Quản trị · Điều hành', '', 'dark') +
    '<div class="connector">↓</div>' +
    cards(
      [
        ['PR & Corporate Affairs', 'Báo chí · Đối ngoại · Sự kiện'],
        ['Content & Digital', 'Nội dung · Quản trị kênh'],
        ['Brand & Design', 'Thương hiệu · Thiết kế'],
        ['Media Production', 'Quay · Chụp · Dựng phim'],
      ],
      'cards two'
    ) +
    node('PHẠM VI PHỤC VỤ TOÀN HỆ SINH THÁI', 'ORGANIC VIỆT NAM · FARM · FOOD · DISTRIBUTION · ADIGO · ADIGO MART · MARKETPLACE'),
  workflow: steps(
    [
      'Tiếp nhận yêu cầu',
      'Lập kế hoạch',
      'Thu thập dữ liệu',
      'Xác minh chuyên môn',
      'Sản xuất nội dung',
      'Kiểm duyệt',
      'Phê duyệt',
      'Xuất bản',
      'Đo lường hiệu quả',
      'Lưu trữ & cải tiến',
    ].map((s) => [s, ''])
  ),
  scenarios: cards([
    ['PHƯƠNG ÁN A · 1,8 tỷ', 'Tinh gọn · 150 triệu/tháng'],
    ['PHƯƠNG ÁN B · 3 tỷ', 'Phát triển · 250 triệu/tháng (giữ nguyên tổng mức tham chiếu)'],
    ['PHƯƠNG ÁN C · 4,8 tỷ', 'Mở rộng · 400 triệu/tháng'],
  ]),
  budget:
    '<div class="budget-widget"><h4>Mô hình dự toán ngân sách 2027</h4><div class="budget-default">' +
    bars(budgetnames.map((n, i) => [n, weights[i]])) +
    '<p>Ngân sách tham chiếu: 3.000 triệu đồng/năm · 250 triệu đồng/tháng (giữ nguyên tổng ngân sách; ngân sách chuẩn bị 11–12/2026 phê duyệt riêng).</p></div><div class="budget-interactive" data-budget></div></div>',
  quarterbudget: bars(
    [
      ['Quý I · 1.050 triệu (ưu tiên 01–02/2027)', 35],
      ['Quý II · 660 triệu', 22],
      ['Quý III · 600 triệu', 20],
      ['Quý IV · 690 triệu', 23],
    ],
    'Minh họa theo phương án ngân sách 3 tỷ đồng/năm (ngân sách chuẩn bị 11–12/2026 lập dự toán và phê duyệt giải ngân riêng trước T0).'
  ),
  evaluation: steps([
    ['OUTPUT – Kết quả triển khai', 'Bài viết, video, sự kiện, ấn phẩm và độ phủ.'],
    ['OUTTAKE – Mức độ tiếp nhận', 'Khách hàng hiểu và ghi nhớ gì về doanh nghiệp.'],
    ['OUTCOME – Thay đổi nhận thức', 'Niềm tin, mức độ ưu tiên lựa chọn và ý định mua.'],
    ['IMPACT – Tác động doanh nghiệp', 'Danh tiếng, phát triển thị trường và quan hệ hợp tác.'],
  ]),
  directorkpi: bars([
    ['Giá trị thương hiệu và danh tiếng', 25],
    ['Truyền thông sản phẩm, hỗ trợ kinh doanh', 25],
    ['Báo chí, đối ngoại và sự kiện', 15],
    ['Nội dung, sáng tạo và truyền thông số', 15],
    ['Quản trị nhân sự, tiến độ và ngân sách', 10],
    ['Truyền thông nội bộ và kiểm soát rủi ro', 10],
  ]),
  projectstats: cards(
    [
      [String(Object.keys(planMeta.projectsMeta).length), 'Dự án gốc (A01–F07)'],
      [String(preLaunchProjectsCount), 'Dự án cần xong trước mở bán'],
      [String(planMeta.campaigns.length), 'Chiến dịch cấp doanh nghiệp'],
    ],
    'cards'
  ),
  checklist:
    `<div class="checklist"><div class="panel-head"><div><h4>Checklist 20 nhiệm vụ ưu tiên theo tác động mở bán 01/2027</h4><div class="checklist-meta"><span data-prelaunchcount>0/${preLaunchTasksCount} nhiệm vụ bắt buộc trước mở bán</span></div></div><strong data-checkcount>0/20</strong></div><div class="track"><span data-checkbar style="width:0%"></span></div>` +
    planMeta.priorities
      .map(
        (item, i) =>
          `<label class="checkrow"><input type="checkbox" data-task="${i}"><span><div class="checkrow-head"><strong>${i + 1}. ${esc(
            item.title
          )}</strong>${
            item.preLaunchRequired
              ? '<span class="req-badge">Bắt buộc trước mở bán</span>'
              : '<span class="opt-badge">Nền tảng & vận hành</span>'
          }</div><small>${esc(item.group)} · Dự án liên quan: ${esc(item.projectId)}</small></span></label>`
      )
      .join('') +
    '<button class="btn" data-copytasks>Sao chép danh sách công việc</button></div>',
  timeallocation: bars([
    ['Chiến lược, kế hoạch và điều hành', 30],
    ['Báo chí, đối ngoại và quan hệ cấp cao', 25],
    ['Quản trị thương hiệu và chiến dịch', 20],
    ['Phối hợp liên phòng ban và hệ sinh thái', 15],
    ['Kiểm duyệt, đánh giá và báo cáo', 10],
  ]),
  summarymap:
    node('CHIẾN LƯỢC TRUYỀN THÔNG 2027 · V2.1', 'ORGANIC VIỆT NAM & ADIGO', '', 'dark') +
    '<h4>NỀN TẢNG PHÁT TRIỂN</h4>' +
    cards([
      ['NÔNG NGHIỆP', 'Phát triển năng lực sản xuất và nguồn nguyên liệu.'],
      ['THỰC PHẨM', 'Phát triển sản phẩm, chất lượng và giá trị gia tăng.'],
      ['CÔNG NGHỆ', 'Quản trị, kết nối dữ liệu, thương mại và thị trường.'],
    ]) +
    '<h4>KIẾN TRÚC HỆ SINH THÁI</h4>' +
    chain() +
    cards(
      [
        ['ADIGO MART', 'Bán lẻ'],
        ['ADIGO MARKETPLACE', 'Thương mại số'],
      ],
      'cards two'
    ) +
    '<h4>10 TRỤ CỘT TRUYỀN THÔNG</h4>' +
    pillargrid() +
    node('TỔ CHỨC – NHÂN SỰ – NGÂN SÁCH – KPI', 'Hệ thống quản trị và thực thi') +
    node('CUSTOMER', 'Khách hàng · Người tiêu dùng · Đối tác', '', 'dark') +
    cards([
      ['THƯƠNG HIỆU', 'Nhận biết'],
      ['NIỀM TIN', 'Danh tiếng'],
      ['THỊ TRƯỜNG', 'Phát triển'],
    ]) +
    node('TÍCH LŨY GIÁ TRỊ – PHÁT TRIỂN BỀN VỮNG') +
    '<p class="figcaption">Sơ đồ tổng thể liên kết chiến lược kinh doanh, kiến trúc hệ sinh thái và hệ thống truyền thông Organic Việt Nam năm 2027 (V2.1).</p>',
  closing: cards(
    [
      ['ĐỊNH VỊ THƯƠNG HIỆU', 'Kiến tạo hệ sinh thái giá trị · Nông nghiệp · Thực phẩm · Công nghệ'],
      ['CÔNG THỨC CHIẾN LƯỢC', 'FARM → FOOD → DISTRIBUTION → ADIGO → CUSTOMER'],
      ['ĐỊNH HƯỚNG TRUYỀN THÔNG 2027', 'Xây dựng thương hiệu. Tạo dựng niềm tin. Mở bán sản phẩm gà từ 01/2027 và phát triển thị trường.'],
      ['GIÁ TRỊ PHÁT TRIỂN DÀI HẠN', 'Chất lượng sản phẩm – Giá trị khách hàng – Năng lực hệ sinh thái.'],
    ],
    'messagecards'
  ),
};

const mdSource = fs.readFileSync(path.join(root, 'strategy.md'), 'utf8');
const chunks = mdSource.split(/<!-- PART:(\d+) -->/);
const introHtml = mdToHtml(chunks[0]);

const sections = [];
const projects = [];
const search = [];

for (let idx = 1; idx < chunks.length; idx += 2) {
  const p = Number(chunks[idx]);
  let rendered = mdToHtml(chunks[idx + 1]);

  for (const match of rendered.matchAll(/<!-- WIDGET:(\w+) -->/g)) {
    const key = match[1];
    if (!widgets[key]) throw new Error(`Unknown widget: ${key}`);
    rendered = rendered.replace(match[0], `<div class="visual">${widgets[key]}</div>`);
  }

  const h1Match = rendered.match(/<h1>([\s\S]*?)<\/h1>/);
  const title = h1Match ? stripTags(h1Match[1]) : `Phần ${p}`;
  if (h1Match) rendered = rendered.replace(h1Match[0], '');

  const headings = [];
  rendered = rendered.replace(/<(h[23])>([\s\S]*?)<\/\1>/g, (full, tag, inner) => {
    const plain = stripTags(inner);
    const m = plain.match(/^([0-9]+(?:\.[0-9]+)*)\./);
    if (m) {
      const ident = 'm' + m[1].replace(/\./g, '-');
      headings.push({ id: ident, title: plain, level: Number(tag[1]) });
      return `<${tag} id="${ident}">${inner}</${tag}>`;
    }
    return full;
  });

  rendered = rendered.replace(/<table>([\s\S]*?)<\/table>/g, (tblFull, tblInner) => {
    if (p === 10 && /<td>[A-F]\d\d<\/td>/.test(tblInner)) {
      const rowMatches = [...tblInner.matchAll(/<tr>([\s\S]*?)<\/tr>/g)];
      const enrichedBodyRows = [];
      for (const rm of rowMatches) {
        const tds = [...rm[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => stripTags(m[1]));
        if (tds.length >= 4 && /^[A-F]\d\d$/.test(tds[0])) {
          const [id, name, priority, schedule] = tds;
          const meta = planMeta.projectsMeta[id];
          if (!meta) throw new Error(`Missing projectsMeta for ${id}`);
          const projObj = {
            id,
            name,
            priority: meta.priority || priority,
            schedule: meta.schedule || schedule,
            startDate: meta.startDate,
            startIso: meta.startIso,
            deadline: meta.deadline,
            deadlineIso: meta.deadlineIso,
            defaultOwner: meta.defaultOwner,
            deliverable: meta.deliverable,
            dependencies: meta.dependencies,
            relatedCampaign: meta.relatedCampaign,
            launchReadiness: meta.launchReadiness,
            preLaunchRequired: Boolean(meta.preLaunchRequired),
          };
          projects.push(projObj);
          enrichedBodyRows.push(
            `<tr id="project-${id}">` +
              `<td>${esc(id)}</td>` +
              `<td><strong>${esc(name)}</strong></td>` +
              `<td style="text-align:center"><span class="priority ${projObj.priority.toLowerCase()}">${esc(projObj.priority)}</span></td>` +
              `<td>${esc(projObj.startDate)}</td>` +
              `<td>${esc(projObj.deadline)}</td>` +
              `<td>${esc(projObj.defaultOwner)}</td>` +
              `<td>${esc(projObj.deliverable)}</td>` +
              `<td>${esc(projObj.dependencies)}</td>` +
              `<td>${esc(projObj.relatedCampaign)}</td>` +
              `<td>${projObj.preLaunchRequired ? `<span class="req-badge">${esc(projObj.launchReadiness)}</span>` : esc(projObj.launchReadiness)}</td>` +
              `</tr>`
          );
        }
      }
      if (enrichedBodyRows.length) {
        return (
          `<div class="table-scroll"><table><thead><tr>` +
          `<th>Mã</th><th>Dự án</th><th>Ưu tiên</th><th>Bắt đầu</th><th>Deadline</th><th>Phụ trách đề xuất</th><th>Sản phẩm bàn giao</th><th>Phụ thuộc</th><th>Chiến dịch</th><th>Sẵn sàng mở bán</th>` +
          `</tr></thead><tbody>${enrichedBodyRows.join('')}</tbody></table></div>`
        );
      }
    }
    return `<div class="table-scroll"><table>${tblInner}</table></div>`;
  });

  const h2Parts = rendered.split(/(?=<h2\b)/);
  for (const part of h2Parts) {
    const hm = part.match(/^<h2 id="([^"]*)">([\s\S]*?)<\/h2>([\s\S]*)$/);
    if (hm) {
      search.push({
        p,
        id: hm[1],
        title: stripTags(hm[2]),
        body: stripTags(hm[3]),
      });
    }
  }
  if (p === 13) {
    search.push({ p, id: '', title, body: stripTags(rendered) });
  }

  sections.push({ p, title, html: rendered, headings });
}

const h2Total = sections.reduce((acc, s) => acc + s.headings.filter((h) => h.level === 2).length, 0);
if (projects.length !== 57) throw new Error(`Expected 57 projects, got ${projects.length}`);
if (h2Total !== 50) throw new Error(`Expected 50 h2 headings, got ${h2Total}`);

const dataObj = {
  versionMeta: planMeta.versionMeta,
  sections,
  intro: introHtml,
  projects,
  campaigns: planMeta.campaigns,
  ongoingTrack: planMeta.ongoingTrack,
  quarters: planMeta.quarters,
  roadmapMonths: planMeta.roadmapMonths,
  priorities: planMeta.priorities,
  search,
  budgetnames,
  weights,
  portal: portalData,
};

fs.writeFileSync(path.join(root, 'data.json'), JSON.stringify(dataObj), 'utf8');

const mainPartCount = sections.filter((s) => s.p <= 12).length;
const metricItems = [
  [String(mainPartCount), 'Phần chiến lược', `${h2Total} mục`, '#all'],
  ['10', 'Trụ cột', 'Truyền thông tích hợp', '#p4'],
  [String(planMeta.campaigns.length), 'Chiến dịch', 'Lộ trình 12/2026–12/2027', '#p6/m27'],
  [String(projects.length), 'Dự án', `${preLaunchProjectsCount} cần xong trước T0`, '#tracker'],
];

const dashboardHtml =
  `<section class="hero strategy-banner" aria-labelledby="strategy-banner-title">` +
  `<h1 id="strategy-banner-title" class="banner-sr-only">Chiến lược truyền thông tổng thể 2027 – V2.1</h1>` +
  `<img class="strategy-banner-image" src="assets/images/banners/organicvn-strategy-banner-2027.webp?v=2" width="2172" height="724" fetchpriority="high" loading="eager" decoding="async" alt="Organic Việt Nam. Chiến lược truyền thông tổng thể 2027 – Kiến tạo hệ sinh thái giá trị: Nông nghiệp, Thực phẩm, Công nghệ ADIGO." onerror="this.hidden=true;this.closest('.strategy-banner').classList.add('banner-unavailable')">` +
  `<div class="banner-fallback" role="status">Organic Việt Nam · Chiến lược truyền thông tổng thể 2027 · ${esc(planMeta.versionMeta.shortVersion)}</div>` +
  `<div class="hero-actions banner-actions"><a href="#p1" class="btn primary">Đọc chiến lược <span aria-hidden="true">→</span></a><a href="#all" class="btn ghost"><span aria-hidden="true">▤</span> Xem tài liệu V2.1</a></div>` +
  `</section>` +
  `<div class="metricgrid" id="dash-metrics">` +
  metricItems.map(([v, t, s, u]) => `<a class="metric" href="${u}"><small>${esc(t)}</small><strong>${esc(v)}</strong><span>${esc(s)} ↗</span></a>`).join('') +
  `</div>` +
  `<div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><div class="eyebrow">01 / BUSINESS ARCHITECTURE</div><h2>Kiến trúc hệ sinh thái</h2></div><a href="#p2" class="textlink">Chi tiết →</a></div>${ecosystem(true)}</section><section class="panel"><div class="panel-head"><div><div class="eyebrow">02 / STRATEGIC GOALS</div><h2>6 mục tiêu chiến lược</h2></div><a class="textlink" href="#p1/m3">Chi tiết →</a></div>${widgets.goals}</section></div>` +
  `<section class="panel"><div class="panel-head"><div><div class="eyebrow">03 / VALUE CREATION</div><h2>Chuỗi giá trị tích hợp</h2></div><a href="#p2/m6" class="textlink">Mô hình tạo giá trị →</a></div>${chain()}</section>` +
  `<section class="panel"><div class="panel-head"><div><div class="eyebrow">04 / COMMUNICATION PILLARS</div><h2>10 trụ cột truyền thông</h2></div><a href="#p4" class="textlink">Toàn bộ →</a></div>${pillargrid()}</section>` +
  `<section class="panel"><div class="panel-head"><div><div class="eyebrow">05 / ROADMAP · ${esc(planMeta.versionMeta.shortVersion)}</div><h2>Lộ trình triển khai 12/2026 – 12/2027</h2></div><a href="#p6/m26" class="textlink">Kế hoạch 12 tháng →</a></div>${quartercards()}${ganttPlaceholderHtml()}</section>` +
  `<div class="dashboard-grid"><section class="panel"><div class="panel-head"><div><div class="eyebrow">06 / UPCOMING SCHEDULE</div><h2>Kế hoạch sắp tới (7 · 15 · 30 ngày)</h2></div><a href="#tracker" class="textlink">Mở Tracker →</a></div><div id="dash-upcoming"></div></section><section class="panel"><div class="panel-head"><div><div class="eyebrow">07 / PORTFOLIO</div><h2>Theo dõi triển khai</h2></div><a href="#tracker" class="textlink">Cập nhật →</a></div><div id="dash-progress"></div><p class="muted" id="dash-sync-note">Trạng thái do người dùng nhập. Đăng nhập Google để lưu và đồng bộ lên Cloud.</p><div id="dash-auth-actions" class="dash-auth-actions"><a class="btn" href="#p10/m44">Checklist 20 nhiệm vụ cấp thiết →</a></div></section></div>` +
  `<section class="panel"><div class="panel-head"><div><div class="eyebrow">08 / RESOURCE PLAN</div><h2>Ngân sách & KPI</h2></div><a href="#p8" class="textlink">Chi tiết →</a></div><div class="budgethero"><small>Phương án B · giữ nguyên tổng mức tham chiếu</small><strong>3 tỷ <small>đồng/năm</small></strong></div>${widgets.quarterbudget}<a class="btn" href="#p8/m35">Mô phỏng ngân sách →</a> <a class="btn" href="#p9">Bộ KPI trước & sau mở bán →</a></section>` +
  `<section class="panel"><div class="panel-head"><div><div class="eyebrow">09 / DOCUMENT LIBRARY</div><h2>Toàn bộ nội dung chiến lược</h2></div><a href="#all" class="textlink">Đọc liên tục →</a></div><div class="chaptergrid">` +
  sections
    .slice(0, 12)
    .map(
      (s) =>
        `<a href="#p${s.p}" class="chapter-card"><span>${String(s.p).padStart(2, '0')}</span><strong>${esc(
          s.title.split('. ').slice(1).join('. ').charAt(0).toUpperCase() +
            s.title.split('. ').slice(1).join('. ').slice(1).toLowerCase()
        )}</strong><small>${s.headings.filter((h) => h.level === 2).length} mục →</small></a>`
    )
    .join('') +
  `<a href="#p13" class="chapter-card"><span>PL</span><strong>Phụ lục và xác nhận phê duyệt</strong><small>15 tài liệu · V2.1 →</small></a></div></section>`;

fs.writeFileSync(path.join(root, 'dashboard.html'), dashboardHtml, 'utf8');

// Bundle modular source/app.js -> IIFE for standalone index.html
const appResult = await esbuild.build({
  entryPoints: [path.join(root, 'app.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  write: false,
});
const appBundleCode = appResult.outputFiles[0].text.replace(/<\/script/gi, '<\\/script').trim();

// Sync into index.html cleanly while preserving FIREBASE_TRACKER_START...END placeholder
const indexPath = path.join(outDir, 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf8');

const styleCss = fs.readFileSync(path.join(root, 'style.css'), 'utf8').trim() + '\n' + fs.readFileSync(path.join(root, 'modules/ai-assistant/ai-chat.css'), 'utf8').trim();
const dataJsonSafe = JSON.stringify(dataObj).replace(/<\/script/gi, '<\\/script');

const fontTags =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">';

indexHtml = indexHtml.replace(
  /<meta name="description" content="[^"]*">/,
  `<meta name="description" content="Organic Workplace V1.0 – Cổng thông tin nội bộ, thư viện tài liệu, hội nhập nhân viên và quản trị chiến lược Organic Việt Nam.">`
);
indexHtml = indexHtml.replace(
  /<title>[^<]*<\/title>/,
  `<title>Organic Workplace | Cổng thông tin nội bộ Organic Việt Nam (V1.0)</title>`
);
if (!indexHtml.includes('fonts.googleapis.com/css2')) {
  indexHtml = indexHtml.replace(/<\/title>/, `</title>${fontTags}`);
}
indexHtml = indexHtml.replace(/<style>[\s\S]*?<\/style>/, () => `<style>${styleCss}</style>`);

const shellHtml =
  `<!-- APP_SHELL_START -->` +
  `<aside class="sidebar" id="sidebar">` +
  `<a class="brand" href="#home"><img class="brand-symbol" src="assets/organic-vietnam-symbol.svg" alt="" width="44" height="42"><div class="brand-text"><div class="wordmark">ORGANIC VIỆT NAM</div><div class="brand-sub" id="brand-sub">INTERNAL WORKPLACE</div></div></a>` +
  `<div class="workspace" id="sidebar-workspace"><strong>ORGANIC WORKPLACE</strong><small>V1.0 · Cổng thông tin nội bộ</small></div>` +
  `<nav class="nav" id="nav" aria-label="Điều hướng cổng thông tin nội bộ"></nav>` +
  `<div class="sidebar-foot" id="sidebar-foot">ORGANIC WORKPLACE V1.0<br>Nông nghiệp · Thực phẩm · Công nghệ</div>` +
  `</aside>` +
  `<div class="overlay"></div>` +
  `<div class="shell">` +
  `<header class="topbar">` +
  `<button id="menubtn" aria-expanded="false" aria-controls="sidebar" class="iconbtn hamburger" aria-label="Mở menu">☰</button>` +
  `<button id="sidebar-collapse-btn" aria-pressed="false" class="iconbtn collapse-toggle" title="Thu gọn thanh bên" aria-label="Thu gọn thanh bên">«</button>` +
  `<div class="crumb" id="crumb">Organic Việt Nam / Trang chủ</div>` +
  `<div class="actions">` +
  `<button class="searchtrigger" id="searchbtn" aria-label="Tìm kiếm toàn hệ thống"><span>⌕</span><span class="searchtxt">Tìm tài liệu, phòng ban, dự án…</span><kbd>Ctrl K</kbd></button>` +
  `<button class="btn small printbtn" id="printbtn" style="display:none">Tải tài liệu PDF</button>` +
  `<a class="btn small" id="topbar-context-link" href="#home" style="display:none">Trang chủ</a>` +
  `<div id="topbar-auth" class="topbar-auth"></div>` +
  `</div>` +
  `</header>` +
  `<main class="main" id="main"></main>` +
  `<footer class="footer">ORGANIC WORKPLACE V1.0 · Cổng thông tin nội bộ Organic Việt Nam · Nông nghiệp · Thực phẩm · Công nghệ · Chiến lược Truyền thông 2027 (V2.1 – Chờ phê duyệt)</footer>` +
  `</div>` +
  `<div class="searchoverlay" id="searchoverlay" role="dialog" aria-label="Tìm kiếm toàn hệ thống"><div class="searchbox"><div class="searchhead"><input type="search" id="searchinput" placeholder="Tìm tài liệu, nội quy, phòng ban, chiến lược, dự án…" aria-label="Từ khóa tìm kiếm"><button class="iconbtn" id="searchclose" aria-label="Đóng">×</button></div><div id="results" class="results"></div></div></div>` +
  `<div id="toast" class="toast" role="status"></div>` +
  `<noscript>Vui lòng bật JavaScript để sử dụng Organic Workplace và các chức năng tương tác.</noscript>` +
  `<!-- APP_SHELL_END -->`;

const shellMarkerRe = /<!-- APP_SHELL_START -->[\s\S]*?<!-- APP_SHELL_END -->/;
if (shellMarkerRe.test(indexHtml)) {
  indexHtml = indexHtml.replace(shellMarkerRe, () => shellHtml);
} else {
  indexHtml = indexHtml.replace(
    /<aside class="sidebar"[\s\S]*?<noscript>[\s\S]*?<\/noscript>/,
    () => shellHtml
  );
}

indexHtml = indexHtml.replace(
  /<template id="dashboard-template">[\s\S]*?<\/template>/,
  () => `<template id="dashboard-template">${dashboardHtml}</template>`
);
indexHtml = indexHtml.replace(
  /<script type="application\/json" id="strategy-data">[\s\S]*?<\/script>/,
  () => `<script type="application/json" id="strategy-data">${dataJsonSafe}</script>`
);

const appMarkerRe = /<!-- APP_BUNDLE_START -->[\s\S]*?<!-- APP_BUNDLE_END -->/;
const appTag = `<!-- APP_BUNDLE_START --><script>${appBundleCode}</script><!-- APP_BUNDLE_END -->`;
if (appMarkerRe.test(indexHtml)) {
  indexHtml = indexHtml.replace(appMarkerRe, () => appTag);
} else {
  indexHtml = indexHtml.replace(
    /<script>'use strict';[\s\S]*?<\/script>(?=\s*<\/body>)/,
    () => appTag
  );
}

fs.writeFileSync(indexPath, indexHtml, 'utf8');
console.log(
  `Built ORGANIC WORKPLACE V1.0 + Comms V2.1: sections=${sections.length}, h2=${h2Total}, campaigns=${planMeta.campaigns.length}, projects=${projects.length}, preLaunchProjects=${preLaunchProjectsCount}, docs=${portalData.documents.length}, depts=${portalData.departments.length}`
);
