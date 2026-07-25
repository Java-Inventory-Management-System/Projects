# 04 — Stock Check Flow

## BE

### Controller — `StockCheckController` (`/api/v1`)

| Method | Endpoint | Role Guard |
|--------|----------|------------|
| `GET` | `/stock-check/my` | `CAN_OPERATE_STOCK` |
| `GET` | `/stock-check` | `CAN_VIEW_INVENTORY` |
| `GET` | `/stock-check/{id}` | `CAN_VIEW_INVENTORY` |
| `POST` | `/stock-check` | `CAN_OPERATE_STOCK` |
| `PUT` | `/stock-check/{id}/items` | `CAN_OPERATE_STOCK` |
| `PUT` | `/stock-check/{id}/complete` | `CAN_OPERATE_STOCK` |
| `PUT` | `/stock-check/{id}/approve` | `CAN_APPROVE` |
| `PUT` | `/stock-check/{id}/reject` | `CAN_APPROVE` |

### Service — `StockCheckService`

| Method | Logic |
|--------|-------|
| `create` | Gen code, select units to check, save `PENDING` |
| `recordItems` | Per unit: record `actualStatus`, `countedQuantity`, auto-calc `difference` (MATCH/MISSING/UNEXPECTED/PARTIAL_SHORTAGE) |
| `complete` | Set `COMPLETED` |
| `approve` | `MISSING`→create LOST adjustment, `UNEXPECTED`→create FOUND unit. Enforce 4-eyes |
| `reject` | Set `REJECTED` — no changes |

### State Machine

```mermaid
flowchart LR
    PENDING -->|Record items| IN_PROGRESS
    PENDING -->|Auto-expire 1 day| EXPIRED
    IN_PROGRESS -->|Complete| COMPLETED
    COMPLETED -->|Approve: apply differences| APPROVED
    COMPLETED -->|Reject: no change| REJECTED
```

### Sequence

```mermaid
sequenceDiagram
    participant C as StockCheckController
    participant S as StockCheckService
    participant DB as Database

    C->>S: create(request)
    S->>DB: INSERT stock_check (PENDING)
    S->>DB: INSERT check_items
    S-->>C: response

    C->>S: recordItems(id, batch)
    loop each item
        S->>S: compare expected vs actual → DifferenceType
        S->>DB: UPDATE check_item
    end
    S-->>C: response

    C->>S: approve(id)
    loop item with difference
        alt MISSING
            S->>DB: UPDATE unit → LOST
        else UNEXPECTED
            S->>DB: INSERT new unit → IN_STOCK
        end
    end
    S->>DB: UPDATE stock_check → APPROVED
    S-->>C: response
```

## FE

### Routes

| Path | Component | Guard |
|------|-----------|-------|
| `/stock/checks` | `StockCheckListPage` | `CAN_VIEW_INVENTORY` |
| `/stock/checks/new` | `StockCheckCreatePage` | `CAN_OPERATE_STOCK` |
| `/stock/checks/:id` | `StockCheckDetailPage` | `CAN_VIEW_INVENTORY` |

### Pages

| Page | File | Chức năng |
|------|------|-----------|
| `StockCheckListPage` | `features/stock/pages/stock-check-list-page.tsx` | List + filter by status, my checks tab |
| `StockCheckCreatePage` | `features/stock/pages/stock-check-create-page.tsx` | Chọn zone + NV → auto-list IN_STOCK units |
| `StockCheckDetailPage` | `features/stock/pages/stock-check-detail-page.tsx` | `StockCheckItemsTable`: record actualStatus per unit. Complete → approve/reject. Difference summary bar |

### Hooks

| Hook | Mutation |
|------|----------|
| `useStockCheckList` | — |
| `useStockCheckCreate` | `POST /stock-check` |
| `useRecordItems` | `PUT /stock-check/{id}/items` |
| `useCompleteCheck` | `PUT /stock-check/{id}/complete` |
| `useApproveCheck` | `PUT /stock-check/{id}/approve` |
| `useRejectCheck` | `PUT /stock-check/{id}/reject` |

### Service — `services/stock-check-service.ts`

| Function | API |
|----------|-----|
| `getAll(params)` | `GET /stock-check` |
| `getMy(params)` | `GET /stock-check/my` |
| `getById(id)` | `GET /stock-check/{id}` |
| `create(data)` | `POST /stock-check` |
| `recordItems(id, items)` | `PUT /stock-check/{id}/items` |
| `complete(id)` | `PUT /stock-check/{id}/complete` |
| `approve(id, note)` | `PUT /stock-check/{id}/approve` |
| `reject(id, note)` | `PUT /stock-check/{id}/reject` |

### Component Tree

```mermaid
flowchart LR
    subgraph "/stock/checks"
        CL[StockCheckListPage] --- DT[DataTable]
    end
    subgraph "/stock/checks/new"
        CC[StockCheckCreatePage] --- ZONE[Zone selector]
        CC --- NV[NV assign]
    end
    subgraph "/stock/checks/:id"
        CD[StockCheckDetailPage] --- SCIT[StockCheckItemsTable]
        CD --- SUM[DifferenceSummaryBar]
        CD --- AP[ApprovalDialog]
    end
```