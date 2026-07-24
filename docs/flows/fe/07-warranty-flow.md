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
graph TD
    A[WarrantyCreatePage] --> B[Stage A: Serial lookup]
    B --> C[Input serial → call lookup API]
    C --> D{Serial found + in warranty?}
    D -->|Yes| E[Show SerialInfoCard]
    D -->|No| F[Show error / expired message]
    E --> G[Stage B: Issue description]
    G --> H[textarea + optional images]
    H --> I[Submit → POST warranty-request]
    I --> J[Print receipt button]

    E --> K[SerialInfoCard]
    K --> K1[Product info + customer]
    K --> K2[Warranty bar: remaining months]
    K --> K3[Seal status badge]
    K --> K4[Replacement history count]
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
    A[WarrantyDetailPage] --> B[Header: requestCode + product + serial]
    A --> C[WarrantyTimeline]
    C --> C1[4 milestones: received → checked → evaluated → resolved]
    A --> D{Customer + product info card}
    A --> E{Panel — depends on state + role}

    E -->|Pending + STOCK| F[Receive button]
    E -->|Received + STOCK| G[Check form: CONFIRMED / REJECTED]
    E -->|Under evaluation + QL| H[4 ResolutionCards]
    E -->|Resolved + STOCK| I[Execution panel]
    E -->|Other| J[Read-only info]

    H --> CARD1[Repair card]
    H --> CARD2[Replace card + stock count]
    H --> CARD3[Refund card]
    H --> CARD4[Reject card]

    I --> REPAIR[Mark repaired / sent to mfr]
    I --> REPLACE[Select replacement serial]
    I --> REFUND[Enter refund amount]
    I --> REJECT[Print rejection form]
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
        WL[WarrantyListPage] --> TB[TabBar]
        WL --> DT[DataTable]
        WL --> BTN[+ New Warranty]
    end

    subgraph "/warranty/new"
        WC[WarrantyCreatePage] --> SLW[SerialLookupWidget]
        SLW --> SIC[SerialInfoCard]
        SIC --> WSB[WarrantySealBadge]
        WC --> FORM[Issue form]
    end

    subgraph "/warranty/:id"
        WD[WarrantyDetailPage] --> WT[WarrantyTimeline]
        WD --> PANEL{DynamicPanel}
        PANEL --> RC[ResolutionCards ×4]
        PANEL --> EP[ExecutionPanel]
        WD --> AP[ApprovalDialog]
    end

    subgraph "Shared components"
        WSB
        WT
        RC
        SIC
    end
```