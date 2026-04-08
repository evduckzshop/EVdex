import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useContacts, useSales, useBuys } from '../hooks/useData'
import { useAuth } from '../context/AuthContext'
import { supabase, inviteCustomer } from '../lib/supabase'
import { C, Label, Input, Select, ChipGroup, CtaButton, GhostButton, Toast, RecordCard } from '../components/ui/FormComponents'

const AVATAR_COLORS = ['#1E40AF','#065F46','#78350F','#1E3A8A','#7C2D12','#1E3A5F']
const pillColor = r => r === 'Buyer' ? '#60A5FA' : r === 'Seller' ? C.red : r === 'Wholesaler' ? C.green : C.amber
const pillBg = r => r === 'Buyer' ? 'rgba(37,99,235,.12)' : r === 'Seller' ? 'rgba(248,113,113,.12)' : r === 'Wholesaler' ? 'rgba(16,185,129,.12)' : 'rgba(245,158,11,.12)'
const SORT_OPTIONS = [
  { key: 'alpha', label: 'A–Z' },
  { key: 'recent', label: 'Recent' },
  { key: 'transactions', label: 'Transactions' },
]
const LAYOUT_KEY = 'evdex_contacts_layout'

function getTxData(contactId, contactName, sales, buys) {
  const cSales = sales.filter(s => s.buyer_contact_id === contactId)
  const cBuys = buys.filter(b => b.source_contact_id === contactId)
  return { cSales, cBuys, count: cSales.length + cBuys.length }
}

