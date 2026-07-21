# Bổ sung lần 2 — Rà soát cuối

> File này là bản rà soát cuối cùng, đối chiếu từng mục (1-28) của `08-inventory-analysis.md` để đảm bảo không còn sót. Đọc cùng 2 file trước, không thay thế.
> **Xem `10-sop-quy-trinh-nghiep-vu.md` cho quy trình nghiệp vụ đã chốt — một số bug/gap trong file này đã có quyết định trong SOP.**

---

## 1. Bug/gap còn sót từ `08-inventory-analysis.md`

| # | Vấn đề | Nguồn (mục trong 08) | Chi tiết | SOP? |
|---|---|---|---|---|:---:|
| 1 | **Field mismatch `productId` vs `id`** — P0, latent type error | 21.1 | Backend `InventoryItemResponse` trả `productId` (không có `id`). Frontend `InventoryItem` khai báo `id: number`. Hiện tại `inventory-page.tsx` không dùng `item.id` nên chưa crash, là latent bug | ❌ Ngoài phạm vi 7 luồng |
| 2 | **Không validate supplier tồn tại khi tạo phiếu nhập** | 15.1 | `ImportReceiptService.createAndConfirm()` không check `supplier_id` có thật trong DB | ✅ **SOP §2.2 B1 yêu cầu validate** |
| 3 | **Không sửa được phiếu nhập ở `pending_approval`** | 15.1 | Chỉ có approve/cancel, không có update | ✅ **SOP §2.2 thêm draft — sửa trước duyệt** |
| 4 | **Partial PO import bị chặn ở UI** | 15.1 | Backend đã handle PARTIAL, UI chưa cho nhập 1 phần | ❌ Ngoài phạm vi SOP |
| 5 | **Thiếu endpoint `GET /export-receipt/{id}/units`** | 15.2 | Import có, export không | ❌ Ngoài phạm vi SOP |
| 6 | **Không có soft-delete cho phiếu nhập/xuất** | 15.3 | Cancel là cách "xóa" duy nhất, phiếu cancelled tồn tại mãi | ✅ **SOP §1.2: không soft-delete, giữ audit** |
| 7 | **`export_receipts` thiếu `purchase_order_id`** | 15.3 | Import có link PO, export không — khó trace khi sales return | ❌ Ngoài phạm vi SOP |
| 8 | **Không có notification/alert chủ động low-stock** | 2 | Chỉ có report thụ động, thiếu `@Scheduled` job | ❌ Ngoài phạm vi SOP |
| 9 | **Cần tách `SellPriceHistory` khỏi `price_adjustments`** | 12 | Giá bán không cần duyệt, cần audit trail riêng | ✅ **SOP §8.4 có `sell_price_history` riêng** |
| 10 | **Customer deduplication** | 14 | Không unique constraint phone/email | ❌ Ngoài phạm vi 7 luồng |
| 11 | **Batch operations cho xuất kho còn thiếu** | 8 | Single Select, không bulk approve/cancel | ❌ Ngoài phạm vi SOP |
| 12 | **Barcode/RFID hoàn toàn chưa có** | 13 | `ProductUnit` không có field barcode | ❌ Ngoài phạm vi SOP |

---

## 2. Mâu thuẫn mới phát hiện — quan trọng hơn các bug ở trên

**Thời điểm kích hoạt bảo hành: `08` tự mâu thuẫn với domain-model gốc**

- Domain-model gốc (`01/02`): `warranty_start_date` được kích hoạt lúc XUẤT/bán — "nếu `reason=sale` → set `warranty_start_date` = ngày duyệt xuất". Đây là quyết định nghiệp vụ rõ ràng: BH tính từ lúc khách nhận hàng, không phải lúc hàng về kho.
- `08` mục 28.2 lại tự đề xuất: set `warrantyStartDate = importDate` lúc NHẬP kho, với lý do "không thể biết BH bắt đầu từ khi nào nếu chỉ nhập mà chưa xuất".

→ Đây là 2 triết lý nghiệp vụ khác nhau, không phải chỉ thiếu 1 field kỹ thuật. Nếu làm theo `08`, một sản phẩm nằm kho 6 tháng chưa bán sẽ mất 6 tháng bảo hành "oan" trước khi đến tay khách — sai với cách vận hành BH thông thường của ngành bán lẻ. **Khuyến nghị giữ đúng domain-model gốc** (kích hoạt lúc bán). Lưu ý: `warrantyMonths` (thời hạn, không phải ngày bắt đầu) **đã được copy** sang `ProductUnit` lúc nhập ở code hiện tại (xem `ImportReceiptService.java:165,181,223` và `ImportReceiptMappingHelper.java:44`) — giữ nguyên, không cần sửa.

---

## 3. Xác nhận phạm vi — các mục ĐÃ ĐƯỢC LOẠI CÓ CHỦ ĐÍCH

Các mục sau trong `08-inventory-analysis.md` bị bỏ qua có chủ đích vì không thuộc phạm vi "flow nghiệp vụ nhập/xuất/kiểm kê/điều chỉnh giá" mà nằm ở tầng hạ tầng/kỹ thuật thuần túy:

- **Mục 1** (Multi-warehouse), **9** (Stock transfer), **11** (Multi-currency) — kiến trúc lớn, phụ thuộc quyết định có >1 kho hay không
- **Mục 10** (Reports/Analytics nâng cao: turnover, ABC analysis) — thuộc báo cáo, không phải flow giao dịch
- **Mục 20** (Frontend issues: staleTime, token refresh queue) — kỹ thuật frontend thuần túy
- **Mục 22** (Configuration/DevOps: hardcoded credentials, .env committed) — hạ tầng, không phải nghiệp vụ
- **Mục 23** (Testing coverage) — quy trình phát triển, không phải nghiệp vụ
- **Mục 26** (Migration numbering gaps) — vận hành DB thuần túy
- **Mục 27.1** (Audit log dùng reflection lấy ID) — chi tiết implementation nội bộ

Đây là điểm dừng cuối cùng sau khi đối chiếu đầy đủ cả 28 mục của `08` với 3 file đã tạo.
