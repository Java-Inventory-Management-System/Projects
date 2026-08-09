import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/utils/cn"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerProps {
  value?: string
  onChange?: (value: string) => void
  className?: string
  placeholder?: string
  min?: string
  max?: string
}

function DatePicker({ value, onChange, className, placeholder, min, max }: DatePickerProps) {
  const date = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined
  const minDate = min ? parse(min, "yyyy-MM-dd", new Date()) : undefined
  const maxDate = max ? parse(max, "yyyy-MM-dd", new Date()) : undefined

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex h-8 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-sm ring-offset-background",
            "focus:outline-none focus:ring-1 focus:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "hover:bg-accent hover:text-accent-foreground",
            !date && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">
            {date ? format(date, "dd/MM/yyyy") : placeholder ?? "dd/mm/yyyy"}
          </span>
          <CalendarIcon className="ml-2 size-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            if (d && isValid(d)) {
              onChange?.(format(d, "yyyy-MM-dd"))
            }
          }}
          fromDate={minDate}
          toDate={maxDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
