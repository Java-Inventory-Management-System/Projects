# Import Flow — Backend

## Controller

**Class:** `ImportReceiptController` (`/api/v1`)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `GET` | `/import-receipt` | `CAN_VIEW_INVENTORY` | List receipts, filter by status |
| `GET` | `/import-receipt/{id}` | `CAN_VIEW_INVENTORY` | Get receipt detail |
| `POST` | `/import-receipt` | `CAN_OPERATE_STOCK` | Create + auto-confirm |
| `PUT` | `/import-receipt/{id}/confirm` | `CAN_OPERATE_STOCK` | Confirm (add serials) |
| `PUT` | `/import-receipt/{id}/approve` | `CAN_APPROVE` | Approve (4-eyes) |
| `PUT` | `/import-receipt/{id}/cancel` | `CAN_APPROVE` | Cancel |
| `GET` | `/import-receipt/{id}/units` | `CAN_VIEW_INVENTORY` | Get product units of receipt |
| `GET` | `/product-unit` | `CAN_VIEW_INVENTORY` | List product units |
| `GET` | `/product-unit/{id}` | `CAN_VIEW_INVENTORY` | Get unit detail |
| `GET` | `/product-unit/status/{status}` | `CAN_VIEW_INVENTORY` | Filter units by status |

## Service

**Class:** `ImportReceiptService`

| Method | Logic |
|--------|-------|
| `create(request)` | Generate receipt code (`INIT-YYYYMMDD-NNNN`), create `ImportReceipt` + `ImportReceiptItem` rows, auto-confirm if no QC needed |
| `confirm(id, request)` | Create `ProductUnit` records (serialized: 1 per serial; bulk: 1 lot with `initialQuantity`), create `ProductUnitStatusLog` (`PENDING_QC→IN_STOCK`), update receipt status to `PENDING_APPROVAL` |
| `approve(id)` | Check `created_by ≠ approved_by`, update receipt to `COMPLETED`, audit log |
| `cancel(id)` | Check receipt not already completed, update to `CANCELLED`, revert units (set `removed`) |
| `getUnits(id)` | Query `ProductUnit` by `importReceiptItemId` |

## Entity & Table

| Table | Key fields |
|-------|------------|
| `import_receipts` | `receiptCode`, `supplierId`, `totalAmount`, `status` (`DRAFT/PENDING_APPROVAL/COMPLETED/CANCELLED`), `createdBy`, `approvedBy` |
| `import_receipt_items` | `receiptId`, `productId`, `quantity`, `unitPrice`, `warrantyMonths` |
| `product_units` | `serialNumber`, `trackingType`, `initialQuantity`, `remainingQuantity`, `costPrice`, `locationId`, `status` (`PENDING_QC→IN_STOCK`), `importReceiptItemId`, `warrantyMonths` |
| `product_unit_status_logs` | `productUnitId`, `fromStatus`, `toStatus`, `sourceType`, `sourceId`, `changedBy` |

## State Machine

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Create phiếu nhập

    DRAFT --> PENDING_APPROVAL : Confirm — tạo ProductUnit + status log
    DRAFT --> CANCELLED : Cancel trước confirm
    PENDING_APPROVAL --> COMPLETED : Approve (4-eyes)
    PENDING_APPROVAL --> CANCELLED : Cancel trước duyệt

    note right of PENDING_APPROVAL : created_by ≠ approved_by enforced

    state "ProductUnit" as PU {
        [*] --> PENDING_QC
        PENDING_QC --> IN_STOCK : QC Pass / auto confirm
        PENDING_QC --> DEFECTIVE : QC FAIL_HARDWARE (DOA)
    }
```

## Audit

| Action | entity_type | Khi nào |
|--------|-------------|---------|
| `CREATE` + confirm | `IMPORT_RECEIPT` | `POST /import-receipt` (auto-confirm) |
| `APPROVE` | `IMPORT_RECEIPT` | `PUT /import-receipt/{id}/approve` |
| `CANCEL` | `IMPORT_RECEIPT` | `PUT /import-receipt/{id}/cancel` |
| `UPDATE` | `PRODUCT_UNIT` | Sửa serial sau nhập |

## Sequence

```mermaid
sequenceDiagram
    participant C as ImportReceiptController
    participant S as ImportReceiptService
    participant R as Repository
    participant DB as Database

    C->>S: create(request)
    S->>R: save import_receipt (DRAFT)
    R->>DB: INSERT
    DB-->>R: generated id + receiptCode
    S->>S: parse items from request
    S->>R: save each import_receipt_item
    R->>DB: INSERT batch items
    S->>R: save product_units (serials)
    R->>DB: INSERT batch units (PENDING_QC→IN_STOCK)
    S->>R: save product_unit_status_logs
    S->>R: update import_receipt → PENDING_APPROVAL
    S-->>C: response DTO

    C->>S: approve(id)
    S->>R: find import_receipt
    S->>S: check created_by ≠ approved_by
    S->>R: update status → COMPLETED
    S-->>C: response DTO
```