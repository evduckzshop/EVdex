import { useRef, useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSales, useShows } from '../hooks/useData'
import { useContacts } from '../hooks/useData'
import { useAuth } from '../context/AuthContext'
import { uploadPhoto } from '../lib/supabase'
import { useActiveShow } from '../context/ShowContext'
import { C, Label, Input, Select, ChipGroup, DealCalc, CtaButton, GhostButton, Toast, RecordCard, AutocompleteInput, PaymentPicker } from '../components/ui/FormComponents'
import LotCalculator, { entriesToLotData, lotDataToEntries, computeLotTotals } from '../components/ui/LotCalculator'
import QuickLog from '../components/ui/QuickLog'

export default function SalesPage() {
  const { insert, update, rows, fetch, loading } = useSales()
  const { rows: contacts, fetch: fetchContacts } = useContacts()
  const { rows: shows, fetch: fetchShows } = useShows()
  const { profile } = useAuth()
  const { activeShowId } = useActiveShow()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const lockRef = useRef(false)

  const editId = searchParams.get('edit')
  const editRecord = editId ? rows.find(r => r.id === editId) : null

  const [saleType, setSaleType] = useState('Singles')
  const [customSaleType, setCustomSaleType] = useState('')
  const [desc, setDesc] = useState('')
  const [market, setMarket] = useState('')
  const [price, setPrice] = useState('')
  const [pct, setPct] = useState('')
  const [cost, setCost] = useState('')
  const [buyer, setBuyer] = useState('')
  const [buyerContactId, setBuyerContactId] = useState(null)
  const [payment, setPayment] = useState('Cash')
  const [showId, setShowId] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoName, setPhotoName] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [quickLog, setQuickLog] = useState(false)
  const [lotEntries, setLotEntries] = useState([{ market: '', amount: '', pct: '', description: '', showDesc: true }])

  const isLot = saleType === 'Lot'

  useEffect(() => { fetch(); fetchContacts(); fetchShows() }, [])

  // Sync show from global active show (unless editing)
  useEffect(() => {
    if (!editId && activeShowId) setShowId(activeShowId)
  }, [activeShowId, editId])

  // Pre-fill form when editing
  useEffect(() => {
    if (editRecord) {
      const knownTypes = ['Singles', 'Lot', 'Slab', 'Sealed']
      const editType = editRecord.sale_type || 'Singles'
      if (knownTypes.includes(editType)) {
        setSaleType(editType)
        setCustomSaleType('')
      } else {
        setSaleType('Other')
        setCustomSaleType(editType)
      }
      setDesc(editRecord.description || '')
      setMarket(editRecord.market_value ? String(editRecord.market_value) : '')
      setPrice(editRecord.sale_price ? String(editRecord.sale_price) : '')
      setPct(editRecord.pct_of_market ? String(editRecord.pct_of_market) : '100')
      setCost(editRecord.cost_basis ? String(editRecord.cost_basis) : '')
      setBuyer(editRecord.buyer || '')
      setBuyerContactId(editRecord.buyer_contact_id || null)
      setPayment(editRecord.payment || 'Cash')
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

    // For lots, compute totals from entries
    let finalPrice = parseFloat(price)
    let finalMarket = parseFloat(market) || null
    let finalPct = parseFloat(pct) || null
    let lotData = null

    if (isLot) {
      const totals = computeLotTotals(lotEntries)
      finalPrice = totals.totalPrice
      finalMarket = totals.totalMarket || null
      finalPct = totals.avgPct
      lotData = entriesToLotData(lotEntries)
    }

    if (!finalPrice && !isLot) { setMsg({ text: 'Please enter a sale price.', type: 'error' }); return }
    if (isLot && finalPrice <= 0) { setMsg({ text: 'Please fill in at least one entry.', type: 'error' }); return }

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
        sale_type: saleType === 'Other' ? (customSaleType.trim() || 'Other') : saleType,
        market_value: finalMarket,
        sale_price: finalPrice,
        pct_of_market: finalPct,
        cost_basis: parseFloat(cost) || null,
        lot_entries: lotData,
        buyer: buyer || null,
        buyer_contact_id: buyerContactId || null,
        payment,
        show_id: showId || null,
        photo_url,
      }

      if (editId && editRecord) {
        await update(editId, record)
        setMsg({ text: 'Sale updated!', type: 'success' })
        resetForm()
        setTimeout(() => navigate('/', { replace: true }), 600)
      } else {
        await insert(record)
        setMsg({ text: 'Sale saved!', type: 'success' })
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
    setSaleType('Singles'); setCustomSaleType(''); setDesc(''); setMarket(''); setPrice(''); setPct(''); setLotEntries([{ market: '', amount: '', pct: '', description: '', showDesc: true }])
    setCost(''); setBuyer(''); setBuyerContactId(null); setPayment('Cash'); setShowId(''); setPhotoFile(null); setPhotoName('')
  }

  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{ background: 'linear-gradient(135deg,#0d2018,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 12, border: '1px solid rgba(16,185,129,.15)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          {editId ? 'Edit sale' : 'Sales ledger'}
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: -1, margin: '4px 0 2px' }}>
          {editId ? desc || 'Edit sale' : `$${rows.reduce((s, r) => s + Number(r.sale_price), 0).toLocaleString()}`}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
          {editId ? 'Update the details below' : `${rows.length} sales · avg ${rows.length ? Math.round(rows.reduce((s,r) => s + (r.pct_of_market||0), 0) / rows.length) : 0}% of market`}
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
      <Label top={false}>Sale type</Label>
      <ChipGroup options={['Singles','Slabs','Sealed','Lot','Other']} value={saleType} onChange={v => { setSaleType(v); if (v !== 'Other') setCustomSaleType('') }} color="green" />
      {saleType === 'Other' && (
        <Input value={customSaleType} onChange={e => setCustomSaleType(e.target.value)} placeholder="Enter sale type..." style={{ marginTop: 8 }} />
      )}

      <PaymentPicker options={['Cash','Venmo','Zelle']} value={payment} onChange={setPayment} />

      <Label>Card / item name</Label>
      <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder={isLot ? "e.g. Bulk lot from card show" : "e.g. Charizard ex SAR 151"} />

      {isLot ? (
        <LotCalculator entries={lotEntries} setEntries={setLotEntries} isSale />
      ) : (
        <DealCalc
          market={market} setMarket={setMarket}
          amount={price} setAmount={setPrice}
          pct={pct} setPct={setPct}
          isSale lockRef={lockRef}
        />
      )}

      {/* Cost basis hidden for now
      <Label>Cost basis ($)</Label>
      <Input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" />
      */}

      <Label>Sold to</Label>
      <AutocompleteInput contacts={contacts} value={buyer} contactId={buyerContactId} onSelect={(name, cid) => { setBuyer(name); setBuyerContactId(cid) }} placeholder="Buyer name or search contacts…" />

      <Label>Show (optional)</Label>
      <Select value={showId} onChange={e => setShowId(e.target.value)}>
        <option value="">No show — general sale</option>
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

      <Label>Logged by</Label>
      <div style={{ fontSize: 13, color: C.text2, padding: '8px 0' }}>{profile?.full_name}</div>

      <CtaButton onClick={handleSave} disabled={saving} color="green">
        {saving ? 'Saving…' : editId ? 'Update sale' : 'Save sale'}
      </CtaButton>
      <GhostButton onClick={() => editId ? navigate('/sales', { replace: true }) : navigate('/')}>Cancel</GhostButton>
      </>
      )}

      {!editId && (
        <>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', margin: '20px 0 8px', display: 'flex', justifyContent: 'space-between' }}>
            Recent sales
            <span onClick={() => navigate('/transactions')} style={{ fontSize: 11, color: '#3B82F6', fontWeight: 500, textTransform: 'none', letterSpacing: 0, cursor: 'pointer' }}>View all →</span>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', color: C.text3, padding: 20 }}>Loading…</div>
          ) : rows.slice(0, 10).map(r => (
            <div key={r.id} onClick={() => navigate(`/sales?edit=${r.id}`)} style={{ cursor: 'pointer' }}>
              <RecordCard
                item={r}
                amtColor={C.green} amt={`+$${Number(r.sale_price).toFixed(0)}`}
                meta={`${r.buyer || 'Unknown'} · ${r.pct_of_market ? r.pct_of_market + '% of mkt · ' : ''}${new Date(r.created_at).toLocaleDateString()}`}
              />
            </div>
          ))}
        </>
      )}
      <div style={{ height: 16 }} />
    </div>
  )
}
