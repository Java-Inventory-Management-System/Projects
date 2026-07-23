# UX Design

> Tổng hợp UX đề xuất cho các luồng core và thiết kế chi tiết luồng Bảo hành.

---

## 1. UX đề xuất cho 6 luồng core

### 1.1 Nhập kho

Wizard 4 bước: **Chọn NCC/PO → Thêm SP+SL → Nhập serial → QC & xác nhận**.

- Bước QC hiện dạng checklist per-serial (toggle Pass/Fail), có progress bar kiểu "12/50 đã kiểm".
- Vị trí kho hiện dạng badge auto-gán sẵn (theo đề xuất auto-assign), kèm link "Đổi" bên cạnh — không bắt buộc chọn qua dropdown như hiện tại.

**Chi tiết UI quản lý capacity vị trí kho** (bổ sung cho `LocationsMapPage`, tab 3 của `/stock/units`):

- **Bin detail** (khi nhấp vào 1 bin) hiện dạng:
  ```
  Sản phẩm  15/50 đơn vị     ← productCount / maxCapacity
                                50% — thanh progress bar
  Trạng thái  Đang hoạt động
  ```
- **Bin color theo % capacity** (thay vì hardcode threshold cũ):

  | % capacity | Label | Màu |
  |---|---|---|
  | 0% | Trống | blue-50 |
  | 1–49% | Ít | blue-100 |
  | 50–89% | Có hàng | blue-200 |
  | ≥90% | Đầy | blue-300 |

  Fallback khi `maxCapacity = null`: threshold cũ (0, 10, 50).

- **Filter theo capacity** trên `LocationsMapPage`:

  | Filter | Ý nghĩa |
  |---|---|
  | Còn trống | `productCount = 0` |
  | Còn chỗ | `productCount > 0 && < maxCapacity` |
  | Gần đầy | `productCount >= 80% maxCapacity` |
  | Đầy | `productCount >= maxCapacity` |

- **Khi nhập kho — chọn bin**: LocationPicker hiển thị `fullCode + productCount/maxCapacity` cho từng bin; bin đã đầy vẫn chọn được nhưng hiện warning mềm "Bin đã đầy, cân nhắc chọn bin khác" (khớp SOP §2.2 Bước 4 — cảnh báo mềm, không chặn).

- **Chống mất dữ liệu khi thoát giữa chừng:** đã có `useBlocker` (cảnh báo trước khi rời trang) cho form nhập. Chưa có lưu draft vào localStorage — nếu cần, hướng dài hạn là lưu tạm form + hỏi "Khôi phục?" khi quay lại form.

### 1.2 Xuất kho

Giữ nguyên luồng hiện tại (người dùng không yêu cầu đổi UX), chỉ lưu ý gắn liền với bug double-booking — UI cần hiện rõ trạng thái "đang giữ chỗ" của serial trong lúc phiếu ở `pending_approval`, để NV khác không nhầm là còn trống.

- Modal chọn/override serial hỗ trợ: paste nhiều dòng cùng lúc (multi-line), import file `.txt`/`.csv`, highlight các dòng trùng lặp, progress bar dạng "12/50 đã chọn" khi số lượng lớn.

### 1.3 Kiểm kê lệch

Trang `StockCheckDetail` nên hiện bảng lệch **nổi bật ngay đầu trang** (highlight đỏ cho `MISSING`, xanh cho `UNEXPECTED`) thay vì lẫn trong danh sách toàn bộ items match.

Thêm nút **"Tạo phiếu điều chỉnh (N)"** áp dụng batch cho tất cả item lệch cùng lúc, thay vì phải tạo từng cái một — quan trọng vì tài liệu hiện mô tả tạo "manual" từng item, sẽ rất chậm nếu kiểm kê phát hiện 30-40 lệch cùng lúc.

### 1.4 Trả hàng khách

