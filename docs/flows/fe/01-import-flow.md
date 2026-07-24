# Import Flow — Frontend

## Route

| Path | Component | PageGuard | Description |
|------|-----------|-----------|-------------|
| `/stock/imports` | `ImportListPage` | `CAN_VIEW_INVENTORY` | List all import receipts |
| `/stock/imports/new` | `ImportCreatePage` | `CAN_OPERATE_STOCK` | Wizard create (4 steps) |
| `/stock/imports/:id` | `ImportDetailPage` | `CAN_VIEW_INVENTORY` | Detail + approve/cancel |

## Page — ImportListPage

**File:** `features/stock/pages/import-list-page.tsx`

Uses shared `ReceiptListPage<R>` template with pre-configured columns.

| Prop | Value |
|------|-------|
| `useHook` | `useImportList` |
| `columns` | receiptCode, supplier, totalAmount, status, createdAt |
| `cancelService` | `importService.cancel` |
| `approveService` | `importService.approve` |
| `ViewModal` | `ViewImportModal` |
| `createRoute` | `/stock/imports/new` |

## Page — ImportCreatePage (Wizard)

**File:** `features/stock/pages/import-create-page.tsx`

4-step wizard managed by `importCreateReducer`:

```mermaid
graph LR
    subgraph "Wizard steps (sequential)"
        S1[Step 1: Select Products] --> S2[Step 2: Enter Serials]
        S2 --> S3[Step 3: QC]
        S3 --> S4[Step 4: Confirm]
    end

    subgraph "Components per step"
        S1 --- SP[StepProducts]
        S1 --- SB[ImportCreateSidebar]
        S2 --- SS[StepSerials]
        S2 --- SM[SerialModal]
        S3 --- SQ[StepQC]
    end

    subgraph "Data flow"
        RD[ImportCreateReducer] --- IT[items state]
        RD --- SL[serials state]
        RD --- QC[qcResults state]
    end
```

| Step | Component | Logic |
|------|-----------|-------|
| 1. Products | `StepProducts` | Select product + qty from catalog, show sidebar summary |
| 2. Serials | `StepSerials` | Input serials (one per line, paste multi), assign location via `LocationPicker` |
| 3. QC | `StepQC` | Toggle Pass/Fail per serial, progress bar |
| 4. Confirm | (inline) | Summary + submit → `POST /import-receipt` |

## Page — ImportDetailPage

**File:** `features/stock/pages/import-detail-page.tsx`

| Section | Content |
|---------|---------|
| Header | receiptCode, status badge, supplier |
| Items table | product, qty, unitPrice, warrantyMonths |
| Units table | serial, location, status |
| Actions | `ApprovalDialog` for approve/cancel (role-based) |

## Hooks

| Hook | File | Query key | Mutation |
|------|------|-----------|----------|
| `useImportList` | `hooks/use-import-list.ts` | `['imports', params]` | — |
| `useImportDetail` | (inline or shared) | `['import', id]` | — |
| `useImportCreate` | (inline) | — | `POST /import-receipt` |
| `useImportApprove` | (inline) | — | `PUT /import-receipt/{id}/approve` |
| `useImportCancel` | (inline) | — | `PUT /import-receipt/{id}/cancel` |

## Service

**File:** `services/import-service.ts`

| Function | API | Description |
|----------|-----|-------------|
| `getAll(params)` | `GET /import-receipt` | Paginated list |
| `getById(id)` | `GET /import-receipt/{id}` | Detail |
| `create(data)` | `POST /import-receipt` | Create + auto-confirm |
| `approve(id)` | `PUT /import-receipt/{id}/approve` | Approve |
| `cancel(id)` | `PUT /import-receipt/{id}/cancel` | Cancel |

## Component Tree

```mermaid
graph TD
    subgraph "/stock/imports"
        IL[ImportListPage] --> TB[DataTable]
        IL --> PB[PaginationBar]
        IL --> VM[ViewImportModal]
    end

    subgraph "/stock/imports/new"
        IC[ImportCreatePage] --> WZ[Wizard Steps]
        WZ --> S1[StepProducts]
        WZ --> S2[StepSerials]
        WZ --> S3[StepQC]
        WZ --> S4[StepConfirm]
        IC --> SB[ImportCreateSidebar]
        IC --> RD[ImportCreateReducer]
    end

    subgraph "/stock/imports/:id"
        ID[ImportDetailPage] --> DT2[DetailTable]
        ID --> AP[ApprovalDialog]
    end
```