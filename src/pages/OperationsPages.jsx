import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useExpenses, useShows, useInventory } from '../hooks/useData'
import { useAuth } from '../context/AuthContext'
import {
  C, Label, Input, Select, ChipGroup, PaymentPicker,
  CtaButton, GhostButton, Toast, RecordCard,
} from '../components/ui/FormComponents'

// ── US CITIES AUTOCOMPLETE ───────────────────────────────────────
const US_CITIES = [
  'New York, NY','Los Angeles, CA','Chicago, IL','Houston, TX','Phoenix, AZ',
  'Philadelphia, PA','San Antonio, TX','San Diego, CA','Dallas, TX','San Jose, CA',
  'Austin, TX','Jacksonville, FL','Fort Worth, TX','Columbus, OH','Charlotte, NC',
  'Indianapolis, IN','San Francisco, CA','Seattle, WA','Denver, CO','Washington, DC',
  'Nashville, TN','Oklahoma City, OK','El Paso, TX','Boston, MA','Portland, OR',
  'Las Vegas, NV','Memphis, TN','Louisville, KY','Baltimore, MD','Milwaukee, WI',
  'Albuquerque, NM','Tucson, AZ','Fresno, CA','Mesa, AZ','Sacramento, CA',
  'Atlanta, GA','Kansas City, MO','Omaha, NE','Colorado Springs, CO','Raleigh, NC',
  'Virginia Beach, VA','Long Beach, CA','Miami, FL','Oakland, CA','Minneapolis, MN',
  'Tampa, FL','Tulsa, OK','Arlington, TX','New Orleans, LA','Cleveland, OH',
  'Orlando, FL','St. Louis, MO','Pittsburgh, PA','Cincinnati, OH','Detroit, MI',
  'Richmond, VA','Norfolk, VA','Springfield, VA','Springfield, IL','Springfield, MO',
  'Chantilly, VA','Fairfax, VA','Manassas, VA','Fredericksburg, VA','Alexandria, VA',
  'Tysons, VA','Sterling, VA','Woodbridge, VA','Dulles, VA','Herndon, VA',
  'Annapolis, MD','Columbia, MD','Bowie, MD','Frederick, MD','Silver Spring, MD',
]

