# Price Adjustment Flow — Backend

## Controller

**Class:** `PriceAdjustmentController` (`/api/v1/price-adjustment`)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `GET` | `/price-adjustment/my` | `CAN_OPERATE_STOCK` | My adjustments |
| `GET` | `/price-adjustment` | `CAN_VIEW_INVENTORY` | List all |
| `GET` | `/price-adjustment/{id}` | `CAN_VIEW_INVENTORY` | Get detail |
| `POST` | `/price-adjustment` | `CAN_OPERATE` | Create |
| `PUT` | `/price-adjustment/{id}/approve` | `CAN_APPROVE` | Approve |
| `PUT` | `/price-adjustment/{id}/reject` | `CAN_APPROVE` | Reject |

## Service

**Class:** `PriceAdjustmentService`

| Method | Logic |
|--------|-------|
| `create(request)` | Generate adjust code (`PADJ-YYYYMMDD-NNNN`), create `PriceAdjustment` with `importReceiptItemId`, `oldPrice`, `newPrice`, `reason` |
| `approve(id)` | Batch update `ProductUnit.costPrice` for all units of that `importReceiptItemId` where `status=IN_STOCK`. Enforce 4-eyes |
| `reject(id)` | Set status to `REJECTED` |

## Entity & Table

| Table | Key fields |
|-------|------------|
| `price_adjustments` | `adjustCode`, `importReceiptItemId`, `oldPrice`, `newPrice`, `reason`, `status` (`PENDING/APPROVED/REJECTED`), `createdBy`, `approvedBy` |
| `product_units` | `costPrice` updated by batch `UPDATE ... WHERE importReceiptItemId = ? AND status = IN_STOCK` |

## State Machine

```mermaid
stateDiagram-v2
    PENDING --> APPROVED : Approve — batch update costPrice
    PENDING --> REJECTED : Reject — no change
```

## Audit

| Action | entity_type | Khi nào |
|--------|-------------|---------|
| `CREATE` | `PRICE_ADJUSTMENT` | `POST /price-adjustment` |
| `APPROVE` | `PRICE_ADJUSTMENT` | `PUT /price-adjustment/{id}/approve` |
| `REJECT` | `PRICE_ADJUSTMENT` | `PUT /price-adjustment/{id}/reject` |

## Sequence

```mermaid
sequenceDiagram
    participant C as PriceAdjustmentController
    participant S as PriceAdjustmentService
    participant R as Repository
    participant DB as Database

    C->>S: create(request)
    S->>R: find import_receipt_item
    S->>R: save price_adjustment (PENDING)
    S-->>C: response DTO

    C->>S: approve(id)
    S->>R: find price_adjustment
    S->>S: check created_by ≠ approved_by
    S->>R: batch UPDATE product_units SET costPrice = newPrice
    R->>DB: UPDATE WHERE importReceiptItemId = ? AND status = IN_STOCK
    S->>R: save status_log
    S->>R: update adjustment → APPROVED
    S-->>C: response DTO
```