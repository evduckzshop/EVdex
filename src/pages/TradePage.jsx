import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTrades, useContacts, useShows } from '../hooks/useData'
import { useAuth } from '../context/AuthContext'
import { useActiveShow } from '../context/ShowContext'
import { uploadPhoto } from '../lib/supabase'
import { C, Label, Input, Select, ChipGroup, CtaButton, GhostButton, Toast, AutocompleteInput } from '../components/ui/FormComponents'

const MAX_ITEMS = 100

function emptyItem() { return { description: '', market: '', pct: '100', tradeValue: '' } }
function emptyYourItem() { return { description: '', price: '' } }

function calcTradeValue(market, pct) {
  const m = parseFloat(market) || 0
  const p = parseFloat(pct) || 0
  if (m > 0 && p > 0) return Math.round(m * p / 100 * 100) / 100
  return 0
}

// ── TRADE CALCULATOR ─────────────────────────────────────────

function TradeCalculator({ onSaved }) {
  const { insert } = useTrades()
  const { rows: contacts, fetch: fetchContacts } = useContacts()
  const { rows: shows, fetch: fetchShows } = useShows()
  const { profile } = useAuth()
  const { activeShowId } = useActiveShow()
  const userName = profile?.full_name?.split(' ')[0] || 'You'

  const [theirItems, setTheirItems] = useState([emptyItem()])
  const [yourItems, setYourItems] = useState([emptyYourItem()])
  const [contactName, setContactName] = useState('')
  const [contactId, setContactId] = useState(null)
  const [showId, setShowId] = useState('')
  const [description, setDescription] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoName, setPhotoName] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [showValueBar, setShowValueBar] = useState(false)
  const [showSettlement, setShowSettlement] = useState(false)
  const [settlementPayment, setSettlementPayment] = useState('Cash')
  const [settlementAmount, setSettlementAmount] = useState('')
  const [customPayment, setCustomPayment] = useState('')

  useEffect(() => { fetchContacts(); fetchShows() }, [])
  useEffect(() => { if (activeShowId) setShowId(activeShowId) }, [activeShowId])

  // Their side calculations
  const theirTotalMarket = theirItems.reduce((s, i) => s + (parseFloat(i.market) || 0), 0)
  const theirTotalTrade = theirItems.reduce((s, i) => s + (parseFloat(i.tradeValue) || 0), 0)
  const theirAvgPct = theirTotalMarket > 0 ? Math.round((theirTotalTrade / theirTotalMarket) * 1000) / 10 : 0

  // Your side calculations
  const yourTotal = yourItems.reduce((s, i) => s + (parseFloat(i.price) || 0), 0)

  // Delta: positive = customer owes, negative = you owe
  const delta = yourTotal - theirTotalTrade
  const valueGained = theirTotalMarket - theirTotalTrade

  function updateTheirItem(idx, field, value) {
    setTheirItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: value }
      if (field === 'tradeValue') {
        // Back-calculate trade % from manual trade value
        const m = parseFloat(updated.market) || 0
        const tv = parseFloat(value) || 0
        if (m > 0) updated.pct = String(Math.round(tv / m * 1000) / 10)
      } else {
        // Auto-calculate trade value from market & %
        updated.tradeValue = String(calcTradeValue(updated.market, updated.pct))
      }
      return updated
    }))
  }

  function updateYourItem(idx, field, value) {
    setYourItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function addTheirItem() { if (theirItems.length < MAX_ITEMS) setTheirItems(prev => [...prev, emptyItem()]) }
  function addYourItem() { if (yourItems.length < MAX_ITEMS) setYourItems(prev => [...prev, emptyYourItem()]) }

  function removeTheirItem(idx) { if (theirItems.length > 1) setTheirItems(prev => prev.filter((_, i) => i !== idx)) }
  function removeYourItem(idx) { if (yourItems.length > 1) setYourItems(prev => prev.filter((_, i) => i !== idx)) }

  function pickPhoto() {
    const inp = document.createElement('input')
    inp.type = 'file'; inp.accept = 'image/*'
    inp.onchange = e => { const f = e.target.files[0]; if (f) { setPhotoFile(f); setPhotoName(f.name) } }
    inp.click()
  }

  function handleConfirm() {
    const filledTheir = theirItems.filter(i => parseFloat(i.market) > 0)
    const filledYour = yourItems.filter(i => parseFloat(i.price) > 0)
    if (filledTheir.length === 0 && filledYour.length === 0) {
      setMsg({ text: 'Add at least one item to either side.', type: 'error' }); return
    }
    if (delta !== 0) {
      setSettlementAmount(Math.abs(delta).toFixed(2))
      setSettlementPayment('Cash')
      setCustomPayment('')
      setShowSettlement(true)
    } else {
      saveTrade(null, null)
    }
  }

  async function saveTrade(paymentMethod, amountPaid) {
    setSaving(true)
    try {
      let photo_url = null
      if (photoFile) photo_url = await uploadPhoto(profile.id, photoFile)

      const filledTheir = theirItems.filter(i => parseFloat(i.market) > 0)
      const filledYour = yourItems.filter(i => parseFloat(i.price) > 0)

      const record = {
        description: description.trim() || null,
        their_items: filledTheir.map(i => ({
          description: i.description.trim() || null,
          market_value: parseFloat(i.market) || 0,
          trade_pct: parseFloat(i.pct) || 0,
          trade_value: parseFloat(i.tradeValue) || 0,
        })),
        your_items: filledYour.map(i => ({
          description: i.description.trim() || null,
          market_value: parseFloat(i.price) || 0,
        })),
        their_total_market: theirTotalMarket,
        their_total_trade: theirTotalTrade,
        their_avg_pct: theirAvgPct,
        your_total: yourTotal,
        delta: Math.round(delta * 100) / 100,
        contact_id: contactId || null,
        buyer_contact_id: contactId || null,
        show_id: showId || null,
        photo_url,
        payment_method: paymentMethod || null,
        amount_paid: amountPaid != null ? parseFloat(amountPaid) || 0 : null,
      }

      await insert(record)
      setMsg({ text: 'Trade confirmed!', type: 'success' })
      setShowSettlement(false)

      // Reset
      setTheirItems([emptyItem()])
      setYourItems([emptyYourItem()])
      setContactName(''); setContactId(null)
      setDescription(''); setPhotoFile(null); setPhotoName('')
      if (onSaved) onSaved()
      setTimeout(() => setMsg({ text: '', type: '' }), 3000)
    } catch (e) {
      setMsg({ text: 'Error: ' + e.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Toast message={msg.text} type={msg.type} />

      {/* Show selector */}
      <Select value={showId} onChange={e => setShowId(e.target.value)} style={{ marginBottom: 10 }}>
        <option value="">No show — general trade</option>
        {shows.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </Select>

      {/* Contact */}
      <AutocompleteInput
        contacts={contacts}
        value={contactName}
        contactId={contactId}
        onSelect={(name, cid) => { setContactName(name); setContactId(cid) }}
        placeholder="Customer name (optional)"
      />

      {/* ── DELTA DISPLAY ──────────────────────────────────── */}
      <div style={{
        background: delta === 0 && (theirTotalTrade > 0 || yourTotal > 0)
          ? 'rgba(16,185,129,.08)'
          : delta > 0 ? 'rgba(16,185,129,.08)' : delta < 0 ? 'rgba(248,113,113,.08)' : C.surface2,
        borderRadius: 14, padding: '14px 16px', marginTop: 12, marginBottom: 4,
        border: `1px solid ${delta === 0 && (theirTotalTrade > 0 || yourTotal > 0) ? 'rgba(16,185,129,.2)' : delta > 0 ? 'rgba(16,185,129,.2)' : delta < 0 ? 'rgba(248,113,113,.2)' : C.border}`,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 9, fontWeight: 600, color: C.text3, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>
          {delta > 0 ? 'Customer owes' : delta < 0 ? 'You owe' : theirTotalTrade > 0 || yourTotal > 0 ? 'Even trade' : 'Add items to calculate'}
        </div>
        <div style={{
          fontSize: 28, fontWeight: 700, letterSpacing: -1,
          color: delta === 0 && (theirTotalTrade > 0 || yourTotal > 0) ? C.green : delta > 0 ? C.green : delta < 0 ? C.red : C.text3,
        }}>
          {theirTotalTrade > 0 || yourTotal > 0 ? `$${Math.abs(delta).toFixed(2)}` : '$0.00'}
        </div>
      </div>

      {/* ── SUMMARY ROW ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8, marginBottom: 12 }}>
        <div style={{ background: C.surface, borderRadius: 10, padding: '8px 10px', textAlign: 'center', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 8, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Customer trade value</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.red }}>${theirTotalTrade.toFixed(2)}</div>
          <div style={{ fontSize: 9, color: C.text3 }}>avg {theirAvgPct}%</div>
        </div>
        <div style={{ background: C.surface, borderRadius: 10, padding: '8px 10px', textAlign: 'center', border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 8, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{userName}'s market</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>${yourTotal.toFixed(2)}</div>
          <div style={{ fontSize: 9, color: C.text3 }}>{yourItems.filter(i => parseFloat(i.price) > 0).length} items</div>
        </div>
      </div>

      {/* ── VALUE BREAKDOWN BAR ────────────────────────────── */}
      {theirTotalMarket > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div onClick={() => setShowValueBar(!showValueBar)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            padding: '6px 0', cursor: 'pointer',
          }}>
            <div style={{ fontSize: 10, color: C.accent2, fontWeight: 500 }}>Value breakdown</div>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ transform: showValueBar ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s ease' }}>
              <path d="M3 4.5l3 3 3-3" stroke={C.accent2} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {showValueBar && (
            <div style={{ background: C.surface2, borderRadius: 12, padding: '10px 14px', border: `1px solid ${C.border}` }}>
              {[
                { label: 'Customer Market Value', value: `$${theirTotalMarket.toFixed(2)}`, color: C.text },
                { label: 'Trade-In Value', value: `$${theirTotalTrade.toFixed(2)}`, color: C.amber },
                { label: 'Value Gained', value: `$${valueGained.toFixed(2)}`, color: C.green },
              ].map((r, i, arr) => (
                <div key={r.label} style={{
                  display: 'flex', justifyContent: 'space-between', padding: '6px 0',
                  borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
                }}>
                  <div style={{ fontSize: 12, color: C.text3 }}>{r.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: r.color }}>{r.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── THEIR SIDE ─────────────────────────────────────── */}
      <div style={{ fontSize: 10, fontWeight: 600, color: C.red, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>
        Customer
      </div>
      {theirItems.map((item, idx) => (
        <div key={idx} style={{
          background: C.surface, borderRadius: 12, padding: '10px 12px',
          marginBottom: 6, border: `1px solid ${C.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.text3 }}>Item {idx + 1}</div>
            {theirItems.length > 1 && (
              <div onClick={() => removeTheirItem(idx)} style={{ fontSize: 10, color: C.red, cursor: 'pointer', fontWeight: 600 }}>Remove</div>
            )}
          </div>
          <input
            value={item.description}
            onChange={e => updateTheirItem(idx, 'description', e.target.value)}
            placeholder="Card name"
            style={{
              width: '100%', padding: '8px 10px', background: C.surface2,
              border: `1px solid ${C.border2}`, borderRadius: 8, fontSize: 12,
              color: C.text, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 6,
            }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            <div>
              <div style={{ fontSize: 8, color: C.text3, marginBottom: 3 }}>Market ($)</div>
              <input type="number" inputMode="decimal" min="0" value={item.market}
                onChange={e => { const v = e.target.value; if (v === '' || parseFloat(v) >= 0) updateTheirItem(idx, 'market', v) }}
                placeholder="0.00"
                style={{ width: '100%', padding: '7px 6px', background: C.surface2, border: `1px solid ${C.border2}`, borderRadius: 7, fontSize: 13, color: C.text, fontFamily: 'inherit', outline: 'none', fontWeight: 600, textAlign: 'center', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 8, color: C.text3, marginBottom: 3 }}>Trade %</div>
              <input type="number" inputMode="decimal" min="0" value={item.pct}
                onChange={e => { const v = e.target.value; if (v === '' || parseFloat(v) >= 0) updateTheirItem(idx, 'pct', v) }}
                placeholder="60"
                style={{ width: '100%', padding: '7px 6px', background: 'rgba(37,99,235,.05)', border: '1px solid rgba(37,99,235,.3)', borderRadius: 7, fontSize: 13, color: C.accent2, fontFamily: 'inherit', outline: 'none', fontWeight: 600, textAlign: 'center', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 8, color: C.text3, marginBottom: 3 }}>Trade value</div>
              <input type="number" inputMode="decimal" min="0" value={item.tradeValue}
                onChange={e => { const v = e.target.value; if (v === '' || parseFloat(v) >= 0) updateTheirItem(idx, 'tradeValue', v) }}
                placeholder="0.00"
                style={{ width: '100%', padding: '7px 6px', background: 'rgba(245,158,11,.05)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 7, fontSize: 13, fontWeight: 600, color: C.amber, fontFamily: 'inherit', outline: 'none', textAlign: 'center', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>
      ))}
      <button onClick={addTheirItem} style={{
        width: '100%', padding: 8, borderRadius: 10, marginBottom: 16,
        background: 'rgba(248,113,113,.04)', border: '1px dashed rgba(248,113,113,.2)',
        fontSize: 11, fontWeight: 600, color: C.red, cursor: 'pointer', fontFamily: 'inherit',
      }}>
        + Add item
      </button>

      {/* ── YOUR SIDE ──────────────────────────────────────── */}
      <div style={{ fontSize: 10, fontWeight: 600, color: C.green, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>
        {userName}
      </div>
      {yourItems.map((item, idx) => (
        <div key={idx} style={{
          background: C.surface, borderRadius: 12, padding: '10px 12px',
          marginBottom: 6, border: `1px solid ${C.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.text3 }}>Item {idx + 1}</div>
            {yourItems.length > 1 && (
              <div onClick={() => removeYourItem(idx)} style={{ fontSize: 10, color: C.red, cursor: 'pointer', fontWeight: 600 }}>Remove</div>
            )}
          </div>
          <input
            value={item.description}
            onChange={e => updateYourItem(idx, 'description', e.target.value)}
            placeholder="Card name"
            style={{
              width: '100%', padding: '8px 10px', background: C.surface2,
              border: `1px solid ${C.border2}`, borderRadius: 8, fontSize: 12,
              color: C.text, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 6,
            }}
          />
          <div>
            <div style={{ fontSize: 8, color: C.text3, marginBottom: 3 }}>Market ($)</div>
            <input type="number" inputMode="decimal" min="0" value={item.price}
              onChange={e => { const v = e.target.value; if (v === '' || parseFloat(v) >= 0) updateYourItem(idx, 'price', v) }}
              placeholder="0.00"
              style={{ width: '100%', padding: '7px 6px', background: C.surface2, border: `1px solid ${C.border2}`, borderRadius: 7, fontSize: 13, color: C.text, fontFamily: 'inherit', outline: 'none', fontWeight: 600, textAlign: 'center', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      ))}
      <button onClick={addYourItem} style={{
        width: '100%', padding: 8, borderRadius: 10, marginBottom: 16,
        background: 'rgba(16,185,129,.04)', border: '1px dashed rgba(16,185,129,.2)',
        fontSize: 11, fontWeight: 600, color: C.green, cursor: 'pointer', fontFamily: 'inherit',
      }}>
        + Add item
      </button>

      {/* Description */}
      <Label>Trade notes (optional)</Label>
      <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Trade at Phoenix show" />

      {/* Photo */}
      <Label>Photo (optional)</Label>
      {photoName ? (
        <div style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, padding: '10px 12px', marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, fontSize: 12, fontWeight: 500, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{photoName}</div>
          <div onClick={() => { setPhotoFile(null); setPhotoName('') }} style={{ fontSize: 11, color: C.red, cursor: 'pointer', flexShrink: 0 }}>Remove</div>
        </div>
      ) : (
        <div onClick={pickPhoto} style={{ background: C.surface2, borderRadius: 12, border: '1.5px dashed rgba(255,255,255,.1)', padding: 12, textAlign: 'center', cursor: 'pointer', marginTop: 8 }}>
          <div style={{ fontSize: 12, color: C.text3, fontWeight: 500 }}>Tap to attach photo</div>
        </div>
      )}

      <CtaButton onClick={handleConfirm} disabled={saving} color="accent">
        {saving ? 'Saving...' : 'Confirm Trade'}
      </CtaButton>

      {/* ── SETTLEMENT POPUP ────────────────────────────────── */}
      {showSettlement && (
        <>
          <div onClick={() => setShowSettlement(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 300 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: 390, zIndex: 301,
            background: '#0F172A', borderRadius: '20px 20px 0 0',
            padding: '16px 18px max(20px, env(safe-area-inset-bottom))',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.15)', margin: '0 auto 14px' }} />

            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Settle difference</div>
            <div style={{ fontSize: 12, color: C.text3, marginBottom: 16 }}>
              {delta > 0 ? 'Customer owes' : 'You owe'} <span style={{ fontWeight: 600, color: delta > 0 ? C.green : C.red }}>${Math.abs(delta).toFixed(2)}</span> on top of the trade
            </div>

            <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>Payment method</div>
            <ChipGroup
              options={['Cash', 'Venmo', 'Zelle', 'Other']}
              value={['Cash', 'Venmo', 'Zelle'].includes(settlementPayment) ? settlementPayment : 'Other'}
              onChange={v => { if (v === 'Other') { setSettlementPayment(customPayment || 'Other') } else { setSettlementPayment(v); setCustomPayment('') } }}
              color="green"
            />
            {!['Cash', 'Venmo', 'Zelle'].includes(settlementPayment) && (
              <input
                value={customPayment}
                onChange={e => { setCustomPayment(e.target.value); setSettlementPayment(e.target.value || 'Other') }}
                placeholder="Enter payment method..."
                style={{
                  width: '100%', padding: '8px 10px', marginTop: 8, background: C.surface2,
                  border: `1px solid ${C.border2}`, borderRadius: 8, fontSize: 12,
                  color: C.text, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                }}
              />
            )}

            <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.06em', textTransform: 'uppercase', marginTop: 14, marginBottom: 6 }}>Amount paid</div>
            <input
              type="number" inputMode="decimal" min="0"
              value={settlementAmount}
              onChange={e => { const v = e.target.value; if (v === '' || parseFloat(v) >= 0) setSettlementAmount(v) }}
              style={{
                width: '100%', padding: '10px 12px', background: C.surface2,
                border: `1px solid ${C.border2}`, borderRadius: 10, fontSize: 16,
                color: C.text, fontFamily: 'inherit', outline: 'none', fontWeight: 600,
                textAlign: 'center', boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
              <button onClick={() => setShowSettlement(false)} style={{
                padding: 12, borderRadius: 12, background: 'rgba(255,255,255,.05)',
                border: `1px solid ${C.border}`, fontSize: 13, fontWeight: 600,
                color: C.text3, cursor: 'pointer', fontFamily: 'inherit',
              }}>Cancel</button>
              <button onClick={() => saveTrade(settlementPayment, settlementAmount)} disabled={saving} style={{
                padding: 12, borderRadius: 12, background: 'rgba(37,99,235,.15)',
                border: '1px solid rgba(37,99,235,.3)', fontSize: 13, fontWeight: 600,
                color: C.accent2, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}>{saving ? 'Saving...' : 'Confirm'}</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── TRADE HISTORY ────────────────────────────────────────────

function TradeDetail({ trade, onClose, isAdmin, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      await onDelete(trade.id)
      onClose()
    } catch (e) {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const theirItems = trade.their_items || []
  const yourItems = trade.your_items || []

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 300 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 390, zIndex: 301,
        background: '#0F172A', borderRadius: '20px 20px 0 0',
        padding: '16px 18px max(20px, env(safe-area-inset-bottom))',
        maxHeight: '80vh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.15)', margin: '0 auto 14px' }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Trade details</div>
          <div onClick={onClose} style={{ fontSize: 12, color: C.text3, cursor: 'pointer', padding: '4px 10px', background: 'rgba(255,255,255,.05)', borderRadius: 8 }}>Close</div>
        </div>

        {/* Delta */}
        <div style={{
          background: trade.delta > 0 ? 'rgba(16,185,129,.08)' : trade.delta < 0 ? 'rgba(248,113,113,.08)' : 'rgba(16,185,129,.08)',
          borderRadius: 12, padding: '10px 14px', marginBottom: 12, textAlign: 'center',
          border: `1px solid ${trade.delta > 0 ? 'rgba(16,185,129,.2)' : trade.delta < 0 ? 'rgba(248,113,113,.2)' : 'rgba(16,185,129,.2)'}`,
        }}>
          <div style={{ fontSize: 9, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>
            {trade.delta > 0 ? 'Customer owed' : trade.delta < 0 ? 'You owed' : 'Even trade'}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: trade.delta >= 0 ? C.green : C.red }}>
            ${Math.abs(trade.delta).toFixed(2)}
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
          <div style={{ background: C.surface, borderRadius: 8, padding: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 8, color: C.text3, textTransform: 'uppercase', marginBottom: 2 }}>Customer market</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>${Number(trade.their_total_market).toFixed(0)}</div>
          </div>
          <div style={{ background: C.surface, borderRadius: 8, padding: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 8, color: C.text3, textTransform: 'uppercase', marginBottom: 2 }}>Customer trade</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.red }}>${Number(trade.their_total_trade).toFixed(0)}</div>
          </div>
          <div style={{ background: C.surface, borderRadius: 8, padding: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 8, color: C.text3, textTransform: 'uppercase', marginBottom: 2 }}>{trade.profiles?.full_name?.split(' ')[0] || 'Staff'} market</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>${Number(trade.your_total).toFixed(0)}</div>
          </div>
        </div>

        {/* Their items */}
        {theirItems.length > 0 && (
          <>
            <div style={{ fontSize: 9, fontWeight: 600, color: C.red, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>Customer items</div>
            <div style={{ background: C.surface, borderRadius: 10, padding: '2px 12px', marginBottom: 10, border: `1px solid ${C.border}` }}>
              {theirItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < theirItems.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ fontSize: 12, color: C.text }}>{item.description || `Item ${i + 1}`}</div>
                  <div style={{ fontSize: 12, color: C.text3 }}>${Number(item.market_value).toFixed(0)} @ {item.trade_pct}% = <span style={{ color: C.amber, fontWeight: 600 }}>${Number(item.trade_value).toFixed(0)}</span></div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Your items */}
        {yourItems.length > 0 && (
          <>
            <div style={{ fontSize: 9, fontWeight: 600, color: C.green, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>{trade.profiles?.full_name?.split(' ')[0] || 'Staff'} items</div>
            <div style={{ background: C.surface, borderRadius: 10, padding: '2px 12px', marginBottom: 10, border: `1px solid ${C.border}` }}>
              {yourItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < yourItems.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ fontSize: 12, color: C.text }}>{item.description || `Item ${i + 1}`}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.green }}>${Number(item.market_value).toFixed(0)}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Settlement info */}
        {trade.payment_method && (
          <div style={{
            background: C.surface, borderRadius: 10, padding: '8px 12px', marginBottom: 10,
            border: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: 8, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Difference paid via</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{trade.payment_method}</div>
            </div>
            {trade.amount_paid != null && (
              <div style={{ fontSize: 16, fontWeight: 700, color: C.accent2 }}>${Number(trade.amount_paid).toFixed(2)}</div>
            )}
          </div>
        )}

        {/* Meta */}
        <div style={{ fontSize: 10, color: C.text3, marginBottom: 12 }}>
          {trade.description && <div style={{ marginBottom: 2 }}>{trade.description}</div>}
          {new Date(trade.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          {trade.profiles?.full_name && ` · ${trade.profiles.full_name}`}
        </div>

        {/* Admin delete */}
        {isAdmin && (
          <button onClick={handleDelete} disabled={deleting} style={{
            width: '100%', padding: 12, borderRadius: 12,
            background: confirmDelete ? '#DC2626' : 'rgba(248,113,113,.08)',
            border: confirmDelete ? 'none' : '1px solid rgba(248,113,113,.15)',
            fontSize: 13, fontWeight: 600,
            color: confirmDelete ? '#fff' : C.red,
            cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          }}>
            {deleting ? 'Deleting...' : confirmDelete ? 'Tap again to confirm' : 'Delete trade'}
          </button>
        )}
      </div>
    </>
  )
}

// ── MAIN PAGE ────────────────────────────────────────────────

export default function TradePage() {
  const { rows, fetch, remove, loading } = useTrades()
  const { isAdmin } = useAuth()
  const [selectedTrade, setSelectedTrade] = useState(null)

  useEffect(() => { fetch() }, [])

  return (
    <div style={{ paddingTop: 12 }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg,#0f1a20,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 12, border: '1px solid rgba(37,99,235,.15)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Trade calculator
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: -1, margin: '4px 0 2px' }}>
          New Trade
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
          Build both sides in real time
        </div>
      </div>

      <TradeCalculator onSaved={fetch} />

      {/* Trade History */}
      <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', margin: '20px 0 8px' }}>
        Recent trades
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', color: C.text3, padding: 20 }}>Loading...</div>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: 'center', color: C.text3, padding: 20, fontSize: 13 }}>No trades yet.</div>
      ) : (
        rows.slice(0, 20).map(t => (
          <div key={t.id} onClick={() => setSelectedTrade(t)} style={{
            background: C.surface, borderRadius: 14, padding: '12px 14px',
            marginBottom: 6, border: `1px solid ${C.border}`, cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.description || `Trade · ${(t.their_items?.length || 0) + (t.your_items?.length || 0)} items`}
                </div>
                <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>
                  <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: 'rgba(37,99,235,.08)', color: C.accent2, marginRight: 4 }}>Trade</span>
                  {new Date(t.created_at).toLocaleDateString()}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.green }}>
                +${(Number(t.their_total_trade) + (t.delta > 0 ? (Number(t.amount_paid) || 0) : 0)).toFixed(0)}
              </div>
            </div>
          </div>
        ))
      )}

      {selectedTrade && (
        <TradeDetail
          trade={selectedTrade}
          onClose={() => setSelectedTrade(null)}
          isAdmin={isAdmin}
          onDelete={async (id) => { await remove(id); setSelectedTrade(null) }}
        />
      )}

      <div style={{ height: 16 }} />
    </div>
  )
}
