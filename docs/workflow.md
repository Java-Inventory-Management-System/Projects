# Quy trình nghiệp vụ kho — Warehouse Workflows

## Mục lục

1. [Nhập kho (Import)](#1-nhập-kho-import-receipt)
2. [Xuất kho (Export)](#2-xuất-kho-export-receipt)
3. [Kiểm kê (Stock Check)](#3-kiểm-kê-stock-check)
4. [Điều chỉnh tồn (Stock Adjustment)](#4-điều-chỉnh-tồn-stock-adjustment)
5. [Điều chỉnh giá (Price Adjustment)](#5-điều-chỉnh-giá-price-adjustment)
6. [Trả hàng (Return)](#6-trả-hàng-return-receipt)
7. [Bảo hành (Warranty)](#7-bảo-hành-warranty)
8. [Kiến trúc dữ liệu](#kiến-trúc-dữ-liệu)

---

## 1. Nhập kho (Import Receipt)

**Mục đích**: Nhập hàng từ nhà cung cấp vào kho.

**Luồng**:

```
Tạo phiếu nhập ──────────────────→ DRAFT
  │
  ├─ Xác nhận (PUT confirm) ─────→ PENDING_APPROVAL
  │     ├─ Validate serial numbers
  │     └─ Tạo ProductUnit cho từng serial
  │
  ├─ Admin/Manager duyệt ────────→ COMPLETED
  │     └─ Cập nhật tổng tiền
  │
  └─ Admin huỷ ─────────────────→ CANCELLED
```

**Request (tạo)**:
```json
{
  "supplierId": 1,
  "note": "Nhập lô hàng Intel",
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "unitPrice": 10000000,
      "warrantyMonths": 12,
      "serialNumbers": ["SN001", "SN002"],
      "locationId": 1
    }
  ]
}
```

**Lưu ý**:
- Hàng SERIALIZED: bắt buộc nhập `serialNumbers`, mỗi serial là duy nhất trong hệ thống
- Hàng BULK: không cần serialNumbers, hệ thống quản lý theo số lượng
- ProductUnit được tạo ở bước **confirm** (không phải lúc tạo phiếu)
- Luồng đầy đủ: `POST create (DRAFT)` → `PUT confirm (PENDING_APPROVAL)` → `PUT approve (COMPLETED)`
- Mã phiếu: `IMP-YYYYMMDD-XXXX`

---

## 2. Xuất kho (Export Receipt)

**Mục đích**: Xuất hàng bán cho khách, xuất nội bộ, trả nhà cung cấp, hoặc thanh lý.

**Luồng**:

```
Tạo phiếu xuất ─────────────────→ PENDING_APPROVAL
  │
  ├─ Admin/Manager duyệt ────────→ COMPLETED
  │     ├─ Hệ thống tự chọn ProductUnit IN_STOCK (FIFO)
  │     └─ (dự kiến) Trừ tồn + chuyển unit → SOLD
  │
  └─ Admin huỷ ─────────────────→ CANCELLED
```

**Request (tạo)**:
```json
{
  "reason": "SALE",
  "customerId": 1,
  "note": "Bán cho công ty ABC",
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "unitPrice": 15000000
    }
  ]
}
```

**Loại xuất (reason)**:
| Reason | Mục đích |
|--------|----------|
| `SALE` | Bán cho khách hàng |
| `INTERNAL` | Sử dụng nội bộ |
| `RETURN_SUPPLIER` | Trả nhà cung cấp |
| `DISPOSE` | Thanh lý |

**Lưu ý**:
- Hệ thống tự động chọn lô cũ (FIFO) — không chọn serial thủ công
- Sau duyệt, ProductUnit tự động chuyển sang SOLD
- Mã phiếu: `EXP-YYYYMMDD-XXXX`

---

## 3. Kiểm kê (Stock Check)

**Mục đích**: Đối chiếu tồn kho thực tế với hệ thống, phát hiện sai lệch.

**Luồng**:

```
Tạo phiếu kiểm kê (chọn các unit cần kiểm) ──→ IN_PROGRESS
  │
  ├─ Ghi nhận kết quả (số lượng, tình trạng) ──→ IN_PROGRESS
  │
  ├─ Hoàn tất kiểm kê ──────────────────────────→ COMPLETED
  │     │
  │     ├─ Manager duyệt ─────────────────────→ APPROVED
  │     └─ Manager từ chối ───────────────────→ REJECTED
```

**Request (tạo)**:
```json
{
  "note": "Kiểm kê cuối tháng",
  "productUnitIds": [101, 102, 103]
}
```

**Request (ghi nhận)**:
```json
{
  "items": [
    {
      "productUnitId": 101,
      "countedQuantity": 1,
      "actualStatus": "IN_STOCK",
      "note": "OK"
    }
  ]
}
```

**Kết quả đối chiếu**:
| Difference type | Ý nghĩa |
|----------------|---------|
| `MATCH` | Khớp |
| `MISSING` | Thiếu so với hệ thống |
| `UNEXPECTED` | Thừa so với hệ thống |
| `PARTIAL_SHORTAGE` | Thiếu một phần (với hàng BULK) |

**Lưu ý**:
- Sau khi tạo với `productUnitIds`, tự động ở trạng thái IN_PROGRESS (items đã được sinh)
- Mã phiếu: `SC-YYYYMMDD-XXXX`

---

## 4. Điều chỉnh tồn (Stock Adjustment)

**Mục đích**: Điều chỉnh khi phát hiện hàng hỏng, mất, hoặc thừa trong kho.

**Luồng**:

```
Tạo phiếu điều chỉnh ─────────→ PENDING
  │
  ├─ Manager duyệt ───────────→ APPROVED
  └─ Manager từ chối ─────────→ REJECTED
```

**Request (tạo)**:
```json
{
  "type": "DAMAGED",
  "productUnitId": 101,
  "reason": "Hàng bị rơi vỡ khi di chuyển"
}
```

**Loại điều chỉnh (type)**:
| Type | Ý nghĩa |
|------|---------|
| `DAMAGED` | Hàng hư hỏng |
| `LOST` | Hàng mất |
| `FOUND` | Phát hiện hàng thừa |

**Lưu ý**:
- Chỉ hỗ trợ điều chỉnh theo **ProductUnit** (một serial cụ thể) — không có điều chỉnh số lượng product
- Không cần quantity, vì mỗi phiếu tương ứng 1 unit
- Mã phiếu: `ADJ-YYYYMMDD-XXXX`

---

## 5. Điều chỉnh giá (Price Adjustment)

**Mục đích**: Thay đổi giá nhập của item trong phiếu nhập.

**Luồng**:

```
Tạo phiếu điều chỉnh giá ───→ PENDING
  │
  ├─ Manager duyệt ──────────→ APPROVED
  └─ Manager từ chối ────────→ REJECTED
```

**Request (tạo)**:
```json
{
  "importReceiptItemId": 45,
  "newPrice": 12000000,
  "reason": "Biến động thị trường"
}
```

**Lưu ý**:
- Điều chỉnh dựa trên `importReceiptItemId` (item trong phiếu nhập)
- Hệ thống tự động lấy `oldPrice` từ import receipt item gốc
- Mã phiếu: `PADJ-YYYYMMDD-XXXX`

---

## 6. Trả hàng (Return Receipt)

**Mục đích**: Khách hàng trả lại hàng đã mua.

**Luồng**:

```
Tạo phiếu trả hàng ───────────→ PENDING_APPROVAL
  │
  ├─ Manager duyệt ───────────→ APPROVED
  │     ├─ RESTOCK: nhập lại kho
  │     ├─ SCRAP: tiêu huỷ
  │     └─ WARRANTY_TRANSFER: chuyển bảo hành
  │
  └─ Manager từ chối ─────────→ REJECTED
```

**Request (tạo)**:
```json
{
  "customerId": 1,
  "originalExportReceiptId": 5,
  "reason": "DEFECTIVE",
  "note": "Hàng bị lỗi",
  "items": [
    {
      "productUnitId": 101,
      "productId": 1,
      "quantity": 1,
      "condition": "DEFECTIVE",
      "resultingAction": "SCRAP"
    }
  ]
}
```

**Condition (tình trạng)**:
| Condition | Ý nghĩa |
|-----------|---------|
| `GOOD` | Hàng còn tốt |
| `DEFECTIVE` | Hàng lỗi |

**ResultingAction (hướng xử lý)**:
| Action | Ý nghĩa |
|--------|---------|
| `RESTOCK` | Nhập lại kho |
| `SCRAP` | Tiêu huỷ |
| `WARRANTY_TRANSFER` | Chuyển bảo hành |
---

## 7. Bảo hành (Warranty)

**Mục đích**: Quản lý yêu cầu bảo hành cho sản phẩm đã bán.

**Luồng**:

```
Tra cứu BH theo serial ───── không cần login
  ↓
Tạo yêu cầu BH ───────────→ PENDING
  │
  ├─ Xử lý (RESOLVED)
  │     ├─ REPAIR: sửa chữa
  │     ├─ REPLACE: đổi mới
  │     ├─ REFUND: hoàn tiền
  │     └─ REJECT: từ chối BH
  │
  └─ Hoàn tất ─────────────→ COMPLETED
        result = REPAIRED | REPLACED | REFUNDED | REJECTED
```

**Request (tạo)**:
```json
{
  "serialNumber": "SN001",
  "customerId": 1,
  "issueDescription": "Không lên nguồn",
  "note": "Khách gửi 2026-07-20"
}
```

**Request (xử lý)**:
```json
{
  "resolutionType": "REPLACE",
  "rmaNumber": "RMA-2026-001",
  "expectedReturnAt": "2026-08-01"
}
```

**Lưu ý**:
- ProductUnit phải ở trạng thái **SOLD** mới được tạo yêu cầu BH
- IN_STOCK không đủ điều kiện (chưa bán thì không có BH)

---

## Kiến trúc dữ liệu

### State machine ProductUnit

```
                    ┌──→ DAMAGED_IN_STORAGE (điều chỉnh DAMAGED)
                    │
IN_STOCK ────┬──────┼──→ LOST (điều chỉnh LOST / kiểm kê thiếu)
             │      │
             │      └──→ FOUND (điều chỉnh FOUND — unit mới)
             │
             └──→ SOLD (xuất bán)
                    │
                    ├──→ WARRANTY ──→ WARRANTY_DONE
                    │    (tạo BH)       (BH hoàn tất)
                    │
                    └──→ RETURNED (trả hàng)
                           │
                           ├──→ IN_STOCK (RESTOCK)
                           ├──→ DISPOSED (SCRAP)
                           └──→ WARRANTY (WARRANTY_TRANSFER)
```

### Các loại mã

| Loại phiếu | Mã | Ví dụ |
|-----------|-----|-------|
| Nhập kho | `IMP-` | IMP-20260722-0001 |
| Xuất kho | `EXP-` | EXP-20260722-0001 |
| Kiểm kê | `SC-` | SC-20260722-0001 |
| Điều chỉnh tồn | `ADJ-` | ADJ-20260722-0001 |
| Điều chỉnh giá | `PADJ-` | PADJ-20260722-0001 |
| Trả hàng | `TH-` | TH-20260722-0001 |
| Bảo hành | `BH-` | BH-20260722-0001 |

### Vai trò người dùng

| Role | Quyền |
|------|-------|
| `ADMIN` | Toàn quyền — tạo, duyệt, huỷ mọi phiếu |
| `MANAGER` | Duyệt/từ chối phiếu (kiểm kê, điều chỉnh) |
| `STOCK` | Tạo phiếu nhập, kiểm kê, điều chỉnh — không duyệt |
| `SALES` | Tạo phiếu xuất, trả hàng, bảo hành — không duyệt |

---

## Tổng quan flow liên kết

```
Nhà cung cấp                  Khách hàng
     │                            │
     ▼                            ▼
  NHẬP KHO ──→ ProductUnit ──→ XUẤT KHO
     │          (IN_STOCK)        │
     │                            │
     ├── Điều chỉnh giá           ├── TRẢ HÀNG
     │                            │     │
     │                            │     ├── RESTOCK → IN_STOCK
     │                            │     └── SCRAP → DISPOSED
     │                            │
     │                            └── BẢO HÀNH
     │                                  │
     │                                  └── REPAIR/REPLACE/REFUND
     │
     └── KIỂM KÊ ──── phát hiện sai lệch ────→ ĐIỀU CHỈNH TỒN
```
