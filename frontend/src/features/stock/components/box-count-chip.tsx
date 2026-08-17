import { cn } from "@/utils/cn"

export function BoxCountChip({ count, codes, className }: { count: number; codes?: string[]; className?: string }) {
  return (
    <span
      title={codes?.join(", ") ?? undefined}
      className={cn(
        "ml-1 rounded-sm bg-background border border-blue-200 px-1 text-[8px] font-semibold leading-3 align-middle text-blue-700 dark:border-blue-800 dark:text-blue-300",
        className,
      )}
    >
      {count}
    </span>
  )
}