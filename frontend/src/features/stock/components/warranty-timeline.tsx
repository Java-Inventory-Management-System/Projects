import { Check } from "lucide-react"
import { cn } from "@/utils/cn"

interface Milestone {
  label: string
  timestamp: string | null
  actor: string | null
  done: boolean
}

export function WarrantyTimeline({ milestones }: { milestones: Milestone[] }) {
  return (
    <div className="flex items-start gap-0">
      {milestones.map((m, i) => (
        <div key={i} className="flex-1 relative">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "size-8 rounded-full flex items-center justify-center border-2 z-10 bg-background",
                m.done ? "border-primary bg-primary/10" : "border-muted-foreground/30",
              )}
            >
              {m.done ? <Check className="size-4 text-primary" /> : <div className="size-3 rounded-full bg-muted-foreground/30" />}
            </div>
            <span className={cn("text-xs mt-1.5 text-center leading-tight max-w-24", m.done ? "font-medium" : "text-muted-foreground/60")}>
              {m.label}
            </span>
            {m.timestamp && (
              <span className="text-[10px] text-muted-foreground mt-0.5">{new Date(m.timestamp).toLocaleDateString("vi-VN")}</span>
            )}
            {m.actor && <span className="text-[10px] text-muted-foreground">{m.actor}</span>}
          </div>
          {i < milestones.length - 1 && (
            <div className={cn("absolute top-4 left-[calc(50%+16px)] right-[calc(50%-16px)] h-[2px] -translate-y-1/2", m.done ? "bg-primary" : "bg-muted-foreground/20")} />
          )}
        </div>
      ))}
    </div>
  )
}
