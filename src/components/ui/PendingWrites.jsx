import { useState, useEffect } from 'react'
import { C } from '../../lib/theme'
import { readQueue, subscribe, flushQueue, removeEntry, unpark } from '../../lib/pendingQueue'

// Header indicator for records that couldn't reach Supabase yet. Invisible
// until something is actually waiting, so it costs nothing on a good day.
export default function PendingWrites() {
  const [queue, setQueue] = useState(() => readQueue())
  const [open, setOpen] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [confirmId, setConfirmId] = useState(null)

  useEffect(() => subscribe(setQueue), [])

  useEffect(() => {
    flushQueue()
    const onOnline = () => flushQueue()
    window.addEventListener('online', onOnline)
    // Cheap safety net: coming back into signal doesn't always fire 'online'.
    const timer = setInterval(() => { if (readQueue().length) flushQueue() }, 30000)
    return () => {
      window.removeEventListener('online', onOnline)
      clearInterval(timer)
    }
  }, [])

  if (!queue.length) return null

  const stuck = queue.filter(e => e.stuck).length
  const tone = stuck ? C.red : C.amber
  const toneBg = stuck ? 'rgba(248,113,113,.12)' : 'rgba(245,158,11,.12)'

  async function retryAll() {
    setRetrying(true)
    queue.filter(e => e.stuck).forEach(e => unpark(e.id))
    try { await flushQueue() } finally { setRetrying(false) }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
          padding: '5px 10px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit',
          background: toneBg, border: `1px solid ${tone}44`, color: tone,
          fontSize: 11, fontWeight: 700,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: tone, animation: stuck ? 'none' : 'pulse 1.5s infinite' }} />
        {queue.length}
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 300 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: 390, zIndex: 301,
            background: '#0F172A', borderRadius: '20px 20px 0 0',
            padding: '16px 18px max(20px, env(safe-area-inset-bottom))',
            maxHeight: '80vh', overflowY: 'auto',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.15)', margin: '0 auto 14px' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Waiting to upload</div>
              <div onClick={() => setOpen(false)} style={{ fontSize: 12, color: C.text3, cursor: 'pointer', padding: '4px 10px', background: 'rgba(255,255,255,.05)', borderRadius: 8 }}>Close</div>
            </div>
            <div style={{ fontSize: 11.5, color: C.text3, marginBottom: 14, lineHeight: 1.5 }}>
              {stuck > 0
                ? `${stuck} of these were refused by the server and need attention. The rest retry automatically.`
                : 'These are saved on this device and upload automatically once you have signal.'}
            </div>

            {queue.map(e => (
              <div key={e.id} style={{ background: C.surface, borderRadius: 12, padding: '11px 13px', marginBottom: 8, border: `1px solid ${e.stuck ? 'rgba(248,113,113,.25)' : C.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.label}</div>
                    <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>
                      {e.table} · {new Date(e.queuedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {e.attempts > 0 ? ` · ${e.attempts} ${e.attempts === 1 ? 'try' : 'tries'}` : ''}
                    </div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 20, height: 'fit-content', flexShrink: 0, background: e.stuck ? 'rgba(248,113,113,.12)' : 'rgba(245,158,11,.12)', color: e.stuck ? C.red : C.amber }}>
                    {e.stuck ? 'Needs help' : 'Queued'}
                  </span>
                </div>

                {e.stuck && e.lastError && (
                  <div style={{ fontSize: 10.5, color: C.red, marginTop: 7, lineHeight: 1.45 }}>{e.lastError}</div>
                )}

                {e.stuck && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 9 }}>
                    <button
                      onClick={async () => { unpark(e.id); await flushQueue() }}
                      style={{ flex: 1, padding: '7px 0', borderRadius: 9, border: '1px solid rgba(37,99,235,.3)', background: 'rgba(37,99,235,.12)', color: C.accent2, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Try again
                    </button>
                    <button
                      onClick={() => { if (confirmId === e.id) { removeEntry(e.id); setConfirmId(null) } else setConfirmId(e.id) }}
                      style={{ padding: '7px 12px', borderRadius: 9, border: 'none', background: confirmId === e.id ? '#DC2626' : 'rgba(248,113,113,.08)', color: confirmId === e.id ? '#fff' : C.red, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      {confirmId === e.id ? 'Tap to confirm' : 'Discard'}
                    </button>
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={retryAll}
              disabled={retrying}
              style={{ width: '100%', padding: 12, borderRadius: 12, marginTop: 6, border: 'none', background: retrying ? '#374151' : C.accent, color: '#fff', fontSize: 14, fontWeight: 600, cursor: retrying ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
            >
              {retrying ? 'Retrying…' : 'Retry all now'}
            </button>
          </div>
        </>
      )}
    </>
  )
}
