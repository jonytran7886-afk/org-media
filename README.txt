ORGANIC WORKPLACE V1.0 — CỔNG THÔNG TIN NỘI BỘ & QUẢN TRỊ CHIẾN LƯỢC ORGANIC VIỆT NAM

I. TỔNG QUAN HỆ THỐNG
- Tên hệ thống: ORGANIC WORKPLACE (Cổng thông tin nội bộ Organic Việt Nam) — Phiên bản ứng dụng V1.0.
- 6 phân hệ chính:
  1. Trang chủ (#home): Banner chào mừng, truy cập nhanh 6 phân hệ, thông báo nội bộ, tài liệu mới, kế hoạch 7/15/30 ngày, 8 không gian phòng ban và khu vực nhân viên mới.
  2. Tài liệu nội bộ (#documents): Document Center 8 nhóm (Nhóm A–H), tìm kiếm không dấu, lọc theo danh mục/phòng ban/trạng thái và trình đọc tích hợp (Markdown V2.1, HTML archive iframe, PDF, hình ảnh, tải xuống).
  3. Hội nhập nhân viên (#onboarding): Lộ trình 7 bước tuần tự, liên kết trực tiếp tới tài liệu gốc trong Thư viện trung tâm và lưu tiến độ đọc cục bộ.
  4. Chiến lược & Kế hoạch (#strategies, #departments): Tách biệt Chiến lược Tập đoàn (#strategies/group) và Workspace thống nhất 6 tab của 8 phòng ban. Toàn bộ Chiến lược truyền thông tổng thể 2027 (V2.1 · Chờ phê duyệt) được tích hợp nguyên vẹn trong Phòng Truyền thông (#departments/truyen-thong).
  5. Dự án & Công việc (#projects, #projects/tasks): Tổng hợp trực tiếp từ Master Project Tracker (57 dự án A01–F07, 10 trường điều hành) và Checklist 20 nhiệm vụ ưu tiên — không sao chép dữ liệu độc lập.
  6. Thông tin tổ chức (#organization, #organization/departments): Giới thiệu doanh nghiệp, tầm nhìn/sứ mệnh/giá trị cốt lõi, kiến trúc hệ sinh thái, khung sơ đồ tổ chức và hồ sơ chức năng phòng ban.

II. HƯỚNG DẪN QUẢN TRỊ & CẬP NHẬT DỮ LIỆU

1. Cách bổ sung tài liệu nội bộ mới:
- Bước 1: Đặt tệp gốc (PDF, DOCX, XLSX, hình ảnh, HTML...) vào thư mục `public/documents/` (hoặc thư mục con tương ứng).
- Bước 2: Mở `source/data/documents.json` và thêm một đối tượng JSON mới theo cấu trúc:
  `id`, `documentCode`, `title`, `description`, `categoryId`, `departmentId`, `version`, `status`, `issuedDate`, `effectiveDate`, `updatedAt`, `fileType`, `filePath`, `contentPath`, `internalRoute`, `readerKind` (`pdf`, `image`, `html-frame`, `download`, `pending`), `requiredReading` (true/false), `relatedDocumentIds`.
  - Ví dụ đường dẫn file PDF đặt ở `public/documents/noi-quy.pdf`: điền `"filePath": "documents/noi-quy.pdf"`, `"readerKind": "pdf"`, `"status": "Đang có hiệu lực"`.
- Bước 3: Chạy `npm run build` để đóng gói dữ liệu vào `index.html`.

2. Cách thêm danh mục tài liệu:
- Mở `source/data/document-categories.json` và thêm đối tượng mới gồm `id`, `code` (ví dụ: Nhóm I), `name`, `description`, `order`.
- Các tài liệu thuộc nhóm mới dùng đúng `categoryId` trùng với `id` vừa tạo. Sau đó chạy `npm run build`.

3. Cách thêm hoặc sắp xếp phòng ban:
- Mở `source/data/departments.json`. Thêm, sửa thông tin hoặc điều chỉnh thứ tự các phần tử (`id`, `order`, `name`, `shortName`, `code`, `icon`, `structureStatus`, `summary`, `functions`, `coordination`, `strategyStatus`, `workspaceMode`).
- Giao diện Home, Chiến lược, Danh mục phòng ban, Tìm kiếm và Thông tin tổ chức sẽ tự động cập nhật sau khi chạy `npm run build`.

4. Cách bổ sung tài liệu chiến lược phòng ban:
- Bước 1: Đưa tài liệu chiến lược của phòng ban vào `public/documents/` và khai báo trong `source/data/documents.json` với `departmentId` tương ứng (ví dụ: `"kinh-doanh"`, `"marketing"`...).
- Bước 2: Cập nhật các trường `strategyStatus`, `strategyVersion`, `hasStrategyData`, `budgetSummary`, `kpiSummary` của phòng ban đó trong `source/data/departments.json`.
- Bước 3: Mở rộng tab render dữ liệu riêng trong `source/modules/departments/index.js` nếu phòng ban có cấu trúc bảng/widget tương tác mới, rồi chạy `npm run build`.

5. Cách cập nhật kế hoạch và dự án:
- Dự án phòng Truyền thông (57 dự án A01–F07, 11 chiến dịch, 20 nhiệm vụ ưu tiên):
  - Nguồn dữ liệu gốc nằm trong `source/strategy.md` và `source/plan-meta.json`.
  - Khi người dùng thao tác trên giao diện Master Project Tracker, trạng thái, phụ trách, ghi chú, checklist và dự toán ngân sách được lưu tự động vào trình duyệt (`localStorage` key `ovn-communications-2027-v2`) và đồng bộ lên Cloud (Firestore) sau khi đăng nhập Google.
- Thông báo nội bộ mới: cập nhật tại `source/data/announcements.json`.
- Mốc chiến lược Tập đoàn & phối hợp liên phòng ban: cập nhật tại `source/data/strategy-catalog.json`.

6. Cách thay đổi banner:
- Welcome Banner của Trang chủ Organic Workplace (`#home`): chỉnh sửa cấu hình/nội dung trong `source/data/company.json` hoặc giao diện CSS tại `source/modules/home/index.js` và `.wp-banner` trong `source/style.css`.
- Banner Chiến lược truyền thông 2027 (trong Không gian Phòng Truyền thông `#departments/truyen-thong`): thay tệp ảnh chuẩn tại `assets/images/banners/organicvn-strategy-banner-2027.webp` (tỷ lệ 3:1, 2172×724) hoặc cập nhật đường dẫn thẻ `<img>` trong `source/build.mjs`. Logo chính thức `assets/organic-vietnam-symbol.svg` giữ nguyên theo nhận diện chuẩn.

7. Cách build lại ứng dụng:
- Chạy lệnh:
  `npm run build`
  (Tự động chạy `node source/build.mjs` để biên dịch Markdown/JSON, bundle JS module bằng esbuild vào `index.html`, sau đó chạy `scripts/build.mjs` để inline Firebase Sync SDK).
- Kiểm tra mã nguồn & lint:
  `npm run lint`
- Khởi chạy server nội bộ (cổng 3000):
  `npm start`
- Tệp `index.html` sau khi build là bản độc lập hoàn chỉnh để deploy tĩnh (Cloudflare Workers / hosting tĩnh) hoặc chạy qua Express (`server.js`). Tệp `toan-van.html` được giữ nguyên làm bản lưu trữ đối chiếu V2.0 Final.

ORGANIC AI V1.0: xem ORGANIC-AI-HANDOVER.txt và .env.example để cấu hình Secrets, model, lập chỉ mục và chạy kiểm thử. API Key chỉ dùng phía backend.