function LocationInput({ value, onChange }) {
  const [input, setInput] = useState(value || '')
  const [open, setOpen] = useState(false)

  const filtered = input.length > 0
    ? US_CITIES.filter(c => c.toLowerCase().includes(input.toLowerCase())).slice(0, 6)
    : []

  function pick(city) { setInput(city); onChange(city); setOpen(false) }
  function handleChange(val) { setInput(val); onChange(val); setOpen(true) }

  return (
    <div style={{ position: 'relative' }}>
      <Input value={input} onChange={e => handleChange(e.target.value)} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} placeholder="City, State" />
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', width: '100%', zIndex: 20, marginTop: 4, background: C.surface2, border: `1px solid ${C.border2}`, borderRadius: 11, overflow: 'hidden' }}>
          {filtered.map(city => (
            <div key={city} onMouseDown={() => pick(city)} style={{ padding: '10px 13px', fontSize: 13, color: C.text, cursor: 'pointer', borderBottom: `1px solid ${C.border}` }}>{city}</div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── EXPENSES PAGE ────────────────────────────────────────────────
export function ExpensesPage() {
  const { insert, remove, rows, fetch, loading } = useExpenses()
  const { profile, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [category, setCategory] = useState('Show fees')
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [payment, setPayment] = useState('Cash')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [selectedExpense, setSelectedExpense] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete(id) {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      await remove(id)
      setSelectedExpense(null)
      setConfirmDelete(false)
      setMsg({ text: 'Expense deleted.', type: 'success' })
      setTimeout(() => setMsg({ text: '', type: '' }), 3000)
    } catch (e) {
      setMsg({ text: 'Error deleting: ' + e.message, type: 'error' })
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => { fetch() }, [])

  async function handleSave() {
    if (!desc.trim() || !amount) { setMsg({ text: 'Please fill in description and amount.', type: 'error' }); return }
    setSaving(true)
    try {
      await insert({ description: desc.trim(), category, amount: parseFloat(amount), payment })
      setMsg({ text: 'Expense saved!', type: 'success' })
      setDesc(''); setAmount('')
      setTimeout(() => navigate('/'), 700)
    } catch (e) { setMsg({ text: 'Error: ' + e.message, type: 'error' })
    } finally { setSaving(false) }
  }

  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{ background: 'linear-gradient(135deg,#1a1208,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 12, border: '1px solid rgba(245,158,11,.15)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Expenses</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: -1, margin: '4px 0 2px' }}>${rows.reduce((s,r) => s+Number(r.amount),0).toLocaleString()}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>{rows.length} entries this period</div>
      </div>
      <Toast message={msg.text} type={msg.type} />
      <Label top={false}>Category</Label>
      <ChipGroup options={['Show fees','Supplies','Travel','Shipping','Other']} value={category} onChange={setCategory} />
      <Label>Description</Label>
      <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Table fee – Springfield show" />
      <Label>Amount ($)</Label>
      <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
      <PaymentPicker options={['Cash','Card','Transfer']} value={payment} onChange={setPayment} />
      <Label>Logged by</Label>
      <div style={{ fontSize: 13, color: C.text2, padding: '8px 0' }}>{profile?.full_name}</div>
      <CtaButton onClick={handleSave} disabled={saving} color="orange">{saving ? 'Saving…' : 'Save expense'}</CtaButton>
      <GhostButton onClick={() => navigate('/')}>Cancel</GhostButton>
      <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', margin: '20px 0 8px' }}>Recent expenses</div>
      {loading ? <div style={{ textAlign: 'center', color: C.text3, padding: 20 }}>Loading…</div>
        : rows.slice(0,10).map(r => (
          <div key={r.id}>
            <div onClick={() => { setSelectedExpense(selectedExpense === r.id ? null : r.id); setConfirmDelete(false) }} style={{ cursor: 'pointer' }}>
              <RecordCard item={r} amtColor={C.amber} amt={`-$${Number(r.amount).toFixed(0)}`}
                meta={`${r.category} · ${r.payment||''} · ${new Date(r.created_at).toLocaleDateString()}`} />
            </div>
            {isAdmin && selectedExpense === r.id && (
              <div style={{ background: C.surface2, borderRadius: 10, padding: '10px 12px', marginBottom: 8, marginTop: -4, border: `1px solid ${C.border2}` }}>
                <button onClick={() => handleDelete(r.id)} disabled={deleting} style={{
                  width: '100%', padding: 10, borderRadius: 9, fontSize: 12, fontWeight: 600,
                  cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  background: confirmDelete ? '#DC2626' : 'rgba(248,113,113,.08)',
                  border: confirmDelete ? 'none' : '1px solid rgba(248,113,113,.2)',
                  color: confirmDelete ? '#fff' : C.red,
                }}>
                  {deleting ? 'Deleting...' : confirmDelete ? 'Tap again to confirm' : 'Delete expense'}
                </button>
              </div>
            )}
          </div>
        ))}
      <div style={{ height: 16 }} />
    </div>
  )
}

// ── SHOWS PAGE ───────────────────────────────────────────────────
export function ShowsPage() {
  const { insert, rows, fetch, loading } = useShows()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [name, setName] = useState('')
  const [date, setDate] = useState(searchParams.get('date') || '')
  const [location, setLocation] = useState('')
  const [fee, setFee] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })

  useEffect(() => { fetch() }, [])

  async function handleSave() {
    if (!name.trim()) { setMsg({ text: 'Please enter a show name.', type: 'error' }); return }
    setSaving(true)
    try {
      await insert({ name: name.trim(), event_date: date||null, location: location||null, table_fee: parseFloat(fee)||0, notes: notes||null, status: 'upcoming' })
      setMsg({ text: 'Show added!', type: 'success' })
      setName(''); setDate(''); setLocation(''); setFee(''); setNotes('')
      setTimeout(() => navigate('/shows/manage'), 700)
    } catch (e) { setMsg({ text: 'Error: ' + e.message, type: 'error' })
    } finally { setSaving(false) }
  }

  const statusColor = s => s === 'completed' ? C.green : s === 'in_progress' ? C.amber : C.text3
  const statusBg = s => s === 'completed' ? 'rgba(16,185,129,.12)' : s === 'in_progress' ? 'rgba(245,158,11,.12)' : 'rgba(127,119,221,.12)'

  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{ background: 'linear-gradient(135deg,#1a1420,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 12, border: '1px solid rgba(127,119,221,.2)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Show tracker</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: -1, margin: '4px 0 2px' }}>{rows.length} shows</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>${rows.reduce((s,r) => s+Number(r.table_fee||0),0).toFixed(0)} total in table fees</div>
      </div>
      <Toast message={msg.text} type={msg.type} />
      <Label top={false}>Show name</Label>
      <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Springfield Card Show" />
      <Label>Date</Label>
      <Input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ color: C.text2 }} />
      <Label>Location</Label>
      <LocationInput value={location} onChange={setLocation} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div><Label>Table fee ($)</Label><Input type="number" value={fee} onChange={e => setFee(e.target.value)} placeholder="0.00" /></div>
        <div><Label>Notes</Label><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Crowd, vibe…" /></div>
      </div>
      <CtaButton onClick={handleSave} disabled={saving} color="orange">{saving ? 'Saving…' : 'Add show'}</CtaButton>
      <GhostButton onClick={() => navigate('/shows/manage')}>Cancel</GhostButton>
      <div onClick={() => navigate('/shows/manage')} style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', margin: '20px 0 8px', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
        Show history
        <span style={{ fontSize: 11, color: '#3B82F6', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>View all →</span>
      </div>
      {loading ? <div style={{ textAlign: 'center', color: C.text3, padding: 20 }}>Loading…</div>
        : rows.slice(0, 5).map(r => (
          <div key={r.id} onClick={() => navigate(`/shows/manage?id=${r.id}`)} style={{ background: C.surface, borderRadius: 14, padding: '13px 14px', marginBottom: 8, border: `1px solid ${C.border}`, cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{r.name}</div>
                <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>
                  {r.event_date ? new Date(r.event_date+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : 'TBD'} · {r.location||'—'}
                </div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: statusBg(r.status), color: statusColor(r.status) }}>
                {r.status.replace('_',' ')}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {[{l:'Fee',v:`$${Number(r.table_fee||0).toFixed(0)}`,c:C.amber},{l:'Status',v:r.status.replace('_',' '),c:C.text2},{l:'Added',v:new Date(r.created_at).toLocaleDateString(),c:C.text3}].map(s => (
                <div key={s.l} style={{ background: C.surface2, borderRadius: 8, padding: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 8, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{s.l}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: s.c }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      <div style={{ height: 16 }} />
    </div>
  )
}

// ── INVENTORY PAGE ───────────────────────────────────────────────
export function InventoryPage() {
  const { insert, rows, fetch, loading } = useInventory()
  const [itemType, setItemType] = useState('Single')
  const [name, setName] = useState('')
  const [qty, setQty] = useState('1')
  const [condition, setCondition] = useState('NM')
  const [cost, setCost] = useState('')
  const [listed, setListed] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [search, setSearch] = useState('')

  useEffect(() => { fetch() }, [])

  async function handleSave() {
    if (!name.trim()) { setMsg({ text: 'Please enter a name.', type: 'error' }); return }
    setSaving(true)
    try {
      await insert({ name: name.trim(), item_type: itemType, qty: parseInt(qty)||1, condition, cost_basis: parseFloat(cost)||null, listed_price: parseFloat(listed)||null, notes: notes||null })
      setMsg({ text: 'Item added!', type: 'success' })
      setName(''); setQty('1'); setCost(''); setListed(''); setNotes('')
    } catch (e) { setMsg({ text: 'Error: ' + e.message, type: 'error' })
    } finally { setSaving(false) }
  }

  const filtered = rows.filter(r => (r.name || '').toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{ background: 'linear-gradient(135deg,#0f1a2a,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 12, border: '1px solid rgba(55,138,221,.2)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Inventory</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: -1, margin: '4px 0 2px' }}>{rows.reduce((s,r) => s+(r.qty||0),0)} items</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>Est. value ${rows.reduce((s,r) => s+(Number(r.listed_price||0)*Number(r.qty||1)),0).toLocaleString()}</div>
      </div>
      <Toast message={msg.text} type={msg.type} />
      <Label top={false}>Item type</Label>
      <ChipGroup options={['Single','Slab','Sealed','Lot']} value={itemType} onChange={setItemType} />
      <Label>Card / item name</Label>
      <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Charizard ex SAR 151" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div><Label>Qty</Label><Input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="1" /></div>
        <div><Label>Condition</Label><Select value={condition} onChange={e => setCondition(e.target.value)}>{['NM','LP','MP','HP','Sealed','Mixed'].map(c=><option key={c}>{c}</option>)}</Select></div>
        <div><Label>Cost basis ($)</Label><Input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" /></div>
        <div><Label>Listed price ($)</Label><Input type="number" value={listed} onChange={e => setListed(e.target.value)} placeholder="0.00" /></div>
      </div>
      <Label>Notes</Label>
      <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" />
      <CtaButton onClick={handleSave} disabled={saving}>{saving ? 'Adding…' : '+ Add item'}</CtaButton>
      <div style={{ marginTop: 20 }}>
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search inventory…" />
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', margin: '12px 0 8px' }}>
        All items ({filtered.length})
      </div>
      {loading ? <div style={{ textAlign: 'center', color: C.text3, padding: 20 }}>Loading…</div>
        : filtered.map(r => (
          <div key={r.id} style={{ background: C.surface, borderRadius: 14, padding: '12px 14px', marginBottom: 8, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>{r.item_type} · {r.condition} · Cost ${r.cost_basis||0} · Listed ${r.listed_price||0}</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', marginLeft: 10, color: r.qty > 5 ? C.green : r.qty > 2 ? C.amber : C.red }}>{r.qty} in stock</span>
            </div>
          </div>
        ))}
      <div style={{ height: 16 }} />
    </div>
  )
}

export default ExpensesPage
