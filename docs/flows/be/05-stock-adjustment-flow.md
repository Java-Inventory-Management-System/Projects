# Stock Adjustment Flow — Backend

## Controller

**Class:** `StockAdjustmentController` (`/api/v1/stock-adjustment`)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `GET` | `/stock-adjustment/my` | `CAN_OPERATE_STOCK` | My adjustments |
| `GET` | `/stock-adjustment` | `CAN_VIEW_INVENTORY` | List all |
| `GET` | `/stock-adjustment/{id}` | `CAN_VIEW_INVENTORY` | Get detail |
| `POST` | `/stock-adjustment` | `CAN_OPERATE_STOCK` | Create |
| `PUT` | `/stock-adjustment/{id}/approve` | `CAN_APPROVE` | Approve |
| `PUT` | `/stock-adjustment/{id}/reject` | `CAN_APPROVE` | Reject |

## Service

**Class:** `StockAdjustmentService`

| Method | Logic |
|--------|-------|
| `create(request)` | Generate adjust code (`ADJ-YYYYMMDD-NNNN`), create `StockAdjustment` with `type` (`DAMAGED/LOST/FOUND`), `reason`, optional `imageUrl` |
| `approve(id, note)` | Update `ProductUnit.status` — `DAMAGED→DEFECTIVE`, `LOST→LOST` (ghi nhận), `FOUND→IN_STOCK`. Enforce 4-eyes |
| `reject(id, note)` | Set status to `REJECTED` — no changes |

## Entity & Table

| Table | Key fields |
|-------|------------|
| `stock_adjustments` | `adjustCode`, `type` (`DAMAGED/LOST/FOUND`), `productUnitId`, `productId` (fallback), `quantity`, `reason`, `status` (`PENDING/APPROVED/REJECTED`), `createdBy`, `approvedBy` |

## State Machine

```mermaid
flowchart LR
    PENDING -->|Approve| APPROVED
    PENDING -->|Reject| REJECTED
```

## Audit

| Action | entity_type | Khi nào |
|--------|-------------|---------|
| `CREATE` | `STOCK_ADJUSTMENT` | `POST /stock-adjustment` |
| `APPROVE` | `STOCK_ADJUSTMENT` | `PUT /stock-adjustment/{id}/approve` |
| `REJECT` | `STOCK_ADJUSTMENT` | `PUT /stock-adjustment/{id}/reject` |

## Sequence

```mermaid
sequenceDiagram
    participant C as StockAdjustmentController
    participant S as StockAdjustmentService
    participant R as Repository
    participant DB as Database

    C->>S: create(request)
    S->>R: save stock_adjustment (PENDING)
    S-->>C: response DTO

    C->>S: approve(id)
    S->>R: find stock_adjustment
    S->>S: check created_by ≠ approved_by
    alt DAMAGED
        S->>R: update unit → DEFECTIVE
    else LOST
        S->>R: update unit → LOST
    else FOUND
        S->>R: update unit → IN_STOCK
    end
    S->>R: save status_log
    S->>R: update adjustment → APPROVED
    S-->>C: response DTO
```