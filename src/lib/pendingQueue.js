// Nothing logged at a show should ever be lost to bad venue wifi.
//
// A failed insert is parked in localStorage and retried automatically when the
// connection returns. Only *transport* failures are queued — a row the server
// actively rejected would fail identically forever, so those still surface as
// errors the way they always did.

import { supabase, logActivity } from './supabase'

const KEY = 'evdex_pending_writes'
const MAX_ATTEMPTS = 25

// ── Retryability ────────────────────────────────────────────
// PostgREST and Postgres rejections carry a `code` (constraint violation, RLS,
// bad column...). Those are permanent. A dropped connection has no code.
const NETWORK_SIGNATURES = [
  'failed to fetch',        // Chrome / Edge
  'load failed',            // Safari
  'networkerror',           // Firefox
  'network request failed',
  'timeout',
  'aborted',
]

export function isRetryable(error) {
  if (!error) return false

  // Message first: supabase-js has shipped versions that set `code` to an
  // empty string and others that populate it on transport failures too, so a
  // recognised network signature outranks whatever code is present.
  const m = String(error.message || '').toLowerCase()
  if (NETWORK_SIGNATURES.some(sig => m.includes(sig))) return true

  // Genuinely offline — nothing that failed just now was the server's doing.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true

  // A real Postgres/PostgREST rejection. Retrying would fail identically.
  if (error.code) return false

  // Unrecognised: surface it rather than silently queueing a doomed record.
  return false
}

// ── Storage ─────────────────────────────────────────────────
export function readQueue() {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function writeQueue(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch (e) {
    console.error('Could not persist pending writes:', e)
  }
  notify()
}

export function enqueue(table, record, label) {
  const entry = {
    id: `pending_${Date.now()}_${Math.round(Math.random() * 1e6)}`,
    table,
    record,
    label: label || record?.description || record?.name || table,
    queuedAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
    stuck: false,
  }
  writeQueue([...readQueue(), entry])
  return entry
}

export function removeEntry(id) {
  writeQueue(readQueue().filter(e => e.id !== id))
}

export function queueCounts() {
  const list = readQueue()
  return { total: list.length, stuck: list.filter(e => e.stuck).length }
}

// ── Change notification (so the badge can react) ─────────────
const listeners = new Set()
export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
function notify() {
  for (const fn of listeners) {
    try { fn(readQueue()) } catch (e) { console.error(e) }
  }
}

// ── Flush ───────────────────────────────────────────────────
let flushing = false

export async function flushQueue() {
  if (flushing) return { sent: 0, remaining: readQueue().length }
  const list = readQueue()
  if (!list.length) return { sent: 0, remaining: 0 }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { sent: 0, remaining: list.length }
  }

  flushing = true
  let sent = 0
  try {
    for (const entry of list) {
      // Skip anything already parked as stuck; the user retries those by hand.
      if (entry.stuck) continue
      try {
        const { data, error } = await supabase
          .from(entry.table).insert(entry.record).select().single()

        if (error) {
          if (isRetryable(error)) {
            bump(entry.id, error)
            // Still offline — stop hammering and try again on the next trigger.
            break
          }
          // Server said no. Keep it visible rather than dropping bookkeeping data.
          park(entry.id, error)
          continue
        }

        removeEntry(entry.id)
        sent++
        await logActivity({
          actionType: `create_${entry.table.replace(/s$/, '')}`,
          entityType: entry.table,
          entityId: data?.id,
          summary: `Created ${entry.table.replace(/s$/, '')} (recovered from offline queue): ${entry.label}`,
          afterData: data,
        })
      } catch (e) {
        if (isRetryable(e)) { bump(entry.id, e); break }
        park(entry.id, e)
      }
    }
  } finally {
    flushing = false
  }
  return { sent, remaining: readQueue().length }
}

function bump(id, error) {
  writeQueue(readQueue().map(e => {
    if (e.id !== id) return e
    const attempts = e.attempts + 1
    return {
      ...e,
      attempts,
      lastError: String(error?.message || 'Connection failed'),
      stuck: attempts >= MAX_ATTEMPTS,
    }
  }))
}

function park(id, error) {
  writeQueue(readQueue().map(e => e.id === id ? {
    ...e,
    attempts: e.attempts + 1,
    lastError: String(error?.message || 'Rejected by the server'),
    stuck: true,
  } : e))
}

// Manual retry from the UI clears the stuck flag so flushQueue picks it up again.
export function unpark(id) {
  writeQueue(readQueue().map(e => e.id === id ? { ...e, stuck: false, attempts: 0 } : e))
}
