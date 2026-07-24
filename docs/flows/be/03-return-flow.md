# Return Flow — Backend

## Controller

**Class:** `ReturnReceiptController` (`/api/v1/return-receipts`)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `GET` | `/return-receipts` | `CAN_OPERATE` | List returns |
| `GET` | `/return-receipts/{id}` | `CAN_OPERATE` | Get detail |
| `POST` | `/return-receipts` | `CAN_OPERATE` | Create return |
| `PUT` | `/return-receipts/{id}/approve` | `CAN_APPROVE` | Approve (4-eyes) |
| `PUT` | `/return-receipts/{id}/cancel` | `CAN_APPROVE` | Cancel |

## Service

**Class:** `ReturnReceiptService`

| Method | Logic |
|--------|-------|
| `create(request)` | Generate receipt code, link to original `export_receipt`, create `ReturnReceipt` + `ReturnReceiptItem` with condition + resulting action |
| `approve(id)` | For each item: `GOOD→RESTOCK` → unit `SOLD→IN_STOCK`; `DEFECTIVE→SCRAP` → unit `SOLD→DISPOSED`; `DEFECTIVE→WARRANTY_TRANSFER` → unit `SOLD→DEFECTIVE`. Enforce 4-eyes |
| `cancel(id)` | Update receipt to `CANCELLED` |

## Entity & Table

| Table | Key fields |
|-------|------------|
| `return_receipts` | `receiptCode`, `customerId`, `originalExportReceiptId`, `reason`, `status` (`PENDING_APPROVAL/COMPLETED/CANCELLED`), `createdBy`, `approvedBy` |
| `return_receipt_items` | `returnReceiptId`, `productUnitId`, `productId`, `quantity`, `condition` (`GOOD/DEFECTIVE`), `resultingAction` (`RESTOCK/SCRAP/WARRANTY_TRANSFER`) |
| `product_units` | status changes: `SOLD→IN_STOCK` (RESTOCK), `SOLD→DISPOSED` (SCRAP), `SOLD→DEFECTIVE` (WARRANTY_TRANSFER) |

## State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING_APPROVAL : Tạo phiếu trả hàng

    PENDING_APPROVAL --> COMPLETED : Approve (4-eyes)
    PENDING_APPROVAL --> CANCELLED : Cancel

    state "ProductUnit" as PU {
        [*] --> SOLD
        SOLD --> IN_STOCK : GOOD → RESTOCK
        SOLD --> DISPOSED : DEFECTIVE → SCRAP
        SOLD --> DEFECTIVE : DEFECTIVE → WARRANTY_TRANSFER
    }
```

## Audit

| Action | entity_type | Khi nào |
|--------|-------------|---------|
| `CREATE` | `RETURN_RECEIPT` | `POST /return-receipts` |
| `APPROVE` | `RETURN_RECEIPT` | `PUT /return-receipts/{id}/approve` |
| `CANCEL` | `RETURN_RECEIPT` | `PUT /return-receipts/{id}/cancel` |

## Sequence

```mermaid
sequenceDiagram
    participant C as ReturnReceiptController
    participant S as ReturnReceiptService
    participant R as Repository
    participant DB as Database

    C->>S: create(request)
    S->>R: find original export
    S->>R: save return_receipt (PENDING_APPROVAL)
    S->>R: save return_receipt_items
    S-->>C: response DTO

    C->>S: approve(id)
    S->>R: find return_receipt + items
    S->>S: check created_by ≠ approved_by
    loop each item
        alt GOOD → RESTOCK
            S->>R: update unit status SOLD→IN_STOCK
        else DEFECTIVE → SCRAP
            S->>R: update unit status SOLD→DISPOSED
        else DEFECTIVE → WARRANTY_TRANSFER
            S->>R: update unit status SOLD→DEFECTIVE
        end
    end
    S->>R: save status_logs for each unit
    S->>R: update receipt → COMPLETED
    S-->>C: response DTO
```