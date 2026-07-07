# Warehouse Management — Frontend

Hệ thống quản lý kho nội bộ. React 19 + TypeScript + Tailwind v4 + shadcn/ui.

## Bắt đầu

```bash
npm install
npm run dev
```

## Stack

Vite 7 · React Router v6 · TanStack React Query · Zustand · Axios · Recharts · React Hook Form + Zod

## Structure

```
src/
├── components/ui/     # shadcn/ui
├── contexts/          # AuthProvider + mock users
├── pages/             # login, dashboard, 403, 404
├── lib/navigation.ts  # role-based nav items
└── router.tsx         # flat routing + PageGuard
```

## Mock users

| Role | Username |
|---|---|
| Admin | `admin` |
| Manager | `manager` |
| Sales | `sales` |
| Stock | `stock` |

Password bất kỳ.

## Vibe code

Project có sẵn **Impeccable** (design) + **Ponytail** (code minimalism).

```
/impeccable craft <page>    # plan + build
/impeccable critique <page> # UX review
/ponytail-review            # check code thừa
```

Tham khảo `PRODUCT.md` và `DESIGN.md` cho design decisions.
