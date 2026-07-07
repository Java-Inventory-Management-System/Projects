# Warehouse Management — Frontend

Quản lý kho nội bộ. React 19 + TypeScript + Tailwind v4 + shadcn/ui.

```bash
npm install
npm run dev
```

## Stack

Vite 7 · React Router v6 · TanStack React Query · Zustand · Axios · Recharts · React Hook Form + Zod

## Structure

```
src/
├── components/ui/     # shadcn/ui (Button, Table, Dialog, Form...)
│            /layout/  # AppShell, Sidebar, Topbar, ProtectedRoute
├── contexts/          # AuthProvider + mock users
├── lib/               # cn(), navigation.ts (nav items + role filter)
├── pages/             # login, dashboard, 403, 404
└── router.tsx         # Flat routing + PageGuard
```

## Mock users

| Role | Username |
|---|---|
| Admin | `admin` |
| Manager | `manager` |
| Sales | `sales` |
| Stock | `stock` |

Password any.

## Vibe code

**Impeccable** — gọi khi cần:
```
/impeccable craft <page>    # shape → build
/impeccable critique <page> # UX review
/impeccable polish <page>   # final pass
/impeccable audit           # design audit
```
List đầy đủ: `/impeccable` + Enter.

**Ponytail** — tự động active (mode `full`). Gõ khi cần:
```
/ponytail              # xem mode
/ponytail lite|ultra   # nới/thắt
/ponytail-review       # review code thừa
```

Design principles: `PRODUCT.md` · `DESIGN.md`

## Workflow

```
/impeccable craft <page>  → build
/ponytail-review          → gọn code
/impeccable polish <page> → ship
```

Trước commit: `/impeccable audit` + `/ponytail-audit`.

## API

Base: `http://localhost:8888/api/v1`
