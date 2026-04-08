import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBuys, useContacts } from '../hooks/useData'
import { useAuth } from '../context/AuthContext'
import { C, Label, Input, Select, ChipGroup, DealCalc, CtaButton, GhostButton, Toast, RecordCard, AutocompleteInput, PaymentPicker } from '../components/ui/FormComponents'

export default function BuysPage() {
  const { insert, rows, fetch, loading } = useBuys()
  const { rows: contacts, fetch: fetchContacts } = useContacts()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const lockRef = useRef(false)

  const [buyType, setBuyType] = useState('Singles')
  const [desc, setDesc] = useState('')
  const [qty, setQty] = useState('')
  const [condition, setCondition] = useState('NM')
  const [market, setMarket] = useState('')
  const [paid, setPaid] = useState('')
  const [pct, setPct] = useState('')
  const [source, setSource] = useState('')
  const [payment, setPayment] = useState('Cash')
  const [notes, setNotes] = useState('')
  const [photoName, setPhotoName] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })

  const isLot = buyType === 'Lot'

  useEffect(() => { fetch(); fetchContacts() }, [])

  function pickPhoto() {
    const inp = document.createElement('input')
    inp.type = 'file'; inp.accept = 'image/*'
    inp.onchange = e => { const f = e.target.files[0]; if (f) setPhotoName(f.name) }
    inp.click()
  }

  async function handleSave() {
    if (!desc.trim()) { setMsg({ text: 'Please enter a description.', type: 'error' }); return }
    if (!paid) { setMsg({ text: 'Please enter the amount paid.', type: 'error' }); return }
    setSaving(true)
    try {
      await insert({
        description: desc.trim(),
        buy_type: buyType,
        qty: isLot ? null : (parseInt(qty) || null),
        condition: isLot ? null : condition,
        market_value: parseFloat(market) || null,
        amount_paid: parseFloat(paid),
        pct_of_market: parseFloat(pct) || null,
        source: source || null,
        payment,
        notes: notes || null,
      })
      setMsg({ text: 'Buy saved!', type: 'success' })
      resetForm()
      setTimeout(() => navigate('/'), 600)
    } catch (e) {
      setMsg({ text: 'Error: ' + e.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setBuyType('Singles'); setDesc(''); setQty(''); setCondition('NM')
    setMarket(''); setPaid(''); setPct(''); setSource(''); setPayment('Cash')
    setNotes(''); setPhotoName('')
  }

  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{ background: 'linear-gradient(135deg,#2a1810,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 12, border: '1px solid rgba(216,90,48,.2)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Buying ledger</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: -1, margin: '4px 0 2px' }}>
          ${rows.reduce((s, r) => s + Number(r.amount_paid), 0).toLocaleString()}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
          {rows.length} purchases · avg {rows.length ? Math.round(rows.reduce((s,r) => s + (r.pct_of_market||0), 0) / rows.length) : 0}% of market
        </div>
      </div>

      <Toast message={msg.text} type={msg.type} />

      <Label top={false}>Purchase type</Label>
      <ChipGroup options={['Singles','Slabs','Sealed','Lot']} value={buyType} onChange={setBuyType} />

      {isLot && (
        <div style={{ fontSize: 10, color: C.text3, background: 'rgba(255,255,255,.03)', borderRadius: 8, padding: '7px 10px', marginTop: 8, textAlign: 'center' }}>
          Lot purchases — qty and condition not applicable
        </div>
      )}

      <Label>Description</Label>
      <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Singles Lot from evduckzshop" />

      {!isLot && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <Label>Qty</Label>
            <Input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="1" />
          </div>
          <div>
            <Label>Condition</Label>
            <Select value={condition} onChange={e => setCondition(e.target.value)}>
              {['NM','LP','MP','HP','Mixed'].map(c => <option key={c}>{c}</option>)}
            </Select>
          </div>
        </div>
      )}

      <DealCalc
        market={market} setMarket={setMarket}
        amount={paid} setAmount={setPaid}
        pct={pct} setPct={setPct}
        isSale={false} lockRef={lockRef}
      />

      <Label>Sourced from</Label>
      <AutocompleteInput contacts={contacts} value={source} onSelect={setSource} placeholder="Seller name or search contacts…" />

      <Label>Photo (optional)</Label>
      {photoName ? (
        <div style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, padding: '10px 12px', marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(37,99,235,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="2" y="5" width="16" height="12" rx="2" stroke="#60A5FA" strokeWidth="1.3"/><circle cx="10" cy="11" r="3" stroke="#60A5FA" strokeWidth="1.3"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{photoName}</div>
            <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>Attached</div>
          </div>
          <div onClick={() => setPhotoName('')} style={{ fontSize: 11, color: C.red, cursor: 'pointer', flexShrink: 0 }}>Remove</div>
        </div>
      ) : (
        <div onClick={pickPhoto} style={{ background: C.surface2, borderRadius: 12, border: '1.5px dashed rgba(255,255,255,.1)', padding: 14, textAlign: 'center', cursor: 'pointer', marginTop: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(37,99,235,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><rect x="2" y="5" width="16" height="12" rx="2" stroke="#60A5FA" strokeWidth="1.3"/><circle cx="10" cy="11" r="3" stroke="#60A5FA" strokeWidth="1.3"/><path d="M7 5l1-2h4l1 2" stroke="#60A5FA" strokeWidth="1.3" strokeLinecap="round"/></svg>
          </div>
          <div style={{ fontSize: 12, color: C.text3, fontWeight: 500 }}>Tap to attach photo</div>
        </div>
      )}

      <PaymentPicker options={['Cash','Venmo','Zelle','Wire']} value={payment} onChange={setPayment} />

      <Label>Notes (optional)</Label>
      <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. 80 cards, mostly holos, one PSA 9" />

      <Label>Logged by</Label>
      <div style={{ fontSize: 13, color: C.text2, padding: '8px 0' }}>{profile?.full_name}</div>

      <CtaButton onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save purchase'}
      </CtaButton>
      <GhostButton onClick={() => navigate('/')}>Cancel</GhostButton>

      <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', margin: '20px 0 8px' }}>
        Recent buys
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', color: C.text3, padding: 20 }}>Loading…</div>
      ) : rows.slice(0, 10).map(r => (
        <RecordCard
          key={r.id} item={r}
          amtColor={C.red} amt={`-$${Number(r.amount_paid).toFixed(0)}`}
          meta={`${r.source || 'Unknown'} · ${r.pct_of_market ? r.pct_of_market + '% of mkt · ' : ''}${new Date(r.created_at).toLocaleDateString()}`}
        />
      ))}
      <div style={{ height: 16 }} />
    </div>
  )
}
