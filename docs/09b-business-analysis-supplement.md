# Bổ sung — Tài liệu đi kèm `wms-nhap-xuat-tong-hop.md`

> File này chứa các ý đã thảo luận nhưng bị bỏ sót khi tổng hợp lần đầu. Đọc cùng với file chính (`09-business-analysis.md`), không thay thế.

---

## 1. UX đề xuất cho 4 luồng core

### Nhập kho

Wizard 4 bước: **Chọn NCC/PO → Thêm SP+SL → Nhập serial → QC & xác nhận**.

- Bước QC hiện dạng checklist per-serial (toggle Pass/Fail), có progress bar kiểu "12/50 đã kiểm".
- Vị trí kho hiện dạng badge auto-gán sẵn (theo đề xuất auto-assign ở file chính, mục 5.1), kèm link "Đổi" bên cạnh — không bắt buộc chọn qua dropdown như hiện tại.

### Xuất kho

Giữ nguyên luồng hiện tại (người dùng không yêu cầu đổi UX), chỉ lưu ý gắn liền với bug double-booking (file chính, mục 3, bug #1) — UI cần hiện rõ trạng thái "đang giữ chỗ" của serial trong lúc phiếu ở `pending_approval`, để NV khác không nhầm là còn trống.

### Kiểm kê lệch

Trang `StockCheckDetail` nên hiện bảng lệch **nổi bật ngay đầu trang** (highlight đỏ cho `MISSING`, xanh cho `UNEXPECTED`) thay vì lẫn trong danh sách toàn bộ items match.

Thêm nút **"Tạo phiếu điều chỉnh (N)"** áp dụng batch cho tất cả item lệch cùng lúc, thay vì phải tạo từng cái một — quan trọng vì tài liệu hiện mô tả tạo "manual" từng item, sẽ rất chậm nếu kiểm kê phát hiện 30-40 lệch cùng lúc.

### Điều chỉnh giá

Form đơn giản: chọn item nhập (nếu điều chỉnh giá vốn) hoặc sản phẩm (nếu điều chỉnh giá bán) → nhập giá mới + lý do bắt buộc → **hiện rõ "giá cũ → giá mới" side-by-side** trước khi submit → QL/Admin duyệt như các phiếu khác.

---

## 2. Case đặc thù ngành linh kiện máy tính (chưa tách riêng trong file chính)

- **ESD/tĩnh điện**: linh kiện như mainboard, RAM, GPU dễ hư nếu tĩnh điện khi thao tác/lưu trữ. Không cần model riêng trong hệ thống, nhưng nên có flag `esd_sensitive` ở cấp `category` để cảnh báo nhân viên khi thao tác (hiện UI, không phải rule nghiệp vụ).
- **Test-and-return abuse**: khách mua CPU/GPU về ép xung/test rồi đòi trả vì "không như kỳ vọng" — **không phải warranty** (không lỗi kỹ thuật) và **không phải DOA** (đã dùng, không phải lỗi lúc nhận hàng). Đây là nhánh thứ 3 cần tách khỏi cả `warranty_requests` lẫn case DOA đã nêu — nên đi theo flow "đổi trả theo yêu cầu KH" (`SalesReturn`, file chính mục 4.C) với `reason=CHANGE_MIND`, có policy thời hạn riêng (VD 7 ngày) khác hẳn `warranty_months`.

---

## 3. Bổ sung bảng bug bảo mật (nối vào mục 3 file chính)

| Bug | Vị trí | Tác động |
|---|---|---|
| Access token lưu ở `localStorage` | `frontend/src/utils/http-client.ts:27` | Dễ bị đánh cắp qua XSS. Nên chuyển access token vào memory (Zustand store) + httpOnly cookie cho refresh token |
| Không có brute-force protection trên login | `AuthService.java` | Login endpoint public, không rate limit, không lockout sau N lần fail — attacker có thể brute force password |
| Password policy quá yếu | `AuthService.java:160` | Chỉ check `length < 6`, không yêu cầu uppercase/lowercase/number/special char |
| File upload endpoint public, không giới hạn | `SecurityConfig.java:101` | `/api/v1/uploads/**` không auth, không giới hạn size/type |
| `AuthTokenFilter` không verify user còn active | `AuthTokenFilter.java:61-68` | User bị deactivate vẫn dùng được JWT cũ tới hết hạn, vì filter không query DB check `is_active` |

---

## 4. Nguyên tắc kỹ thuật khi fix bug double-booking (bổ sung chi tiết cho bug #1, file chính mục 3)

Khi thêm `PESSIMISTIC_WRITE`/status `reserved` để fix double-booking export, **lưu ý quan trọng về phạm vi transaction**:

- Lock `FOR UPDATE` chỉ nên nằm trong **transaction ngắn của đúng bước reserve** (select unit khả dụng → đổi status → commit ngay), không được giữ mở xuyên suốt thời gian chờ QL duyệt (có thể kéo dài vài giờ tới vài ngày).
- Nếu giữ lock mở suốt thời gian chờ duyệt → nghẽn toàn bộ hệ thống, dễ deadlock khi có nhiều phiếu xuất đồng thời.
- Cách đúng: dùng transaction ngắn để **đổi status sang `reserved`** (cần thêm giá trị enum này — hiện `ProductUnitStatus` chưa có), sau đó release lock ngay. Các FIFO query khác tự động loại trừ unit này vì filter `status='in_stock'` không còn khớp — không cần giữ lock DB kéo dài để đạt hiệu quả tương đương.
