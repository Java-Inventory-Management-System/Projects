import { useQuery } from "@tanstack/react-query"
import { usePermission } from "@/hooks/use-permission"
import { QUEUE_SECTIONS, type QueueItem } from "../config/queue-sections.config"

export interface WorkQueueData {
  count: number
  items: QueueItem[]
}

const EMPTY: WorkQueueData = { count: 0, items: [] }

export function useWorkQueue() {
  const { user, hasRole } = usePermission()
  const userId = user?.id ?? null
  const sections = QUEUE_SECTIONS.filter((s) => hasRole(...s.roles))

  const query = useQuery({
    queryKey: ["work-queue", user?.role, userId],
    queryFn: async () => {
      const results = await Promise.allSettled(sections.map((s) => s.load(userId)))
      const entries = results.map((r, i) => [sections[i].key, r.status === "fulfilled" ? r.value : EMPTY] as const)
      return Object.fromEntries(entries) as Record<string, WorkQueueData>
    },
    staleTime: 30_000,
  })

  const getSection = (key: string): WorkQueueData => query.data?.[key] ?? EMPTY

  return { ...query, sections, getSection }
}
