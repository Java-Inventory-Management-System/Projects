import { useCallback, useEffect, useRef, useState } from "react"

const DRAFT_PREFIX = "draft:"

function getDraftKey(path: string) {
  return `${DRAFT_PREFIX}${path}`
}

export function saveDraft(path: string, data: unknown) {
  try {
    localStorage.setItem(getDraftKey(path), JSON.stringify(data))
  } catch {
    /* quota exceeded, silent */
  }
}

export function loadDraft<T>(path: string): T | null {
  try {
    const raw = localStorage.getItem(getDraftKey(path))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearDraft(path: string) {
  localStorage.removeItem(getDraftKey(path))
}

export function useFormDraft<T extends Record<string, unknown>>(
  path: string,
  state: T,
  isDirty: boolean,
  onRestore: (data: T) => void,
) {
  const [draftAvailable, setDraftAvailable] = useState(false)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    const draft = loadDraft<T>(path)
    if (draft) setDraftAvailable(true)
  }, [path])

  useEffect(() => {
    if (!initialized.current || !isDirty) return
    const timer = setTimeout(() => saveDraft(path, state), 1000)
    return () => clearTimeout(timer)
  }, [path, state, isDirty])

  const restore = useCallback(() => {
    const draft = loadDraft<T>(path)
    if (draft) {
      onRestore(draft)
      setDraftAvailable(false)
    }
  }, [path, onRestore])

  const dismiss = useCallback(() => {
    clearDraft(path)
    setDraftAvailable(false)
  }, [path])

  return { draftAvailable, restore, dismiss }
}