// ── CONTACTS LIST PAGE (/contacts) ──────────────────────────────
export default function ContactsListPage() {
  const { rows, fetch, loading } = useContacts()
  const { rows: sales, fetch: fetchSales } = useSales()
  const { rows: buys, fetch: fetchBuys } = useBuys()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterPay, setFilterPay] = useState('')
  const [sort, setSort] = useState('alpha')
  const [layout, setLayout] = useState(() => localStorage.getItem(LAYOUT_KEY) || 'card')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => { fetch(); fetchSales(); fetchBuys() }, [])

  function switchLayout(l) { setLayout(l); localStorage.setItem(LAYOUT_KEY, l) }

  let filtered = rows.filter(r => {
    if (search && !(r.name || '').toLowerCase().includes(search.toLowerCase()) && !(r.nickname || '').toLowerCase().includes(search.toLowerCase())) return false
    if (filterRole && r.role !== filterRole) return false
    if (filterPay && r.preferred_pay !== filterPay) return false
    return true
  })

  if (sort === 'alpha') filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  else if (sort === 'recent') filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  else if (sort === 'transactions') filtered.sort((a, b) => getTxData(b.id, b.name, sales, buys).count - getTxData(a.id, a.name, sales, buys).count)

  return (
    <div style={{ paddingTop: 12 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0f1a2a,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 12, border: '1px solid rgba(37,99,235,.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Contact book</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: -1, margin: '4px 0 2px' }}>{rows.length} contacts</div>
          </div>
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

      <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..." />

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

      <button onClick={() => navigate('/contacts/add')} style={{ width: '100%', padding: 11, borderRadius: 12, background: 'rgba(37,99,235,.08)', border: '1px solid rgba(37,99,235,.15)', fontSize: 13, fontWeight: 600, color: '#3B82F6', cursor: 'pointer', marginBottom: 12, fontFamily: 'inherit' }}>
        + Add contact
      </button>

      <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>
        {filtered.length} contact{filtered.length !== 1 ? 's' : ''}
      </div>

      {loading ? <div style={{ textAlign: 'center', color: C.text3, padding: 20 }}>Loading…</div>
        : filtered.length === 0 ? <div style={{ textAlign: 'center', color: C.text3, padding: 20, fontSize: 13 }}>No contacts found.</div>
        : layout === 'card' ? (
          filtered.map((r, i) => {
            const txCount = getTxData(r.id, r.name, sales, buys).count
            return (
              <div key={r.id} onClick={() => navigate(`/contacts/${r.id}`)} style={{ background: C.surface, borderRadius: 14, padding: '12px 13px', marginBottom: 8, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: AVATAR_COLORS[i % AVATAR_COLORS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {r.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{r.name}{r.nickname ? <span style={{ fontWeight: 400, color: C.text3 }}> ({r.nickname})</span> : ''}</div>
                  <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>
                    {r.preferred_pay || ''}{r.phone ? ` · ${r.phone}` : ''}{r.instagram ? ` · @${r.instagram.replace(/^@/, '')}` : ''}{txCount > 0 ? ` · ${txCount} txn` : ''}
                  </div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: pillBg(r.role), color: pillColor(r.role) }}>{r.role}</span>
              </div>
            )
          })
        ) : (
          <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            {filtered.map((r, i) => {
              const txCount = getTxData(r.id, r.name, sales, buys).count
              return (
                <div key={r.id} onClick={() => navigate(`/contacts/${r.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 13px', cursor: 'pointer', borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: pillColor(r.role), flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}{r.nickname ? <span style={{ color: C.text3, fontWeight: 400 }}> ({r.nickname})</span> : ''}</div>
                  {txCount > 0 && <span style={{ fontSize: 10, color: C.text3 }}>{txCount} txn</span>}
                  <span style={{ fontSize: 10, color: C.text3 }}>{r.role}</span>
                </div>
              )
            })}
          </div>
        )}
      <div style={{ height: 16 }} />
    </div>
  )
}

// ── CONTACT DETAIL PAGE (/contacts/:id) ─────────────────────────
export function ContactDetailPage() {
  const { id } = useParams()
  const { rows, fetch, remove } = useContacts()
  const { rows: sales, fetch: fetchSales } = useSales()
  const { rows: buys, fetch: fetchBuys } = useBuys()
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  // Customer portal invite state
  const [customerLink, setCustomerLink] = useState(null) // null = loading, false = not linked, object = linked
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState({ text: '', type: '' })

  useEffect(() => { fetch(); fetchSales(); fetchBuys() }, [])

  // Check if this contact is linked to a customer account
  useEffect(() => {
    if (!id) return
    supabase.from('customers')
      .select('id, display_name, email, created_at')
      .eq('contact_id', id)
      .maybeSingle()
      .then(({ data }) => setCustomerLink(data || false))
      .catch(() => setCustomerLink(false))
  }, [id])

  const contact = rows.find(r => r.id === id)

  if (!contact && !rows.length) return <div style={{ textAlign: 'center', color: C.text3, padding: 40 }}>Loading…</div>
  if (!contact) return <div style={{ textAlign: 'center', color: C.text3, padding: 40 }}>Contact not found.</div>

  const contactSales = sales.filter(s => s.buyer_contact_id === id)
  const contactBuys = buys.filter(b => b.source_contact_id === id)
  const history = [
    ...contactSales.map(s => ({ ...s, _type: 'sale', _amount: Number(s.sale_price), _date: s.created_at })),
    ...contactBuys.map(b => ({ ...b, _type: 'buy', _amount: Number(b.amount_paid), _date: b.created_at })),
  ].sort((a, b) => new Date(b._date) - new Date(a._date))
  const totalSold = contactSales.reduce((s, r) => s + Number(r.sale_price), 0)
  const totalBought = contactBuys.reduce((s, r) => s + Number(r.amount_paid), 0)
  const avatarColor = AVATAR_COLORS[((contact.name || 'A').charCodeAt(0)) % AVATAR_COLORS.length]

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      await remove(id)
      navigate('/contacts', { replace: true })
    } catch (e) {
      setError('Error deleting: ' + e.message)
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  function openInviteModal() {
    setInviteEmail(contact.email || '')
    setInviteName(contact.name || '')
    setInviteMsg({ text: '', type: '' })
    setShowInvite(true)
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) { setInviteMsg({ text: 'Email is required.', type: 'error' }); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) { setInviteMsg({ text: 'Enter a valid email address.', type: 'error' }); return }
    setInviting(true)
    setInviteMsg({ text: '', type: '' })
    try {
      await inviteCustomer({ email: inviteEmail.trim(), fullName: inviteName.trim() || contact.name, contactId: id })
      setInviteMsg({ text: 'Invite sent! Customer will receive an email to set up their account.', type: 'success' })
      // Refresh customer link status
      const { data } = await supabase.from('customers').select('id, display_name, email, created_at').eq('contact_id', id).maybeSingle()
      setCustomerLink(data || false)
      setTimeout(() => setShowInvite(false), 2000)
    } catch (e) {
      console.error('Invite error:', e)
      setInviteMsg({ text: e.message || 'Failed to send invite. Check console for details.', type: 'error' })
    } finally {
      setInviting(false)
    }
  }

  return (
    <div style={{ paddingTop: 12 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0f1a2a,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 12, border: '1px solid rgba(37,99,235,.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {contact.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: -0.5 }}>{contact.name}{contact.nickname ? <span style={{ fontSize: 14, fontWeight: 400, color: 'rgba(255,255,255,.45)' }}> ({contact.nickname})</span> : ''}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: pillBg(contact.role), color: pillColor(contact.role) }}>{contact.role}</span>
              {contact.preferred_pay && <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)' }}>{contact.preferred_pay}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Contact info */}
      {(contact.phone || contact.instagram || contact.notes) && (
        <div style={{ background: C.surface, borderRadius: 14, padding: '12px 14px', marginBottom: 12, border: `1px solid ${C.border}` }}>
          {contact.phone && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: (contact.instagram || contact.notes) ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ fontSize: 13, color: C.text3 }}>Phone number</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{contact.phone}</div>
            </div>
          )}
          {contact.instagram && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: contact.notes ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ fontSize: 13, color: C.text3 }}>Instagram</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#E1306C' }}>@{contact.instagram.replace(/^@/, '')}</div>
            </div>
          )}
          {contact.notes && (
            <div style={{ padding: '6px 0' }}>
              <div style={{ fontSize: 13, color: C.text3 }}>Notes</div>
              <div style={{ fontSize: 13, color: C.text, marginTop: 2 }}>{contact.notes}</div>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
        <div style={{ background: C.surface, borderRadius: 8, padding: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 8, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Sold to</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>${totalSold.toLocaleString()}</div>
          <div style={{ fontSize: 9, color: C.text3 }}>{contactSales.length} txn</div>
        </div>
        <div style={{ background: C.surface, borderRadius: 8, padding: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 8, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Bought from</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.red }}>${totalBought.toLocaleString()}</div>
          <div style={{ fontSize: 9, color: C.text3 }}>{contactBuys.length} txn</div>
        </div>
        <div style={{ background: C.surface, borderRadius: 8, padding: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 8, color: C.text3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Net</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: (totalSold - totalBought) >= 0 ? C.green : C.red }}>${(totalSold - totalBought).toLocaleString()}</div>
          <div style={{ fontSize: 9, color: C.text3 }}>{history.length} total</div>
        </div>
      </div>

      {/* Customer Portal Status */}
      {isAdmin && customerLink !== null && (
        <div style={{ background: C.surface, borderRadius: 14, padding: '12px 14px', marginBottom: 12, border: `1px solid ${customerLink ? 'rgba(16,185,129,.2)' : C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: customerLink ? C.green : C.text3 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
                  {customerLink ? 'Customer Portal Active' : 'No Portal Account'}
                </div>
                {customerLink && (
                  <div style={{ fontSize: 10, color: C.text3, marginTop: 1 }}>
                    {customerLink.email} · Joined {new Date(customerLink.created_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
            {!customerLink && (
              <button onClick={openInviteModal} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: 'rgba(37,99,235,.12)', border: '1px solid rgba(37,99,235,.25)',
                color: '#3B82F6', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}>
                Invite to Portal
              </button>
            )}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <>
          <div onClick={() => setShowInvite(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 300 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: 390, zIndex: 301,
            background: '#0F172A', borderRadius: '20px 20px 0 0',
            padding: '16px 18px max(20px, env(safe-area-inset-bottom))',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.15)', margin: '0 auto 14px' }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Invite to Customer Portal</div>
            <div style={{ fontSize: 12, color: C.text3, marginBottom: 14 }}>
              Send <span style={{ color: C.text, fontWeight: 600 }}>{contact.name}</span> an invite to create their rewards account. They'll receive an email to set up their password.
            </div>

            {inviteMsg.text && <Toast message={inviteMsg.text} type={inviteMsg.type} />}

            <div style={{ fontSize: 9, color: C.text3, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 5 }}>Display name</div>
            <Input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Customer display name" />

            <div style={{ fontSize: 9, color: C.text3, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 5, marginTop: 12 }}>Email address</div>
            <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="customer@email.com" />

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={() => setShowInvite(false)} style={{
                flex: 1, padding: 13, borderRadius: 12, background: 'transparent',
                border: `1px solid ${C.border2}`, fontSize: 13, fontWeight: 500,
                color: C.text2, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Cancel
              </button>
              <button onClick={handleInvite} disabled={inviting} style={{
                flex: 2, padding: 13, borderRadius: 12, border: 'none',
                background: inviting ? '#374151' : '#2563EB', fontSize: 13, fontWeight: 600,
                color: '#fff', cursor: inviting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}>
                {inviting ? 'Sending invite...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Transaction history */}
      <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>Transaction history</div>
      {history.length === 0 ? (
        <div style={{ background: C.surface, borderRadius: 12, padding: 20, textAlign: 'center', border: `1px solid ${C.border}`, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: C.text3 }}>No transactions yet</div>
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          {history.map(r => (
            <div key={r.id + r._type} onClick={() => navigate(r._type === 'sale' ? `/sales?edit=${r.id}` : `/buys?edit=${r.id}`)} style={{ cursor: 'pointer' }}>
              <RecordCard
                item={r}
                amtColor={r._type === 'sale' ? C.green : C.red}
                amt={`${r._type === 'sale' ? '+' : '-'}$${r._amount.toFixed(0)}`}
                meta={`${r._type === 'sale' ? 'Sale' : 'Buy'} · ${r.description || ''} · ${new Date(r._date).toLocaleDateString()}`}
              />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: C.red }}>{error}</div>
      )}

      {/* Actions */}
      <button onClick={() => navigate(`/contacts/${id}/edit`)} style={{
        width: '100%', padding: 13, borderRadius: 12,
        background: 'rgba(37,99,235,.1)', border: '1px solid rgba(37,99,235,.2)',
        fontSize: 14, fontWeight: 600, color: '#3B82F6', cursor: 'pointer', marginBottom: 8,
      }}>
        Edit contact
      </button>

      {isAdmin && (
        <button onClick={handleDelete} disabled={deleting} style={{
          width: '100%', padding: 13, borderRadius: 12,
          background: confirmDelete ? '#DC2626' : 'rgba(248,113,113,.08)',
          border: confirmDelete ? 'none' : '1px solid rgba(248,113,113,.15)',
          fontSize: 14, fontWeight: 600,
          color: confirmDelete ? '#fff' : C.red,
          cursor: deleting ? 'not-allowed' : 'pointer',
        }}>
          {deleting ? 'Deleting…' : confirmDelete ? 'Tap again to confirm delete' : 'Delete contact'}
        </button>
      )}
      <div style={{ height: 20 }} />
    </div>
  )
}

// ── CONTACT EDIT PAGE (/contacts/:id/edit) ──────────────────────
export function ContactEditPage() {
  const { id } = useParams()
  const { rows, fetch, update } = useContacts()
  const navigate = useNavigate()
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetch() }, [])

  const contact = rows.find(r => r.id === id)

  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [role, setRole] = useState('Seller')
  const [phone, setPhone] = useState('')
  const [instagram, setInstagram] = useState('')
  const [pay, setPay] = useState('Cash')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (contact) {
      setName(contact.name || '')
      setNickname(contact.nickname || '')
      setRole(contact.role || 'Seller')
      setPhone(contact.phone || '')
      setInstagram(contact.instagram || '')
      setPay(contact.preferred_pay || 'Cash')
      setNotes(contact.notes || '')
    }
  }, [contact?.id])

  if (!contact && !rows.length) return <div style={{ textAlign: 'center', color: C.text3, padding: 40 }}>Loading…</div>
  if (!contact) return <div style={{ textAlign: 'center', color: C.text3, padding: 40 }}>Contact not found.</div>

  async function handleSave() {
    if (!name.trim()) { setMsg({ text: 'Name is required.', type: 'error' }); return }
    setSaving(true)
    try {
      await update(id, { name: name.trim(), nickname: nickname.trim() || null, role, phone: phone || null, instagram: instagram || null, preferred_pay: pay, notes: notes || null })
      setMsg({ text: 'Contact updated!', type: 'success' })
      setTimeout(() => navigate(`/contacts/${id}`, { replace: true }), 600)
    } catch (e) { setMsg({ text: 'Error: ' + e.message, type: 'error' }) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{ background: 'linear-gradient(135deg,#0f1a2a,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 12, border: '1px solid rgba(37,99,235,.2)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Edit contact</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: -0.5, margin: '4px 0 2px' }}>{contact.name}</div>
      </div>

      <Toast message={msg.text} type={msg.type} />

      <Label top={false}>Name</Label>
      <Input value={name} onChange={e => setName(e.target.value)} placeholder="Name or business" />
      <Label>Nickname / alias (optional)</Label>
      <Input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="e.g. CardKing, TCGDeals" />
      <Label>Role</Label>
      <Select value={role} onChange={e => setRole(e.target.value)}>{['Seller','Buyer','Both','Wholesaler'].map(r => <option key={r}>{r}</option>)}</Select>
      <Label>Phone number</Label>
      <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" />
      <Label>Instagram</Label>
      <Input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@username" />
      <Label>Preferred payment</Label>
      <ChipGroup options={['Cash','Venmo','Zelle','Card']} value={pay} onChange={setPay} color="green" />
      <Label>Notes</Label>
      <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Buys holos in bulk, pays fast" />

      <CtaButton onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</CtaButton>
      <GhostButton onClick={() => navigate(-1)}>Cancel</GhostButton>
      <div style={{ height: 20 }} />
    </div>
  )
}

// ── CONTACT ADD PAGE (/contacts/add) ────────────────────────────
export function ContactAddPage() {
  const { insert, rows, fetch } = useContacts()
  const navigate = useNavigate()
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [role, setRole] = useState('Seller')
  const [phone, setPhone] = useState('')
  const [instagram, setInstagram] = useState('')
  const [pay, setPay] = useState('Cash')
  const [notes, setNotes] = useState('')

  useEffect(() => { fetch() }, [])

  // Duplicate detection
  const duplicates = name.trim().length > 1 ? rows.filter(r => (r.name || '').toLowerCase() === name.trim().toLowerCase()) : []

  async function handleSave() {
    if (!name.trim()) { setMsg({ text: 'Please enter a name.', type: 'error' }); return }
    if (duplicates.length > 0 && !nickname.trim()) { setMsg({ text: 'A contact with this name exists. Add a nickname to distinguish them, or use a different name.', type: 'error' }); return }
    setSaving(true)
    try {
      await insert({ name: name.trim(), nickname: nickname.trim() || null, role, phone: phone || null, instagram: instagram || null, preferred_pay: pay, notes: notes || null })
      setMsg({ text: 'Contact saved!', type: 'success' })
      setTimeout(() => navigate('/contacts', { replace: true }), 600)
    } catch (e) { setMsg({ text: 'Error: ' + e.message, type: 'error' }) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{ background: 'linear-gradient(135deg,#0f1a2a,#1E293B)', borderRadius: 18, padding: 18, marginBottom: 12, border: '1px solid rgba(37,99,235,.2)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', textTransform: 'uppercase' }}>New contact</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: -0.5, margin: '4px 0 2px' }}>Add contact</div>
      </div>

      <Toast message={msg.text} type={msg.type} />

      <Label top={false}>Name</Label>
      <Input value={name} onChange={e => setName(e.target.value)} placeholder="Name or business" />
      {duplicates.length > 0 && (
        <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 10, padding: '10px 14px', marginTop: 8, fontSize: 12, color: '#F59E0B' }}>
          A contact named "{name.trim()}" already exists{duplicates[0].nickname ? ` (${duplicates[0].nickname})` : ''}. Add a nickname below to distinguish them.
          <div onClick={() => navigate(`/contacts/${duplicates[0].id}`)} style={{ color: '#3B82F6', cursor: 'pointer', marginTop: 4, fontWeight: 600 }}>View existing contact →</div>
        </div>
      )}
      <Label>Nickname / alias (optional)</Label>
      <Input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="e.g. CardKing, TCGDeals" />
      <Label>Role</Label>
      <Select value={role} onChange={e => setRole(e.target.value)}>{['Seller','Buyer','Both','Wholesaler'].map(r => <option key={r}>{r}</option>)}</Select>
      <Label>Phone number</Label>
      <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" />
      <Label>Instagram</Label>
      <Input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@username" />
      <Label>Preferred payment</Label>
      <ChipGroup options={['Cash','Venmo','Zelle','Card']} value={pay} onChange={setPay} color="green" />
      <Label>Notes</Label>
      <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Buys holos in bulk, pays fast" />

      <CtaButton onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save contact'}</CtaButton>
      <GhostButton onClick={() => navigate(-1)}>Cancel</GhostButton>
      <div style={{ height: 20 }} />
    </div>
  )
}
