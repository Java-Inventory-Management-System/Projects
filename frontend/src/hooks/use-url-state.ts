import { useCallback } from "react"
import { useSearchParams } from "react-router-dom"

export function useUrlState(key: string, defaultValue: number): [number, (v: number) => void] {
  const [params, setParams] = useSearchParams()
  const value = Number(params.get(key)) || defaultValue

  const setValue = useCallback(
    (v: number) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        if (v === defaultValue) next.delete(key)
        else next.set(key, String(v))
        return next
      })
    },
    [key, defaultValue, setParams],
  )

  return [value, setValue]
}
