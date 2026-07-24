# 03 — Return Flow

## BE

### Controller — `ReturnReceiptController` (`/api/v1/return-receipts`)

| Method | Endpoint | Role Guard |
|--------|----------|------------|
| `GET` | `/return-receipts` | `CAN_OPERATE` |
| `GET` | `/return-receipts/{id}` | `CAN_OPERATE` |
| `POST` | `/return-receipts` | `CAN_OPERATE` |
| `PUT` | `/return-receipts/{id}/approve` | `CAN_APPROVE` |
| `PUT` | `/return-receipts/{id}/cancel` | `CAN_APPROVE` |

### Service — `ReturnReceiptService`

| Method | Logic |
|--------|-------|
| `create` | Gen code, link to original export, save receipt + items with condition + resulting action |
| `approve` | For each item: `GOOD→RESTOCK` → unit `SOLD→IN_STOCK`; `DEFECTIVE→SCRAP` → `SOLD→DISPOSED`; `DEFECTIVE→WARRANTY_TRANSFER` → `SOLD→DEFECTIVE`. Enforce 4-eyes |
| `cancel` | Set `CANCELLED` |

### State Machine

```mermaid
flowchart LR
    subgraph "ReturnReceipt"
        PA[PENDING_APPROVAL] -->|Approve 4-eyes| COMPLETED
        PA -->|Cancel| CANCELLED
    end
    subgraph "ProductUnit"
        SOLD -->|GOOD → RESTOCK| IN_STOCK
        SOLD -->|DEFECTIVE → SCRAP| DISPOSED
        SOLD -->|DEFECTIVE → WARRANTY_TRANSFER| DEFECTIVE
    end
```

### Sequence

```mermaid
sequenceDiagram
    participant C as ReturnReceiptController
    participant S as ReturnReceiptService
    participant DB as Database

    C->>S: create(request)
    S->>DB: SELECT original export
    S->>DB: INSERT return_receipt (PENDING_APPROVAL)
    S->>DB: INSERT items
    S-->>C: response

    C->>S: approve(id)
    S->>DB: SELECT receipt + items
    S->>S: check created_by ≠ approved_by
    loop each item
        alt GOOD → RESTOCK
            S->>DB: UPDATE unit → IN_STOCK
        else DEFECTIVE → SCRAP
            S->>DB: UPDATE unit → DISPOSED
        else DEFECTIVE → WARRANTY_TRANSFER
            S->>DB: UPDATE unit → DEFECTIVE
        end
    end
    S->>DB: INSERT status_logs
    S->>DB: UPDATE receipt → COMPLETED
    S-->>C: response
```

## FE

### Routes

| Path | Component | Guard |
|------|-----------|-------|
| `/returns` | `ReturnListPage` | `CAN_OPERATE` |
| `/returns/new` | `ReturnCreatePage` | `CAN_OPERATE` |
| `/returns/:id` | `ReturnDetailPage` | `CAN_OPERATE` |

### Pages

| Page | File | Chức năng |
|------|------|-----------|
| `ReturnListPage` | `features/stock/pages/return-list-page.tsx` | Dùng `ReceiptListPage` |
| `ReturnCreatePage` | `features/stock/pages/return-create-page.tsx` | Chọn export gốc → chọn reason → pick condition GOOD/DEFECTIVE → resulting action |
| `ReturnDetailPage` | `features/stock/pages/return-detail-page.tsx` | Chi tiết + `ApprovalDialog` |

### Hooks

| Hook | Mutation |
|------|----------|
| `useReturnList` | — |
| `useReturnCreate` | `POST /return-receipts` |
| `useReturnApprove` | `PUT /return-receipts/{id}/approve` |
| `useReturnCancel` | `PUT /return-receipts/{id}/cancel` |

### Service — `services/return-service.ts`

| Function | API |
|----------|-----|
| `getAll(params)` | `GET /return-receipts` |
| `getById(id)` | `GET /return-receipts/{id}` |
| `create(data)` | `POST /return-receipts` |
| `approve(id)` | `PUT /return-receipts/{id}/approve` |
| `cancel(id)` | `PUT /return-receipts/{id}/cancel` |

### Component Tree

```mermaid
flowchart LR
    subgraph "/returns"
        RL[ReturnListPage]
    end
    subgraph "/returns/new"
        RC[ReturnCreatePage]
        RC --- EXP[Select export receipt]
        RC --- COND[Condition: GOOD / DEFECTIVE]
        COND --- ACT[Action: RESTOCK / SCRAP / WARRANTY_TRANSFER]
    end
    subgraph "/returns/:id"
        RD[ReturnDetailPage] --- AP[ApprovalDialog]
    end
```