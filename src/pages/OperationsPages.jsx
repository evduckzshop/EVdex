import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useExpenses, useShows, useInventory, useContacts, useSales, useBuys } from '../hooks/useData'
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

  function pick(city) {
    setInput(city)
    onChange(city)
    setOpen(false)
  }

  function handleChange(val) {
    setInput(val)
    onChange(val)
    setOpen(true)
  }

  return (
    <div style={{ position: 'relative' }}>
      <Input
        value={input}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="City, State"
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', width: '100%', zIndex: 20, marginTop: 4,
          background: C.surface2, border: `1px solid ${C.border2}`, borderRadius: 11, overflow: 'hidden',
        }}>
          {filtered.map(city => (
            <div
              key={city}
              onMouseDown={() => pick(city)}
              style={{ padding: '10px 13px', fontSize: 13, color: C.text, cursor: 'pointer', borderBottom: `1px solid ${C.border}` }}
            >
              {city}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── EXPENSES PAGE ���──────────────────────────────────────────────��
export function ExpensesPage() {
  const { insert, rows, fetch, loading } = useExpenses()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [category, setCategory] = useState('Show fees')
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [payment, setPayment] = useState('Cash')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })

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
          <RecordCard key={r.id} item={r} amtColor={C.amber} amt={`-$${Number(r.amount).toFixed(0)}`}
            meta={`${r.category} · ${r.payment||''} · ${new Date(r.created_at).toLocaleDateString()}`} />
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

// ── CONTACTS PAGE (All contacts with filters) ──────────────────
const AVATAR_COLORS = ['#1E40AF','#065F46','#78350F','#1E3A8A','#7C2D12','#1E3A5F']
const pillColor = r => r === 'Buyer' ? '#60A5FA' : r === 'Seller' ? C.red : r === 'Wholesaler' ? C.green : C.amber
const pillBg = r => r === 'Buyer' ? 'rgba(37,99,235,.12)' : r === 'Seller' ? 'rgba(248,113,113,.12)' : r === 'Wholesaler' ? 'rgba(16,185,129,.12)' : 'rgba(245,158,11,.12)'
const SORT_OPTIONS = [
  { key: 'alpha', label: 'A–Z' },
  { key: 'recent', label: 'Recent' },
  { key: 'transactions', label: 'Transactions' },
]
const LAYOUT_KEY = 'evdex_contacts_layout'

export function ContactsPage() {
  const { insert, update, remove, rows, fetch, loading } = useContacts()
  const { rows: sales, fetch: fetchSales } = useSales()
  const { rows: buys, fetch: fetchBuys } = useBuys()
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [selectedContact, setSelectedContact] = useState(null)
  const [msg, setMsg] = useState({ text: '', type: '' })

  // Filters
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterPay, setFilterPay] = useState('')
  const [sort, setSort] = useState('alpha')
  const [layout, setLayout] = useState(() => localStorage.getItem(LAYOUT_KEY) || 'card')
  const [showFilters, setShowFilters] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

  // Add form
  const [name, setName] = useState('')
  const [role, setRole] = useState('Seller')
  const [phone, setPhone] = useState('')
  const [pay, setPay] = useState('Cash')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetch(); fetchSales(); fetchBuys() }, [])

  function switchLayout(l) { setLayout(l); localStorage.setItem(LAYOUT_KEY, l) }

  // Transaction counts per contact
  function getTxCount(contactName) {
    const n = (contactName || '').toLowerCase()
    return sales.filter(s => (s.buyer || '').toLowerCase() === n).length
      + buys.filter(b => (b.source || '').toLowerCase() === n).length
  }

  // Filter & sort
  let filtered = rows.filter(r => {
    if (search && !(r.name || '').toLowerCase().includes(search.toLowerCase())) return false
    if (filterRole && r.role !== filterRole) return false
    if (filterPay && r.preferred_pay !== filterPay) return false
    return true
  })

  if (sort === 'alpha') filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  else if (sort === 'recent') filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  else if (sort === 'transactions') filtered.sort((a, b) => getTxCount(b.name) - getTxCount(a.name))

  async function handleAdd() {
    if (!name.trim()) { setMsg({ text: 'Please enter a name.', type: 'error' }); return }
    setSaving(true)
    try {
      await insert({ name: name.trim(), role, phone: phone||null, preferred_pay: pay, notes: notes||null })
      setMsg({ text: 'Contact saved!', type: 'success' })
      setName(''); setPhone(''); setNotes(''); setShowAdd(false)
      setTimeout(() => setMsg({ text: '', type: '' }), 3000)
    } catch (e) { setMsg({ text: 'Error: ' + e.message, type: 'error' })
    } finally { setSaving(false) }
  }

  return (
    <div style={{ paddingTop: 12 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0f1a2a,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 12, border: '1px solid rgba(37,99,235,.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Contact book</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: -1, margin: '4px 0 2px' }}>{rows.length} contacts</div>
          </div>
          {/* Layout toggle */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,.06)', borderRadius: 10, padding: 3 }}>
            <button onClick={() => switchLayout('card')} style={{ width: 34, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: layout === 'card' ? 'rgba(37,99,235,.25)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" stroke={layout === 'card' ? '#3B82F6' : '#475569'} strokeWidth="1.3"/><rect x="9" y="1" width="6" height="6" rx="1.5" stroke={layout === 'card' ? '#3B82F6' : '#475569'} strokeWidth="1.3"/><rect x="1" y="9" width="6" height="6" rx="1.5" stroke={layout === 'card' ? '#3B82F6' : '#475569'} strokeWidth="1.3"/><rect x="9" y="9" width="6" height="6" rx="1.5" stroke={layout === 'card' ? '#3B82F6' : '#475569'} strokeWidth="1.3"/></svg>
            </button>
            <button onClick={() => switchLayout('compact')} style={{ width: 34, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: layout === 'compact' ? 'rgba(37,99,235,.25)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h12" stroke={layout === 'compact' ? '#3B82F6' : '#475569'} strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>
      </div>

      <Toast message={msg.text} type={msg.type} />

      {/* Search */}
      <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..." />

      {/* Sort chips */}
      <div style={{ display: 'flex', gap: 6, margin: '10px 0', alignItems: 'center' }}>
        {SORT_OPTIONS.map(s => (
          <button key={s.key} onClick={() => setSort(s.key)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer', border: `1px solid ${sort === s.key ? 'rgba(37,99,235,.4)' : C.border2}`, background: sort === s.key ? 'rgba(37,99,235,.2)' : C.surface, color: sort === s.key ? '#3B82F6' : C.text2, fontFamily: 'inherit' }}>
            {s.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div onClick={() => setShowFilters(!showFilters)} style={{ fontSize: 11, color: '#3B82F6', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}>
          <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M5 10h10M7 15h6" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Filters
        </div>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div style={{ background: C.surface, borderRadius: 12, padding: 12, marginBottom: 10, border: `1px solid ${C.border}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ fontSize: 10, color: C.text3, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>Role</div>
              <Select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ padding: '8px 10px', fontSize: 12 }}>
                <option value="">All roles</option>
                {['Seller','Buyer','Both','Wholesaler'].map(r => <option key={r}>{r}</option>)}
              </Select>
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.text3, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>Payment</div>
              <Select value={filterPay} onChange={e => setFilterPay(e.target.value)} style={{ padding: '8px 10px', fontSize: 12 }}>
                <option value="">All methods</option>
                {['Cash','Venmo','Zelle','Card'].map(p => <option key={p}>{p}</option>)}
              </Select>
            </div>
          </div>
          {(filterRole || filterPay) && (
            <div onClick={() => { setFilterRole(''); setFilterPay('') }} style={{ fontSize: 11, color: C.red, cursor: 'pointer', marginTop: 8, textAlign: 'center' }}>Clear filters</div>
          )}
        </div>
      )}

      {/* Add contact button / form */}
      {showAdd ? (
        <div style={{ background: C.surface, borderRadius: 14, padding: 14, border: `1px solid ${C.border}`, marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>New contact</div>
          <Label top={false}>Name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Name or business" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div><Label>Phone / handle</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="@venmo or number" /></div>
            <div><Label>Role</Label><Select value={role} onChange={e => setRole(e.target.value)}>{['Seller','Buyer','Both','Wholesaler'].map(r=><option key={r}>{r}</option>)}</Select></div>
          </div>
          <Label>Preferred payment</Label>
          <ChipGroup options={['Cash','Venmo','Zelle','Card']} value={pay} onChange={setPay} color="green" />
          <Label>Notes</Label>
          <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Buys holos in bulk, pays fast" />
          <CtaButton onClick={handleAdd} disabled={saving}>{saving ? 'Saving…' : 'Save contact'}</CtaButton>
          <GhostButton onClick={() => setShowAdd(false)}>Cancel</GhostButton>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)} style={{ width: '100%', padding: 11, borderRadius: 12, background: 'rgba(37,99,235,.08)', border: '1px solid rgba(37,99,235,.15)', fontSize: 13, fontWeight: 600, color: '#3B82F6', cursor: 'pointer', marginBottom: 12, fontFamily: 'inherit' }}>
          + Add contact
        </button>
      )}

      {/* Results count */}
      <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>
        {filtered.length} contact{filtered.length !== 1 ? 's' : ''}
      </div>

      {/* Contact list */}
      {loading ? <div style={{ textAlign: 'center', color: C.text3, padding: 20 }}>Loading…</div>
        : filtered.length === 0 ? <div style={{ textAlign: 'center', color: C.text3, padding: 20, fontSize: 13 }}>No contacts found.</div>
        : layout === 'card' ? (
          filtered.map((r, i) => {
            const txCount = getTxCount(r.name)
            return (
              <div key={r.id} onClick={() => setSelectedContact(r)} style={{ background: C.surface, borderRadius: 14, padding: '12px 13px', marginBottom: 8, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: AVATAR_COLORS[i % AVATAR_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {r.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{r.name}</div>
                  <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>
                    {r.preferred_pay || ''}{r.phone ? ` · ${r.phone}` : ''}{txCount > 0 ? ` · ${txCount} txn` : ''}
                  </div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: pillBg(r.role), color: pillColor(r.role) }}>{r.role}</span>
              </div>
            )
          })
        ) : (
          // Compact list
          <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            {filtered.map((r, i) => {
              const txCount = getTxCount(r.name)
              return (
                <div key={r.id} onClick={() => setSelectedContact(r)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 13px', cursor: 'pointer', borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: pillColor(r.role), flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                  {txCount > 0 && <span style={{ fontSize: 10, color: C.text3 }}>{txCount} txn</span>}
                  <span style={{ fontSize: 10, color: C.text3 }}>{r.role}</span>
                </div>
              )
            })}
          </div>
        )}

      {/* Contact detail bottom sheet */}
      {selectedContact && (
        <ContactDetail
          contact={selectedContact}
          sales={sales}
          buys={buys}
          isAdmin={isAdmin}
          navigate={navigate}
          onUpdate={async (id, record) => { await update(id, record); await fetch(); setSelectedContact(null) }}
          onDelete={async (id) => { await remove(id); await fetch() }}
          onClose={() => setSelectedContact(null)}
        />
      )}

      <div style={{ height: 16 }} />
    </div>
  )
}

function ContactDetail({ contact, sales, buys, isAdmin, navigate, onUpdate, onDelete, onClose }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(contact.name || '')
  const [role, setRole] = useState(contact.role || 'Seller')
  const [phone, setPhone] = useState(contact.phone || '')
  const [pay, setPay] = useState(contact.preferred_pay || 'Cash')
  const [notes, setNotes] = useState(contact.notes || '')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  // Transaction history — case-insensitive exact name match
  const cn = (contact.name || '').toLowerCase()
  const contactSales = sales.filter(s => (s.buyer || '').toLowerCase() === cn)
  const contactBuys = buys.filter(b => (b.source || '').toLowerCase() === cn)
  const history = [
    ...contactSales.map(s => ({ ...s, _type: 'sale', _amount: Number(s.sale_price), _date: s.created_at })),
    ...contactBuys.map(b => ({ ...b, _type: 'buy', _amount: Number(b.amount_paid), _date: b.created_at })),
  ].sort((a, b) => new Date(b._date) - new Date(a._date))

  const totalSold = contactSales.reduce((s, r) => s + Number(r.sale_price), 0)
  const totalBought = contactBuys.reduce((s, r) => s + Number(r.amount_paid), 0)

  async function handleSave() {
    if (!name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    try {
      await onUpdate(contact.id, { name: name.trim(), role, phone: phone||null, preferred_pay: pay, notes: notes||null })
      setEditing(false)
      setError('')
    } catch (e) { setError('Error: ' + e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      await onDelete(contact.id)
      onClose()
    } catch (e) {
      setError('Error deleting: ' + e.message)
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const avatarColor = AVATAR_COLORS[(contact.name || '').charCodeAt(0) % AVATAR_COLORS.length] || '#1E40AF'

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 300 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 390, zIndex: 301,
        background: '#0F172A', borderRadius: '20px 20px 0 0',
        padding: '16px 18px max(20px, env(safe-area-inset-bottom))',
        maxHeight: '85vh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.15)', margin: '0 auto 14px' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {contact.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{contact.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: pillBg(contact.role), color: pillColor(contact.role) }}>{contact.role}</span>
              {contact.preferred_pay && <span style={{ fontSize: 10, color: C.text3 }}>{contact.preferred_pay}</span>}
            </div>
          </div>
          <div onClick={onClose} style={{ fontSize: 12, color: C.text3, cursor: 'pointer', padding: '4px 10px', background: 'rgba(255,255,255,.05)', borderRadius: 8 }}>Close</div>
        </div>

        {/* Contact info */}
        {(contact.phone || contact.notes) && (
          <div style={{ background: C.surface, borderRadius: 12, padding: '10px 14px', marginBottom: 12, border: `1px solid ${C.border}` }}>
            {contact.phone && <div style={{ fontSize: 12, color: C.text2, padding: '4px 0' }}>{contact.phone}</div>}
            {contact.notes && <div style={{ fontSize: 12, color: C.text3, padding: '4px 0' }}>{contact.notes}</div>}
          </div>
        )}

        {/* Stats */}
        {(totalSold > 0 || totalBought > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
            <div style={{ background: C.surface, borderRadius: 8, padding: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Sold to</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>${totalSold.toLocaleString()}</div>
              <div style={{ fontSize: 8, color: C.text3 }}>{contactSales.length} txn</div>
            </div>
            <div style={{ background: C.surface, borderRadius: 8, padding: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Bought from</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.red }}>${totalBought.toLocaleString()}</div>
              <div style={{ fontSize: 8, color: C.text3 }}>{contactBuys.length} txn</div>
            </div>
            <div style={{ background: C.surface, borderRadius: 8, padding: 8, textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Net</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: (totalSold - totalBought) >= 0 ? C.green : C.red }}>${(totalSold - totalBought).toLocaleString()}</div>
              <div style={{ fontSize: 8, color: C.text3 }}>{history.length} total</div>
            </div>
          </div>
        )}

        {/* Transaction history */}
        <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>Transaction history</div>
        {history.length === 0 ? (
          <div style={{ background: C.surface, borderRadius: 12, padding: 16, textAlign: 'center', border: `1px solid ${C.border}`, marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: C.text3 }}>No transactions yet</div>
          </div>
        ) : (
          <div style={{ marginBottom: 12 }}>
            {history.slice(0, 10).map(r => (
              <div key={r.id + r._type} onClick={() => { onClose(); navigate(r._type === 'sale' ? `/sales?edit=${r.id}` : `/buys?edit=${r.id}`) }} style={{ cursor: 'pointer' }}>
                <RecordCard
                  item={r}
                  amtColor={r._type === 'sale' ? C.green : C.red}
                  amt={`${r._type === 'sale' ? '+' : '-'}$${r._amount.toFixed(0)}`}
                  meta={`${r._type === 'sale' ? 'Sale' : 'Buy'} · ${r.pct_of_market ? r.pct_of_market + '% of mkt · ' : ''}${new Date(r._date).toLocaleDateString()}`}
                />
              </div>
            ))}
            {history.length > 10 && <div style={{ fontSize: 11, color: C.text3, textAlign: 'center', padding: 4 }}>{history.length - 10} more transactions</div>}
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: C.red }}>{error}</div>
        )}

        {/* Edit form */}
        {editing ? (
          <div style={{ background: C.surface, borderRadius: 14, padding: 14, border: `1px solid ${C.border}`, marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>Edit contact</div>
            <Label top={false}>Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Name" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" /></div>
              <div><Label>Role</Label><Select value={role} onChange={e => setRole(e.target.value)}>{['Seller','Buyer','Both','Wholesaler'].map(r=><option key={r}>{r}</option>)}</Select></div>
            </div>
            <Label>Payment</Label>
            <ChipGroup options={['Cash','Venmo','Zelle','Card']} value={pay} onChange={setPay} color="green" />
            <Label>Notes</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes" />
            <CtaButton onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</CtaButton>
            <GhostButton onClick={() => setEditing(false)}>Cancel</GhostButton>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} style={{
            width: '100%', padding: 13, borderRadius: 12,
            background: 'rgba(37,99,235,.1)', border: '1px solid rgba(37,99,235,.2)',
            fontSize: 14, fontWeight: 600, color: '#3B82F6', cursor: 'pointer', marginBottom: 8,
          }}>
            Edit contact
          </button>
        )}

        {/* Delete */}
        {isAdmin && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              width: '100%', padding: 13, borderRadius: 12,
              background: confirmDelete ? '#DC2626' : 'rgba(248,113,113,.08)',
              border: confirmDelete ? 'none' : '1px solid rgba(248,113,113,.15)',
              fontSize: 14, fontWeight: 600,
              color: confirmDelete ? '#fff' : C.red,
              cursor: deleting ? 'not-allowed' : 'pointer',
            }}
          >
            {deleting ? 'Deleting…' : confirmDelete ? 'Tap again to confirm delete' : 'Delete contact'}
          </button>
        )}
      </div>
    </>
  )
}

export default ExpensesPage
