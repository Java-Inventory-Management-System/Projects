import { useEffect, useState } from "react"
import { getInventoryStats } from "@/lib/mock-data"

interface Stats {
  totalProducts: number
  totalItems: number
  lowStockCount: number
  activeProducts: number
}

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getInventoryStats().then((data) => {
      setStats(data)
      setLoading(false)
    })
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome to the warehouse management system.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Products" value={loading ? "..." : String(stats?.totalProducts ?? "—")} />
        <StatCard label="Active Products" value={loading ? "..." : String(stats?.activeProducts ?? "—")} />
        <StatCard label="Total Stock Items" value={loading ? "..." : String(stats?.totalItems ?? "—")} />
        <StatCard label="Low Stock Alerts" value={loading ? "..." : String(stats?.lowStockCount ?? "—")} />
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  )
}
