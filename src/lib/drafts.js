// Keeps a half-finished form alive across a refresh, an accidental back, or
// iOS reclaiming the tab while you're serving a customer. Drafts are local
// only and are cleared the moment the record actually saves.

import { useState, useEffect, useRef, useCallback } from 'react'

const PREFIX = 'evdex_draft_'
const MAX_AGE_MS = 12 * 60 * 60 * 1000 // a draft older than a show day is noise

export function saveDraft(key, data) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ savedAt: Date.now(), data }))
  } catch (e) {
    console.warn('Could not save draft:', e)
  }
}

export function loadDraft(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.data) return null
    if (Date.now() - (parsed.savedAt || 0) > MAX_AGE_MS) { clearDraft(key); return null }
    return parsed.data
  } catch {
    return null
  }
}

export function clearDraft(key) {
  try { localStorage.removeItem(PREFIX + key) } catch { /* nothing useful to do */ }
}

/**
 * Persists `snapshot` under `key` and restores it once on mount.
 *
 * @param key       storage key, unique per form
 * @param enabled   false while editing an existing record — restoring a draft
 *                  over real data would be worse than losing the draft
 * @param snapshot  plain serialisable object of the form's fields
 * @param isEmpty   true when there is nothing worth keeping (stops an empty
 *                  form overwriting a good draft on mount)
 * @param onRestore called with the stored snapshot when one is found
 */
export function useFormDraft({ key, enabled = true, snapshot, isEmpty, onRestore }) {
  const [restored, setRestored] = useState(false)
  const checked = useRef(false)
  const restoreRef = useRef(onRestore)
  restoreRef.current = onRestore

  useEffect(() => {
    if (!enabled || checked.current) return
    checked.current = true
    const draft = loadDraft(key)
    if (draft) {
      restoreRef.current?.(draft)
      setRestored(true)
    }
  }, [key, enabled])

  // Serialise in the dependency so this only fires on real content changes.
  const serialised = enabled && !isEmpty ? JSON.stringify(snapshot) : null
  useEffect(() => {
    if (serialised == null) return
    const t = setTimeout(() => saveDraft(key, JSON.parse(serialised)), 400)
    return () => clearTimeout(t)
  }, [key, serialised])

  const clear = useCallback(() => {
    clearDraft(key)
    setRestored(false)
  }, [key])

  return { restored, clear }
}
