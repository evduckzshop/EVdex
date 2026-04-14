import { useRef, useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useBuys, useContacts, useShows } from '../hooks/useData'
import { useAuth } from '../context/AuthContext'
import { uploadPhoto } from '../lib/supabase'
import { useActiveShow } from '../context/ShowContext'
import { C, Label, Input, Select, ChipGroup, DealCalc, CtaButton, GhostButton, Toast, RecordCard, AutocompleteInput, PaymentPicker } from '../components/ui/FormComponents'
import LotCalculator, { entriesToLotData, lotDataToEntries, computeLotTotals } from '../components/ui/LotCalculator'
import QuickLog from '../components/ui/QuickLog'

export default function BuysPage() {
  const { insert, update, rows, fetch, loading } = useBuys()
  const { rows: contacts, fetch: fetchContacts } = useContacts()
  const { rows: shows, fetch: fetchShows } = useShows()
  const { profile } = useAuth()
  const { activeShowId } = useActiveShow()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const lockRef = useRef(false)

  const editId = searchParams.get('edit')
  const editRecord = editId ? rows.find(r => r.id === editId) : null

  const [buyType, setBuyType] = useState('Singles')
  const [desc, setDesc] = useState('')
  const [qty, setQty] = useState('')
  const [condition, setCondition] = useState('NM')
  const [market, setMarket] = useState('')
  const [paid, setPaid] = useState('')
  const defaultBuyPct = String(profile?.settings?.default_buy_pct ?? 100)
  const [pct, setPct] = useState(defaultBuyPct)
  const [source, setSource] = useState('')
  const [sourceContactId, setSourceContactId] = useState(null)
  const [payment, setPayment] = useState('Cash')
  const [notes, setNotes] = useState('')
  const [showId, setShowId] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoName, setPhotoName] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [quickLog, setQuickLog] = useState(false)
  const [lotEntries, setLotEntries] = useState([{ market: '', amount: '', pct: '', description: '', showDesc: true }])

  const isLot = buyType === 'Lot'
  const isSlab = buyType === 'Slabs'
  const isSealed = buyType === 'Sealed'

  useEffect(() => { fetch(); fetchContacts(); fetchShows() }, [])

  // Sync show from global active show (unless editing)
  useEffect(() => {
    if (!editId && activeShowId) setShowId(activeShowId)
  }, [activeShowId, editId])

  // Pre-fill form when editing
  useEffect(() => {
    if (editRecord) {
      setBuyType(editRecord.buy_type || 'Singles')
      setDesc(editRecord.description || '')
      setQty(editRecord.qty ? String(editRecord.qty) : '')
      setCondition(editRecord.condition || 'NM')
      setMarket(editRecord.market_value ? String(editRecord.market_value) : '')
      setPaid(editRecord.amount_paid ? String(editRecord.amount_paid) : '')
      setPct(editRecord.pct_of_market ? String(editRecord.pct_of_market) : '100')
      setSource(editRecord.source || '')
      setSourceContactId(editRecord.source_contact_id || null)
      setPayment(editRecord.payment || 'Cash')
      setNotes(editRecord.notes || '')
      setShowId(editRecord.show_id || '')
      setPhotoName(editRecord.photo_url ? 'Existing photo' : '')
      if (editRecord.lot_entries?.length) {
        setLotEntries(lotDataToEntries(editRecord.lot_entries))
      }
    }
  }, [editRecord?.id])

  function pickPhoto() {
    const inp = document.createElement('input')
    inp.type = 'file'; inp.accept = 'image/*'
    inp.onchange = e => { const f = e.target.files[0]; if (f) { setPhotoFile(f); setPhotoName(f.name) } }
    inp.click()
  }

  async function handleSave() {
    if (!desc.trim()) { setMsg({ text: 'Please enter a description.', type: 'error' }); return }

    let finalPaid = parseFloat(paid)
    let finalMarket = parseFloat(market) || null
    let finalPct = parseFloat(pct) || null
    let lotData = null

    if (isLot) {
      const totals = computeLotTotals(lotEntries)
      finalPaid = totals.totalPrice
      finalMarket = totals.totalMarket || null
      finalPct = totals.avgPct
      lotData = entriesToLotData(lotEntries)
    }

    if (!finalPaid && !isLot) { setMsg({ text: 'Please enter the amount paid.', type: 'error' }); return }
    if (isLot && finalPaid <= 0) { setMsg({ text: 'Please fill in at least one entry.', type: 'error' }); return }

    setSaving(true)
    try {
      let photo_url = editRecord?.photo_url || null
      if (photoFile) {
        photo_url = await uploadPhoto(profile.id, photoFile)
      } else if (!photoName) {
        photo_url = null
      }

      const record = {
        description: desc.trim(),
        buy_type: buyType,
        qty: isLot ? null : isSlab ? null : (parseInt(qty) || null),
        condition: isLot ? null : isSealed ? null : isSlab ? (qty ? `${qty} ${condition}` : condition) : condition,
        market_value: finalMarket,
        amount_paid: finalPaid,
        pct_of_market: finalPct,
        lot_entries: lotData,
        source: source || null,
        source_contact_id: sourceContactId || null,
        payment,
        notes: notes || null,
        show_id: showId || null,
        photo_url,
      }

      if (editId && editRecord) {
        await update(editId, record)
        setMsg({ text: 'Buy updated!', type: 'success' })
        resetForm()
        setTimeout(() => navigate('/', { replace: true }), 600)
      } else {
        await insert(record)
        setMsg({ text: 'Buy saved!', type: 'success' })
        resetForm()
        setTimeout(() => navigate('/'), 600)
      }
    } catch (e) {
      setMsg({ text: 'Error: ' + e.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setBuyType('Singles'); setDesc(''); setQty(''); setCondition('NM')
    setMarket(''); setPaid(''); setPct(defaultBuyPct); setSource(''); setSourceContactId(null); setPayment('Cash')
    setNotes(''); setShowId(''); setPhotoFile(null); setPhotoName(''); setLotEntries([{ market: '', amount: '', pct: '', description: '', showDesc: true }])
  }

  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{ background: 'linear-gradient(135deg,#2a1810,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 12, border: '1px solid rgba(216,90,48,.2)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          {editId ? 'Edit purchase' : 'Buying ledger'}
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: -1, margin: '4px 0 2px' }}>
          {editId ? desc || 'Edit purchase' : `$${rows.reduce((s, r) => s + Number(r.amount_paid), 0).toLocaleString()}`}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
          {editId ? 'Update the details below' : `${rows.length} purchases · avg ${rows.length ? Math.round(rows.reduce((s,r) => s + (r.pct_of_market||0), 0) / rows.length) : 0}% of market`}
        </div>
      </div>

      <Toast message={msg.text} type={msg.type} />

      {!editId && (
        <div onClick={() => setQuickLog(!quickLog)} style={{ fontSize: 12, color: C.accent2, cursor: 'pointer', marginBottom: 10, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M13 2l-3 7h5l-5 9 1-6H6l4-10z" stroke="#3B82F6" strokeWidth="1.3" strokeLinejoin="round"/></svg>
          {quickLog ? 'Full form' : 'Quick log'}
        </div>
      )}

      {quickLog && !editId ? (
        <QuickLog activeShowId={activeShowId || ''} onDone={() => { setQuickLog(false); navigate('/') }} onSave={() => fetch()} />
      ) : (
      <>
      <Label top={false}>Purchase type</Label>
      <ChipGroup options={['Singles','Slabs','Sealed','Lot']} value={buyType} onChange={setBuyType} />

      <PaymentPicker options={['Cash','Venmo','Zelle']} value={payment} onChange={setPayment} />



      <Label>Description</Label>
      <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Singles Lot from evduckzshop" />

      {isSlab && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <Label>Company</Label>
            <Select value={qty} onChange={e => setQty(e.target.value)}>
              <option value="">Select...</option>
              {['PSA','CGC','BGS','Other'].map(c => <option key={c}>{c}</option>)}
            </Select>
          </div>
          <div>
            <Label>Grade</Label>
            <Select value={condition} onChange={e => setCondition(e.target.value)}>
              <option value="">Select...</option>
              {['10','9.5','9','8.5','8','7.5','7','6.5','6','5.5','5','4.5','4','3.5','3','2.5','2','1.5','1'].map(g => <option key={g}>{g}</option>)}
            </Select>
          </div>
        </div>
      )}

      {!isLot && !isSlab && !isSealed && (
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

      {isSealed && (
        <div>
          <Label>Qty</Label>
          <Input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="1" />
        </div>
      )}

      {isLot ? (
        <LotCalculator entries={lotEntries} setEntries={setLotEntries} isSale={false} />
      ) : (
        <DealCalc
          market={market} setMarket={setMarket}
          amount={paid} setAmount={setPaid}
          pct={pct} setPct={setPct}
          isSale={false} lockRef={lockRef}
        />
      )}

      <Label>Sourced from</Label>
      <AutocompleteInput contacts={contacts} value={source} contactId={sourceContactId} onSelect={(name, cid) => { setSource(name); setSourceContactId(cid) }} placeholder="Seller name or search contacts…" />

      <Label>Show (optional)</Label>
      <Select value={showId} onChange={e => setShowId(e.target.value)}>
        <option value="">No show — general purchase</option>
        {shows.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </Select>

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
          <div onClick={() => { setPhotoFile(null); setPhotoName('') }} style={{ fontSize: 11, color: C.red, cursor: 'pointer', flexShrink: 0 }}>Remove</div>
        </div>
      ) : (
        <div onClick={pickPhoto} style={{ background: C.surface2, borderRadius: 12, border: '1.5px dashed rgba(255,255,255,.1)', padding: 14, textAlign: 'center', cursor: 'pointer', marginTop: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(37,99,235,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><rect x="2" y="5" width="16" height="12" rx="2" stroke="#60A5FA" strokeWidth="1.3"/><circle cx="10" cy="11" r="3" stroke="#60A5FA" strokeWidth="1.3"/><path d="M7 5l1-2h4l1 2" stroke="#60A5FA" strokeWidth="1.3" strokeLinecap="round"/></svg>
          </div>
          <div style={{ fontSize: 12, color: C.text3, fontWeight: 500 }}>Tap to attach photo</div>
        </div>
      )}

      <Label>Notes (optional)</Label>
      <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. 80 cards, mostly holos, one PSA 9" />

      <Label>Logged by</Label>
      <div style={{ fontSize: 13, color: C.text2, padding: '8px 0' }}>{profile?.full_name}</div>

      <CtaButton onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : editId ? 'Update purchase' : 'Save purchase'}
      </CtaButton>
      <GhostButton onClick={() => editId ? navigate('/buys', { replace: true }) : navigate('/')}>Cancel</GhostButton>
      </>
      )}

      {!editId && (
        <>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', margin: '20px 0 8px', display: 'flex', justifyContent: 'space-between' }}>
            Recent buys
            <span onClick={() => navigate('/transactions')} style={{ fontSize: 11, color: '#3B82F6', fontWeight: 500, textTransform: 'none', letterSpacing: 0, cursor: 'pointer' }}>View all →</span>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', color: C.text3, padding: 20 }}>Loading…</div>
          ) : rows.slice(0, 10).map(r => (
            <div key={r.id} onClick={() => navigate(`/buys?edit=${r.id}`)} style={{ cursor: 'pointer' }}>
              <RecordCard
                item={r}
                amtColor={C.red} amt={`-$${Number(r.amount_paid).toFixed(0)}`}
                meta={`${r.source || 'Unknown'} · ${r.pct_of_market ? r.pct_of_market + '% of mkt · ' : ''}${new Date(r.created_at).toLocaleDateString()}`}
              />
            </div>
          ))}
        </>
      )}
      <div style={{ height: 16 }} />
    </div>
  )
}
