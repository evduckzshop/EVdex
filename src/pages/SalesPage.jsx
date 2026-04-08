import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSales } from '../hooks/useData'
import { useContacts } from '../hooks/useData'
import { useAuth } from '../context/AuthContext'
import { C, Label, Input, Select, ChipGroup, DealCalc, CtaButton, GhostButton, Toast, RecordCard, AutocompleteInput, PaymentPicker } from '../components/ui/FormComponents'

export default function SalesPage() {
  const { insert, rows, fetch, loading } = useSales()
  const { rows: contacts, fetch: fetchContacts } = useContacts()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const lockRef = useRef(false)

  const [saleType, setSaleType] = useState('Single card')
  const [desc, setDesc] = useState('')
  const [market, setMarket] = useState('')
  const [price, setPrice] = useState('')
  const [pct, setPct] = useState('')
  const [cost, setCost] = useState('')
  const [buyer, setBuyer] = useState('')
  const [payment, setPayment] = useState('Cash')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })

  useEffect(() => { fetch(); fetchContacts() }, [])

  async function handleSave() {
    if (!desc.trim()) { setMsg({ text: 'Please enter a description.', type: 'error' }); return }
    if (!price) { setMsg({ text: 'Please enter a sale price.', type: 'error' }); return }
    setSaving(true)
    try {
      await insert({
        description: desc.trim(),
        sale_type: saleType,
        market_value: parseFloat(market) || null,
        sale_price: parseFloat(price),
        pct_of_market: parseFloat(pct) || null,
        cost_basis: parseFloat(cost) || null,
        buyer: buyer || null,
        payment,
      })
      setMsg({ text: 'Sale saved!', type: 'success' })
      resetForm()
      setTimeout(() => navigate('/'), 600)
    } catch (e) {
      setMsg({ text: 'Error: ' + e.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setSaleType('Single card'); setDesc(''); setMarket(''); setPrice(''); setPct('')
    setCost(''); setBuyer(''); setPayment('Cash')
  }

  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{ background: 'linear-gradient(135deg,#0d2018,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 12, border: '1px solid rgba(16,185,129,.15)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Sales ledger</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: -1, margin: '4px 0 2px' }}>
          ${rows.reduce((s, r) => s + Number(r.sale_price), 0).toLocaleString()}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>{rows.length} sales · avg {rows.length ? Math.round(rows.reduce((s,r) => s + (r.pct_of_market||0), 0) / rows.length) : 0}% of market</div>
      </div>

      <Toast message={msg.text} type={msg.type} />

      <Label top={false}>Sale type</Label>
      <ChipGroup options={['Single card','Lot','Slab','Other']} value={saleType} onChange={setSaleType} color="green" />

      <Label>Card / item name</Label>
      <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Charizard ex SAR 151" />

      <DealCalc
        market={market} setMarket={setMarket}
        amount={price} setAmount={setPrice}
        pct={pct} setPct={setPct}
        isSale lockRef={lockRef}
      />

      <Label>Cost basis ($)</Label>
      <Input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" />

      <Label>Sold to</Label>
      <AutocompleteInput contacts={contacts} value={buyer} onSelect={setBuyer} placeholder="Buyer name or search contacts…" />

      <PaymentPicker options={['Cash','Venmo','Zelle','Card']} value={payment} onChange={setPayment} />

      <Label>Logged by</Label>
      <div style={{ fontSize: 13, color: C.text2, padding: '8px 0' }}>{profile?.full_name}</div>

      <CtaButton onClick={handleSave} disabled={saving} color="green">
        {saving ? 'Saving…' : 'Save sale'}
      </CtaButton>
      <GhostButton onClick={() => navigate('/')}>Cancel</GhostButton>

      <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', margin: '20px 0 8px' }}>
        Recent sales
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', color: C.text3, padding: 20 }}>Loading…</div>
      ) : rows.slice(0, 10).map(r => (
        <RecordCard
          key={r.id} item={r}
          amtColor={C.green} amt={`+$${Number(r.sale_price).toFixed(0)}`}
          meta={`${r.buyer || 'Unknown'} · ${r.pct_of_market ? r.pct_of_market + '% of mkt · ' : ''}${new Date(r.created_at).toLocaleDateString()}`}
        />
      ))}
      <div style={{ height: 16 }} />
    </div>
  )
}
