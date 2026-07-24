# Export Flow — Frontend

## Route

| Path | Component | PageGuard | Description |
|------|-----------|-----------|-------------|
| `/stock/exports` | `ExportListPage` | `CAN_OPERATE` | List all exports |
| `/stock/exports/new` | `ExportCreatePage` | `CAN_OPERATE` | Create export |
| `/stock/exports/:id` | `ExportDetailPage` | `CAN_OPERATE` | Detail + approve/cancel |

## Page — ExportListPage

**File:** `features/stock/pages/export-list-page.tsx`

Uses shared `ReceiptListPage<R>` template.

| Prop | Value |
|------|-------|
| `useHook` | `useExportList` |
| `columns` | receiptCode, customer, reason, totalAmount, status, createdAt |
| `cancelService` | `exportService.cancel` |
| `approveService` | `exportService.approve` |
| `ViewModal` | `ViewExportModal` |
| `createRoute` | `/stock/exports/new` |

## Page — ExportCreatePage

**File:** `features/stock/pages/export-create-page.tsx`

| Section | Logic |
|---------|-------|
| Customer select | `CustomerSelectModal` — autocomplete, pick customer for export |
| Product + qty | Add products to export, auto FIFO select available serials |
| Serial override | NV can override selected serials, reason required |
| Reserve | Submit → POST → units get `RESERVED` status |

## Page — ExportDetailPage

**File:** `features/stock/pages/export-detail-page.tsx`

| Section | Content |
|---------|---------|
| Header | receiptCode, status, customer, reason |
| Items | product, qty, unitPrice, totalPrice |
| Units | serial, costPrice, sellPrice |
| Actions | `ApprovalDialog` — MANAGER/ADMIN approve or cancel |

## Hooks

| Hook | Query key | Mutation |
|------|-----------|----------|
| `useExportList` | `['exports', params]` | — |
| `useExportCreate` | — | `POST /export-receipt` |
| `useExportApprove` | — | `PUT /export-receipt/{id}/approve` |
| `useExportCancel` | — | `PUT /export-receipt/{id}/cancel` |

## Service

**File:** `services/export-service.ts`

| Function | API | Description |
|----------|-----|-------------|
| `getAll(params)` | `GET /export-receipt` | Paginated list |
| `getById(id)` | `GET /export-receipt/{id}` | Detail |
| `create(data)` | `POST /export-receipt` | Create + reserve units |
| `approve(id)` | `PUT /export-receipt/{id}/approve` | Approve |
| `cancel(id)` | `PUT /export-receipt/{id}/cancel` | Cancel |

## Component Tree

```mermaid
graph TD
    subgraph "/stock/exports"
        EL[ExportListPage] --> RLP[ReceiptListPage]
        RLP --> VEM[ViewExportModal]
    end

    subgraph "/stock/exports/new"
        EC[ExportCreatePage] --> CSM[CustomerSelectModal]
        EC --> FORM[Product + qty form]
        FORM --> SM[SerialModal (override)]
    end

    subgraph "/stock/exports/:id"
        ED[ExportDetailPage] --> AP[ApprovalDialog]
    end
```