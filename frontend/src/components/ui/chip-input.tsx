import { useState, useRef, type KeyboardEvent, type ClipboardEvent } from "react"
import { useTranslation } from "react-i18next"
import { cn } from "@/utils/cn"
import { X } from "lucide-react"

interface ChipInputProps {
  value: string[]
  onChange: (chips: string[]) => void
  onDuplicate?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function ChipInput({ value, onChange, onDuplicate, placeholder, disabled, className }: ChipInputProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState("")
  const ref = useRef<HTMLInputElement>(null)

  function commit(chip: string) {
    const trimmed = chip.trim()
    if (!trimmed || disabled) return
    if (value.includes(trimmed)) {
      onDuplicate?.(trimmed)
      return
    }
    onChange([...value, trimmed])
  }

  function commitMany(text: string) {
    const candidates = text.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean)
    const added = candidates.filter((c) => !value.includes(c))
    if (added.length) onChange([...value, ...added])
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault()
      if (input) {
        commit(input)
        setInput("")
      }
    }
    if (e.key === "Backspace" && !input && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const text = e.clipboardData.getData("text")
    if (text) commitMany(text)
  }

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5 rounded-md border bg-background p-2 min-h-10 cursor-text",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      onClick={() => ref.current?.focus()}
    >
      {value.map((chip, i) => (
        <span
          key={`${chip}-${i}`}
          className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-0.5 text-xs font-mono"
        >
          {chip}
          {!disabled && (
            <button
              type="button"
              className="inline-flex size-3.5 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10"
              onClick={(e) => {
                e.stopPropagation()
                onChange(value.filter((_, j) => j !== i))
              }}
            >
              <X className="size-3" />
            </button>
          )}
        </span>
      ))}
      <input
        ref={ref}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={value.length === 0 ? (placeholder ?? t('chipInput.placeholder')) : ""}
        disabled={disabled}
        className="flex-1 min-w-[100px] border-none bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
      />
    </div>
  )
}
