import { useState, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useQueries } from "@tanstack/react-query"
import { useWarrantyRequests } from "@/hooks/use-warranty"
import { getWarrantyRequests } from "@/services/warranty-service"
import { usePermission } from "@/hooks/use-permission"
import { ROLES } from "@/utils/permissions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { WARRANTY_STATUS } from "@/utils/types"
import { Plus, Eye, AlertTriangle } from "lucide-react"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import type { WarrantyRequest } from "@/utils/types"

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }> = {
  [WARRANTY_STATUS.PENDING]: { label: "Chờ tiếp nhận", variant: "secondary" },
  [WARRANTY_STATUS.RECEIVED]: { label: "Đang kiểm tra", variant: "outline", className: "border-blue-300 text-blue-600 dark:text-blue-400" },
  [WARRANTY_STATUS.UNDER_EVALUATION]: { label: "Chờ QL duyệt", variant: "outline", className: "border-amber-300 text-amber-600 dark:text-amber-400" },
  [WARRANTY_STATUS.RESOLVED]: { label: "Đã xử lý", variant: "default" },
}

const tabs = [
  { key: "", label: "Tất cả" },
  { key: WARRANTY_STATUS.PENDING, label: "Chờ tiếp nhận" },
  { key: WARRANTY_STATUS.RECEIVED, label: "Đang kiểm tra" },
  { key: WARRANTY_STATUS.UNDER_EVALUATION, label: "Chờ QL duyệt" },
  { key: WARRANTY_STATUS.RESOLVED, label: "Đã xử lý" },
] as const

export const WarrantyListPage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const perm = usePermission()

  const page = Number(searchParams.get("page") ?? "0")
  const activeTab = searchParams.get("status") ?? ""

  const [pageSize, setPageSize] = useState(10)
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | undefined>(undefined)

  const handleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" }
      if (prev.dir === "asc") return { key, dir: "desc" }
      return undefined
    })
  }, [])

  const { data, isLoading } = useWarrantyRequests(page, pageSize, activeTab || undefined, undefined)

  const counts = useQueries({
    queries: tabs.map((t) => ({
      queryKey: ["warranty-count", t.key],
      queryFn: () => getWarrantyRequests(0, 1, t.key || undefined),
      staleTime: 30000,
    })),
  })

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams)
      for (const [key, val] of Object.entries(updates)) {
        if (val) next.set(key, val)
        else next.delete(key)
      }
      setSearchParams(next)
    },
    [searchParams, setSearchParams],
  )

  const columns: Column<WarrantyRequest>[] = [
    {
      header: "Mã phiếu",
      sortKey: "requestCode",
      render: (r) => <span className="font-mono text-xs">{r.requestCode}</span>,
    },
    {
      header: "Sản phẩm",
      render: (r) => (
        <div className="flex items-center gap-1">
          <span className="font-medium">{r.productName}</span>
          <span className="text-xs text-muted-foreground">{r.productSku}</span>
        </div>
      ),
    },
    {
      header: "Serial",
      render: (r) => (
        <div className="flex items-center gap-1">
          <span className="font-mono text-xs">{r.serialNumber}</span>
          {r.resolutionType === "REPLACE" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertTriangle className="size-3 text-amber-500" />
              </TooltipTrigger>
              <TooltipContent>Đã đổi BH</TooltipContent>
            </Tooltip>
          )}
        </div>
      ),
    },
    { header: "Khách hàng", render: (r) => <span className="text-muted-foreground">{r.customerName ?? "—"}</span> },
    {
      header: "Trạng thái",
      sortKey: "status",
      render: (r) => {
        const st = statusLabel[r.status] ?? { label: r.status, variant: "secondary" as const }
        return <Badge variant={st.variant} className={st.className}>{st.label}</Badge>
      },
    },
    { header: "Người xử lý", render: (r) => <span className="text-muted-foreground">{r.handledByName ?? "—"}</span> },
    {
      header: "Ngày tạo",
      sortKey: "createdAt",
      render: (r) => (
        <span className="text-muted-foreground text-xs">{new Date(r.createdAt).toLocaleDateString("vi-VN")}</span>
      ),
    },
    {
      header: "Thao tác",
      className: "w-[70px]",
      render: (r) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => navigate(`/warranty/${r.id}`)}>
              <Eye className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Xem chi tiết</TooltipContent>
        </Tooltip>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Bảo hành</h1>
        {perm.hasRole(...ROLES.CAN_VIEW_INVENTORY) && (
          <Button onClick={() => navigate("/warranty/new")}>
            <Plus className="size-4 mr-1" /> Tiếp nhận bảo hành
          </Button>
        )}
      </div>

      {/* Tabs with badge counts */}
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((tab, i) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => updateParams({ status: tab.key || undefined, page: undefined })}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab.label}
              {(() => {
                const c = counts[i]?.data?.pagination.totalElements
                return c !== undefined ? (
                  <span
                    className={`text-[10px] tabular-nums ${
                      isActive
                        ? "text-primary-foreground/70"
                        : tab.key === WARRANTY_STATUS.UNDER_EVALUATION
                          ? "text-amber-500 font-semibold"
                          : "text-muted-foreground/70"
                    }`}
                  >
                    {c}
                  </span>
                ) : null
              })()}
            </button>
          )
        })}
      </div>

      <DataTable
        columns={columns}
        data={data?.content ?? []}
        isLoading={isLoading}
        emptyMessage="Không có phiếu bảo hành nào"
        sort={sort}
        onSort={handleSort}
        totalElements={data?.pagination.totalElements}
        page={page}
        totalPages={data?.pagination.totalPages}
        pageSize={pageSize}
        onPageChange={(p) => updateParams({ page: String(p) })}
        onPageSizeChange={(s) => {
          setPageSize(s)
          updateParams({ page: undefined })
        }}
      />
    </div>
  )
}