- Bắt buộc chọn export gốc **trước** (autocomplete theo mã phiếu xuất hoặc serial), sau đó mới hiện được `reason` (`CHANGE_MIND` / `DEFECTIVE` / `WRONG_ITEM`) — tránh NV chọn reason trước rồi mới tìm export gốc, dễ chọn sai.
- Nếu `reason=CHANGE_MIND`: hiện rõ số ngày còn lại trong hạn (đếm từ `export_receipt.approved_at`), **disable** submit nếu quá hạn thay vì để submit xong mới báo lỗi.
- Bước kiểm tra condition (STOCK): 2 lựa chọn `GOOD` / `DEFECTIVE`, nếu DEFECTIVE thêm lựa chọn con `SCRAP` hay `WARRANTY_TRANSFER`.

### 1.5 Điều chỉnh giá

Form đơn giản: chọn item nhập (nếu điều chỉnh giá vốn) hoặc sản phẩm (nếu điều chỉnh giá bán) → nhập giá mới + lý do bắt buộc → **hiện rõ "giá cũ → giá mới" side-by-side** trước khi submit → QL/Admin duyệt như các phiếu khác.

---

## 2. UX Bảo hành (Warranty)

> Thiết kế UI/UX chi tiết cho 3 route: `/warranty`, `/warranty/new`, `/warranty/:id`.
> Căn cứ nghiệp vụ: `02-sop-nghiep-vu.md §6`.
> Các điểm còn phụ thuộc quyết định business (xem `06-open-questions.md`) được đánh dấu **⏳ TBD** — UI vẫn thiết kế được, chỉ cần đổi tham số/copy khi có quyết định.

### 2.0 Bản đồ trạng thái ↔ actor ↔ màn hình

```
pending ──────→ received ──────→ under_evaluation ──────→ resolved
(SALES tạo)     (STOCK nhận      (QL duyệt              (STOCK thực thi
                 + kiểm tra)      resolution)             resolution)
```

| State | Ai thao tác tiếp | Component chính hiện ra trên Detail page |
|---|---|---|
| `pending` | STOCK | Nút "Xác nhận đã nhận hàng" |
| `received` | STOCK | Form kiểm tra: CONFIRMED / REJECTED |
| `under_evaluation` | QL | 4 Resolution Card: REPAIR/REPLACE/REFUND/REJECT |
| `resolved` | STOCK (thực thi) rồi terminal | Panel thực thi theo resolution đã chọn |

Toàn bộ Detail page dùng chung 1 **WarrantyTimeline** (dọc) làm neo thị giác, phần thân bên dưới đổi theo state + role hiện tại — không tách thành nhiều page riêng, tránh mất ngữ cảnh khi refresh/duyệt sau vài ngày.

### 2.1 `/warranty` — WarrantyListPage

**Bố cục:**

```
┌─────────────────────────────────────────────────────────┐
│ [Tất cả] [Chờ tiếp nhận] [Đang kiểm tra] [Chờ QL duyệt]  │  ← tabs = filter theo status
│ [Đang xử lý] [Hoàn tất]                                   │
├─────────────────────────────────────────────────────────┤
│ 🔍 Tìm theo serial / SĐT khách / mã phiếu     [+ Tiếp nhận mới] │
├─────────────────────────────────────────────────────────┤
│ Mã phiếu │ Serial │ Sản phẩm │ Khách │ Ngày nhận │ Trạng thái │ Resolution │
└─────────────────────────────────────────────────────────┘
```

**Chi tiết:**

- **Tabs** map trực tiếp 4 status, tab "Tất cả" mặc định. Đếm số lượng trên mỗi tab (badge số) — đặc biệt tab "Chờ QL duyệt" cần nổi bật vì đó là bottleneck thường gặp (QL bận).
- **Cột trạng thái**: dùng `WarrantyStatusBadge` (màu riêng từng state).
- **Cột cảnh báo**: icon ⚠ nhỏ cạnh serial nếu unit gốc đã qua **>2 lần đổi BH** — hiện ngay ở list, không phải đợi vào detail mới thấy.
- **Search** chấp nhận cả serial lẫn SĐT khách — vì khách thường không nhớ mã phiếu, chỉ nhớ SĐT lúc mua.
- Nút **"+ Tiếp nhận mới"** — hiện với SALES/STOCK/QL (theo phân quyền chung), dẫn tới `/warranty/new`.
- Dùng chung `PaginationBar` như các list page khác.

