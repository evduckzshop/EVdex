import { useState } from 'react'
import { useSales, useBuys, useShows } from '../../hooks/useData'
import { useAuth } from '../../context/AuthContext'
import { C, Label, Input, ChipGroup, CtaButton, Toast } from './FormComponents'

export default function QuickLog({ activeShowId, onDone, onSave }) {
  const { insert: insertSale } = useSales()
  const { insert: insertBuy } = useBuys()
  const { rows: shows } = useShows()
  const { profile } = useAuth()

  const [type, setType] = useState('sale')
  const [desc, setDesc] = useState('')
  const [price, setPrice] = useState('')
  const [payment, setPayment] = useState('Cash')
  const [buyer, setBuyer] = useState('')
  const [rapidFire, setRapidFire] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [count, setCount] = useState(0)

  const activeShow = shows.find(s => s.id === activeShowId)

  async function handleSave() {
    if (!desc.trim()) { setMsg({ text: 'Enter a description.', type: 'error' }); return }
    if (!price) { setMsg({ text: 'Enter a price.', type: 'error' }); return }
    setSaving(true)
    try {
      const record = {
        description: desc.trim(),
        payment,
        show_id: activeShowId || null,
      }

      if (type === 'sale') {
        await insertSale({
          ...record,
          sale_type: 'Singles',
          sale_price: parseFloat(price),
          buyer: buyer || null,
        })
      } else {
        await insertBuy({
          ...record,
          buy_type: 'Singles',
          amount_paid: parseFloat(price),
          source: buyer || null,
        })
      }

      setCount(c => c + 1)
      setMsg({ text: `${type === 'sale' ? 'Sale' : 'Buy'} saved! (${count + 1} logged)`, type: 'success' })
      if (onSave) onSave()

      if (rapidFire) {
        setDesc('')
        setPrice('')
        setBuyer('')
        setTimeout(() => setMsg({ text: '', type: '' }), 2000)
      } else {
        onDone()
      }
    } catch (e) {
      setMsg({ text: 'Error: ' + e.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background: C.surface2, borderRadius: 14, padding: 14, border: '1px solid rgba(37,99,235,.15)', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.07em', textTransform: 'uppercase' }}>
          Quick log {count > 0 && <span style={{ color: C.green }}>· {count} saved</span>}
        </div>
        {activeShow && (
          <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'rgba(245,158,11,.12)', color: '#F59E0B' }}>
            {activeShow.name}
          </span>
        )}
      </div>

      <Toast message={msg.text} type={msg.type} />

      {/* Sale/Buy toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {['sale', 'buy'].map(t => (
          <button key={t} onClick={() => setType(t)} style={{
            flex: 1, padding: '8px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            border: `1px solid ${type === t ? (t === 'sale' ? 'rgba(16,185,129,.4)' : 'rgba(248,113,113,.4)') : C.border2}`,
            background: type === t ? (t === 'sale' ? 'rgba(16,185,129,.12)' : 'rgba(248,113,113,.1)') : C.surface,
            color: type === t ? (t === 'sale' ? C.green : C.red) : C.text3,
          }}>
            {t === 'sale' ? 'Sale' : 'Buy'}
          </button>
        ))}
      </div>

      <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Card / item name" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
        <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Price ($)" />
        <Input value={buyer} onChange={e => setBuyer(e.target.value)} placeholder={type === 'sale' ? 'Buyer (opt.)' : 'Source (opt.)'} />
      </div>

      <div style={{ marginTop: 8 }}>
        <ChipGroup options={['Cash','Venmo','Zelle','Card']} value={payment} onChange={setPayment} color="green" />
      </div>

      {/* Rapid fire toggle */}
      <div onClick={() => setRapidFire(!rapidFire)} style={{
        display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, cursor: 'pointer', padding: '6px 0',
      }}>
        <div style={{
          width: 36, height: 20, borderRadius: 10, padding: 2,
          background: rapidFire ? 'rgba(37,99,235,.3)' : 'rgba(255,255,255,.08)',
          transition: 'background .2s', display: 'flex', alignItems: 'center',
        }}>
          <div style={{
            width: 16, height: 16, borderRadius: '50%',
            background: rapidFire ? '#3B82F6' : '#475569',
            transform: rapidFire ? 'translateX(16px)' : 'translateX(0)',
            transition: 'transform .2s, background .2s',
          }} />
        </div>
        <div style={{ fontSize: 12, color: rapidFire ? C.text : C.text3, fontWeight: 500 }}>
          Rapid-fire mode {rapidFire && <span style={{ color: C.accent2 }}>ON</span>}
        </div>
      </div>

      <CtaButton onClick={handleSave} disabled={saving} color={type === 'sale' ? 'green' : 'red'}>
        {saving ? 'Saving…' : `Log ${type}`}
      </CtaButton>
    </div>
  )
}
