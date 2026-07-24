# Warranty Flow — Frontend

## Route

| Path | Component | PageGuard | Description |
|------|-----------|-----------|-------------|
| `/warranty` | `WarrantyListPage` | `CAN_OPERATE` | List warranty requests |
| `/warranty/new` | `WarrantyCreatePage` | `CAN_OPERATE` | Create request (lookup first) |
| `/warranty/:id` | `WarrantyDetailPage` | `CAN_OPERATE` | Detail + resolve + complete |

## Page — WarrantyListPage

**File:** `features/stock/pages/warranty-list-page.tsx`

| Feature | Detail |
|---------|--------|
| Tabs | All / Pending / Received / Under evaluation / Resolved |
| Columns | requestCode, serial, product, customer, status, resolution, createdAt |
| Search | By serial, phone, or request code |
| My handled tab | `/warranty-request/my-handled` |
| Create button | SALES/STOCK/QL → `/warranty/new` |

## Page — WarrantyCreatePage

**File:** `features/stock/pages/warranty-create-page.tsx`

Two-stage design:

```mermaid
graph LR
    subgraph "Stage A: Serial lookup"
        A1[Input serial] --> A2[GET lookup API]
        A2 --> A3{In warranty?}
        A3 -->|yes| A4[SerialInfoCard]
        A3 -->|no| A5[Show error / expired]
    end

    subgraph "SerialInfoCard"
        A4 --> C1[Product info + customer]
        A4 --> C2[Warranty bar: remaining months]
        A4 --> C3[Seal status badge]
        A4 --> C4[Replacement history count]
    end

    subgraph "Stage B: Issue form"
        A4 --> B1[Issue description textarea]
        B1 --> B2[Upload images]
        B2 --> B3[Submit → POST warranty-request]
        B3 --> B4[Print receipt button]
    end
```

| Component | File | Purpose |
|-----------|------|---------|
| `SerialLookupWidget` | (within page) | Input + scan + card result |
| `WarrantySealBadge` | (shared) | 3 states: verified / missing / not-applicable |

## Page — WarrantyDetailPage

**File:** `features/stock/pages/warranty-detail-page.tsx`

Most complex page — dynamic panel per state + role:

```mermaid
graph TD
    A[WarrantyDetailPage]
    A --> B[Header: requestCode + product + serial]
    A --> C[WarrantyTimeline component]
    C --> C1[Milestone: received]
    C1 --> C2[Milestone: checked]
    C2 --> C3[Milestone: evaluated]
    C3 --> C4[Milestone: resolved]

    A --> D[Panel — depends on state + role]

    D -->|Pending / STOCK| E[Receive button]
    D -->|Received / STOCK| F[Check form: CONFIRMED / REJECTED]
    D -->|Under evaluation / QL| G[4 ResolutionCards]
    D -->|Resolved / STOCK| H[Execution panel]
    D -->|Other roles| I[Read-only info]

    G --> G1[Repair]
    G --> G2[Replace + stock count]
    G --> G3[Refund]
    G --> G4[Reject]

    H --> H1[Repair: mark done / sent to mfr]
    H --> H2[Replace: select replacement serial]
    H --> H3[Refund: enter amount]
    H --> H4[Reject: print form]
```

| State | STOCK sees | QL sees | SALES sees |
|-------|------------|---------|------------|
| `PENDING` | Receive button | Read-only | Read-only |
| `RECEIVED` | Check form (CONFIRMED/REJECTED) | Read-only | Read-only |
| `UNDER_EVALUATION` | "Waiting for QL" | 4 ResolutionCards | "Waiting for QL" |
| `RESOLVED` | Execution panel | Read-only | Read-only + print |

## Hooks

| Hook | Query key | Mutation |
|------|-----------|----------|
| `useWarrantyList` | `['warranties', params]` | — |
| `useMyHandled` | `['my-warranties', params]` | — |
| `useWarrantyDetail` | `['warranty', id]` | — |
| `useLookupSerial` | `['warranty-lookup', serial]` | — |
| `useCreateWarranty` | — | `POST /warranty-request` |
| `useResolveWarranty` | — | `PUT /warranty-request/{id}/resolve` |
| `useCompleteWarranty` | — | `PUT /warranty-request/{id}/complete` |
| `useCancelWarranty` | — | `PUT /warranty-request/{id}/cancel` |

## Service

**File:** `services/warranty-service.ts`

| Function | API | Description |
|----------|-----|-------------|
| `getAll(params)` | `GET /warranty-request` | Paginated list |
| `getMyHandled(params)` | `GET /warranty-request/my-handled` | My handled |
| `getById(id)` | `GET /warranty-request/{id}` | Detail |
| `lookupBySerial(serial)` | `GET /warranty-request/lookup?serial={serial}` | Warranty status lookup |
| `create(data)` | `POST /warranty-request` | Create |
| `resolve(id, data)` | `PUT /warranty-request/{id}/resolve` | Set resolution |
| `complete(id, data)` | `PUT /warranty-request/{id}/complete` | Complete |
| `cancel(id)` | `PUT /warranty-request/{id}/cancel` | Cancel |

## Component Tree

```mermaid
graph TD
    subgraph "/warranty"
        WL[WarrantyListPage]
        WL --> TB[TabBar: status filters]
        WL --> DT[DataTable]
        WL --> BTN["+ New Warranty button"]
    end

    subgraph "/warranty/new"
        WC[WarrantyCreatePage]
        WC --> SLW[SerialLookupWidget]
        SLW --> SIC[SerialInfoCard]
        SIC --> WSB[WarrantySealBadge]
        WC --> FORM[Issue description form]
    end

    subgraph "/warranty/:id"
        WD[WarrantyDetailPage]
        WD --> WT[WarrantyTimeline]
        WD --> PAN[DynamicPanel]
        PAN --> RC[ResolutionCards]
        PAN --> EP[ExecutionPanel]
        WD --> AP[ApprovalDialog]
    end

    subgraph "Shared"
        WSB
        WT
        RC
        SIC
    end
```