### 2.2 `/warranty/new` — WarrantyCreatePage (SALES)

Nguyên tắc thiết kế: **tra cứu trước, nhập tay sau** — không cho nhập mô tả lỗi trước khi biết chắc sản phẩm này đủ điều kiện BH, tránh SALES làm cả form rồi mới phát hiện hết hạn.

**Giai đoạn A — Tra cứu**

```
┌───────────────────────────────────────────┐
│  Quét hoặc nhập số serial...       [Tìm]   │  ← autofocus, hỗ trợ scan
└───────────────────────────────────────────┘
```

Sau khi tìm thấy, hiện **Serial Info Card**:

```
┌─────────────────────────────────────────────────────────┐
│ [ảnh SP]  RTX 4070 Super — SN: ABC123XYZ                │
│           Khách: Nguyễn Văn A · 0901234567               │
│           Mua ngày 12/03/2026 · Phiếu xuất #EXP-0234     │
│                                                           │
│           ██████████████░░░░░░  còn 4 tháng 12 ngày BH   │  ← progress bar
│           Tem BH: ✅ Đã xác thực (WSC-88213)             │
│           Lịch sử đổi BH: 1 lần (18/06/2026)             │
└─────────────────────────────────────────────────────────┘
```

- **Progress bar hạn BH**: xanh khi còn >30 ngày, vàng khi ≤30 ngày, đỏ + khóa form khi đã hết hạn.
- **Dòng tem BH**: 3 trạng thái hiển thị —
  - ✅ Đã xác thực (`warranty_seal_code` khớp DB)
  - ⚠️ Không có / không xác thực được — hiện nút "Khách nói mất tem" (dẫn tới nhánh xử lý theo quyết định **⏳ TBD #13**; tạm thời hiện disclaimer "Chính sách mất tem đang chờ xác nhận, liên hệ QL trước khi từ chối khách" thay vì tự ý chặn hẳn)
  - — Không áp dụng (shop không dùng tem riêng — ẩn dòng này hoàn toàn nếu cấu hình global tắt tem)
- **Lịch sử đổi BH**: nếu >2 lần → dòng này đổi màu cam + icon ⚠, không chặn nhưng nhắc SALES cân nhắc kỹ khi đề xuất.
- **Không tìm thấy serial** → thông báo rõ: *"Không tìm thấy sản phẩm với serial này trong hệ thống. Kiểm tra lại serial hoặc xác nhận khách có mua tại đây không."* Không có form nào hiện thêm bên dưới.
- **Hết hạn BH** → Serial Info Card vẫn hiện đầy đủ (để SALES thấy rõ tại sao từ chối) nhưng toàn bộ Giai đoạn B bị khóa, thay bằng banner đỏ: *"Sản phẩm đã hết hạn bảo hành từ [ngày]. Không thể tiếp nhận theo diện BH shop."* + nút phụ **"Vẫn tạo phiếu (ngoài BH, tính phí)"** — nếu shop có dịch vụ sửa ngoài BH thì đây là lối thoát hợp lý, không bắt SALES phải nói không hoàn toàn với khách.

**Giai đoạn B — Nhập thông tin lỗi** (chỉ hiện khi còn hạn BH)

```
Mô tả lỗi khách báo *          [textarea]
Ảnh/video minh chứng (tuỳ chọn) [upload — tái dùng component upload ảnh SP]
                                          [Hủy]  [Tiếp nhận →]
```

Submit → tạo `warranty_request` status=`pending`, in ngay **phiếu biên nhận** (khách cầm về, có mã tra cứu) — nút "In biên nhận" xuất hiện ngay sau khi tạo thành công, trước khi điều hướng sang Detail page.

### 2.3 `/warranty/:id` — WarrantyDetailPage

**Khung sườn chung (mọi state)**

```
┌──────────────────────────────────────────────────────────┐
│ #WR-0042          RTX 4070 Super — SN: ABC123XYZ          │
│                                                            │
│  ●───────●───────●───────○                                │
│ Tiếp nhận  Đã nhận  Đang đánh giá  Hoàn tất                │
│ 21/07 09:12  21/07 10:30  —          —                     │  ← WarrantyTimeline
│ SALES: Lan   STOCK: Minh                                   │
├──────────────────────────────────────────────────────────┤
│ [Thông tin khách/SP — luôn hiện, thu gọn được]             │
├──────────────────────────────────────────────────────────┤
│ [Panel động theo state]                                    │
└──────────────────────────────────────────────────────────┘
```

- Timeline **luôn hiện đủ 4 mốc**, mốc chưa tới hiện mờ (○), mốc đã qua hiện đặc + timestamp + tên người thực hiện.
- Panel động bên dưới chỉ hiện **action phù hợp với role đang đăng nhập**.

**State `pending` — STOCK nhận hàng**

```
Khách đã gửi hàng chưa nhận vào kho.
[✓ Xác nhận đã nhận hàng]
```

Bấm xong → chuyển ngay sang form kiểm tra của state `received` (không tách 2 lần load trang).

**State `received` — STOCK kiểm tra**

```
Kết quả kiểm tra ngoại quan / lỗi:
  ( ) Xác nhận có lỗi (CONFIRMED)       ( ) Không lỗi / không thuộc BH (REJECTED)

Ghi chú kiểm tra:  [textarea]  ← bắt buộc nếu chọn REJECTED
                                      [Lưu kết quả →]
```

- REJECTED bắt buộc note (validate chặn submit nếu để trống).
- CONFIRMED → chuyển `under_evaluation`, đồng thời tạo `ProductUnitStatusLog` (`sold → under_repair` hoặc `sold → sent_to_manufacturer`).
- REJECTED → phiếu chuyển thẳng `resolved` với `resolution=REJECT` (không cần qua QL duyệt riêng). *Lưu ý thiết kế*: nếu business muốn mọi REJECT đều phải qua QL xác nhận lần 2, cần đổi luồng — nên chốt với QL trước khi code.

**State `under_evaluation` — QL duyệt resolution**

4 **Resolution Card** thay vì dropdown, bổ sung cảnh báo ngữ cảnh ngay trên từng card:

```
┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  🔧 REPAIR    │ │  🔄 REPLACE   │ │  💰 REFUND    │ │  ✕ REJECT     │
│               │ │               │ │               │ │               │
│ Sửa tại kho   │ │ Đổi serial    │ │ Hoàn tiền cho │ │ Từ chối yêu   │
│ hoặc gửi NCC. │ │ mới, giữ nguyên│ │ khách, unit   │ │ cầu bảo hành. │
│ Unit vẫn giữ  │ │ hạn BH gốc.   │ │ → returned.   │ │ Unit trả về   │
│ nguyên serial.│ │               │ │               │ │ khách nguyên  │
│               │ │ ⚠ Còn 2 serial│ │               │ │ trạng.        │
│               │ │ cùng loại tồn │ │               │ │               │
│               │ │ kho           │ │               │ │               │
│  [Chọn]       │ │  [Chọn]       │ │  [Chọn]       │ │  [Chọn]       │
└───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘
```

- Mỗi card có **1 dòng mô tả hậu quả ngắn**.
- **Card REPLACE** hiện số lượng serial cùng sản phẩm đang `in_stock` — nếu = 0, đổi cảnh báo thành đỏ *"Hết hàng để đổi"* và **không khóa** nút chọn (QL vẫn có thể chọn REPLACE để giữ trạng thái chờ).
- Nếu unit gốc đã qua >2 lần đổi → thêm dòng cảnh báo cam ngay trên card, không chặn chọn.
- Bấm "Chọn" → **confirm dialog** trước khi submit thật:
  ```
  Xác nhận chọn REPLACE cho phiếu #WR-0042?
  Hệ thống sẽ tạo phiếu xuất nội bộ, giá 0đ, kế thừa hạn BH gốc.
  [Hủy]  [Xác nhận]
  ```
- Chỉ QL mới thấy panel này; SALES/STOCK xem phiếu ở state này chỉ thấy dòng "Đang chờ QL duyệt hướng xử lý".

**State `resolved` — STOCK thực thi**

Panel đổi nội dung theo `resolution` đã chọn:

**REPAIR:**
```
Hướng xử lý: Sửa tại kho / Gửi NCC
[ ] Sửa xong, trả về tồn kho          [ ] Đã gửi NCC (chuyển sent_to_manufacturer)
```
Khi tick "Sửa xong" → unit `under_repair → in_stock`, phiếu → terminal.

**REPLACE (còn hàng):**
```
Chọn serial thay thế:  [🔍 tìm serial...]  ← gợi ý mặc định serial FIFO cùng SP
Serial được chọn: SN: DEF456 (nhập 15/07/2026)
                                     [Xác nhận đổi hàng →]
```
Sau xác nhận → tạo export nội bộ `sell_price=0`, unit mới `→ sold`, kế thừa `warranty_start_date` gốc.

**REPLACE (hết hàng — nhánh chờ, phụ thuộc #1 TBD):**
```
⏳ Đang chờ nhập hàng để đổi. Đã chờ 3 ngày.
[Đánh dấu đã có hàng để đổi]   [Chuyển sang REFUND thay thế]
```

**REFUND:**
```
Số tiền hoàn: [___________] đ  (mặc định = giá bán lúc xuất, sửa được)
                                     [Xác nhận hoàn tiền →]
```
Xác nhận → unit `→ returned`, phiếu terminal.

**REJECT:**
```
Lý do từ chối: [hiện lại ghi chú từ bước kiểm tra, read-only]
[In biên bản từ chối cho khách]
```

### 2.4 Thành phần dùng chung (component tái sử dụng)

| Component | Dùng ở đâu | Ghi chú |
|---|---|---|
| `WarrantyStatusBadge` | List, Detail header | 4 màu cố định theo state |
| `WarrantyTimeline` | Detail (đầu trang) | Vertical, luôn hiện đủ 4 mốc |
| `SerialLookupWidget` | Create (bước 1), Replace (bước thực thi) | Input + scan + kết quả card |
| `ResolutionCard` | Detail (`under_evaluation`) | 4 card, prop `disabled`/`warningText` động |
| `WarrantySealBadge` | Create, Detail | 3 trạng thái tem — ẩn nếu shop tắt tem |

### 2.5 Bảng màu trạng thái

| Status | Màu | Label hiển thị |
|---|---|---|
| `pending` | xám xanh (slate) | Chờ tiếp nhận |
| `received` | xanh dương | Đang kiểm tra |
| `under_evaluation` | vàng cam | Chờ QL duyệt |
| `resolved` (repaired/replaced) | xanh lá | Đã xử lý |
| `resolved` (rejected) | đỏ nhạt | Đã từ chối |
| `resolved` (refunded) | tím | Đã hoàn tiền |

### 2.6 Phân quyền hiển thị action

| State | SALES thấy gì | STOCK thấy gì | QL/ADMIN thấy gì |
|---|---|---|---|
| `pending` | Read-only | Nút "Xác nhận đã nhận" | Read-only |
| `received` | Read-only | Form CONFIRMED/REJECTED | Read-only |
| `under_evaluation` | Read-only | Read-only | 4 Resolution Card |
| `resolved` | Read-only + nút in | Panel thực thi (nếu chưa xong) | Read-only |

Ghi đè chung: **ADMIN chỉ duyệt thay khi QL vắng** — UI nên thêm 1 dòng nhắc nhỏ *"Đang duyệt thay QL"* để việc backup-approval không bị lẫn với việc ADMIN thường trực xử lý nghiệp vụ (tránh vi phạm ngầm Separation of Duties).

### 2.7 Việc cần chốt trước khi code

1. **Mất tem BH xử lý sao** (#13) — quyết định (a)/(b) sẽ đổi hẳn nội dung banner ở §2.2.
2. **SLA chờ khi hết serial đổi** (#1) — quyết định số ngày cụ thể sẽ bật/tắt nút "Chuyển sang REFUND thay thế" ở §2.3.
3. **REJECT có cần QL xác nhận lần 2 không** — ảnh hưởng luồng auto-resolve.

Ngoài 3 điểm trên, phần còn lại có thể code thẳng theo thiết kế này vì đã khớp `02-sop-nghiep-vu.md §6`.
