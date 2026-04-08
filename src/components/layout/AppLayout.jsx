import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNav } from '../../context/NavigationContext'
import { signOut } from '../../lib/supabase'
import PageTransition from './PageTransition'

const C = {
  bg: '#111318', surface: '#1E293B', surface2: '#162032', surface3: '#0F172A',
  border: 'rgba(255,255,255,.07)', border2: 'rgba(255,255,255,.13)',
  text: '#F1F5F9', text2: '#94A3B8', text3: '#475569',
  accent: '#2563EB', accent2: '#3B82F6',
  green: '#10B981', red: '#F87171', amber: '#F59E0B',
}

// All nav items — admin-only ones are flagged
const NAV_ITEMS = [
  { group: 'Main', items: [
    { id: 'home',    label: 'Home',    path: '/',         adminOnly: false },
    { id: 'profile', label: 'Profile', path: '/profile',  adminOnly: false },
  ]},
  { group: 'Operations', items: [
    { id: 'sales',     label: 'Sales',     path: '/sales',     adminOnly: false },
    { id: 'buys',      label: 'Buys',      path: '/buys',      adminOnly: false },
    { id: 'inventory', label: 'Inventory', path: '/inventory', adminOnly: false },
    { id: 'shows',     label: 'Shows',     path: '/shows/manage', adminOnly: false },
    { id: 'expenses',  label: 'Expenses',  path: '/expenses',  adminOnly: false },
  ]},
  { group: 'Financials', items: [
    { id: 'transactions', label: 'Transactions', path: '/transactions', adminOnly: false },
    { id: 'cashflow', label: 'Cash Flow',     path: '/cashflow', adminOnly: true },
    { id: 'pl',       label: 'Profit & Loss', path: '/pl',       adminOnly: true },
  ]},
  { group: 'Reporting', items: [
    { id: 'reporting', label: 'General Reporting', path: '/reporting', adminOnly: true },
    { id: 'compare',   label: 'Show Comparison',  path: '/shows/compare', adminOnly: true },
    { id: 'export',    label: 'Export',        path: '/export',    adminOnly: true },
  ]},
  { group: 'Team', items: [
    { id: 'employees', label: 'Team',   path: '/employees', adminOnly: true },
    { id: 'activity',  label: 'Activity Log', path: '/activity',  adminOnly: true },
  ]},
  { group: 'Other', items: [
    { id: 'contacts', label: 'Contacts', path: '/contacts', adminOnly: false },
    { id: 'settings', label: 'Settings', path: '/settings', adminOnly: true },
    { id: 'pong',     label: 'Pong',     path: '/pong',     adminOnly: false },
  ]},
]

const BOTTOM_TABS = [
  { id: 'home',     label: 'Home',     path: '/',         icon: HomeIcon },
  { id: 'sales',    label: 'Sales',    path: '/sales',    icon: SalesIcon },
  { id: 'buys',     label: 'Buys',     path: '/buys',     icon: BuysIcon },
  { id: 'shows',    label: 'Shows',    path: '/shows/manage', icon: ShowsIcon },
  { id: 'expenses', label: 'Expenses', path: '/expenses', icon: ExpIcon },
]

export default function AppLayout({ children }) {
  const { profile, isAdmin } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { navTo, navBack } = useNav()

  // Close sidebar on route change
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/login')
    } catch (e) {
      console.error('Sign out failed:', e)
    }
  }

  const pageTitle = getPageTitle(location.pathname)

  return (
    <div style={{
      width: '100%', maxWidth: 390, height: '100dvh', margin: '0 auto',
      background: C.bg, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', position: 'relative',
    }}>

      {/* Sidebar overlay */}
      <div
        onClick={() => setSidebarOpen(false)}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,.55)', zIndex: 200,
          opacity: sidebarOpen ? 1 : 0,
          pointerEvents: sidebarOpen ? 'auto' : 'none',
          transition: 'opacity .3s ease',
        }}
      />

      {/* Sidebar */}
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 300,
        background: '#0B1120', borderLeft: `1px solid ${C.border2}`,
        borderRadius: '16px 0 0 16px', zIndex: 201, overflowY: 'auto',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .3s cubic-bezier(.32,.72,0,1)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Close btn */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 16px 6px' }}>
          <button onClick={() => setSidebarOpen(false)} style={{
            width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,.08)',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="rgba(255,255,255,.6)" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Profile */}
        <div style={{ padding: '4px 18px 14px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: profile?.avatar_url ? `url(${profile.avatar_url}) center/cover no-repeat` : 'linear-gradient(135deg, #2563EB, #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 10,
            border: '2px solid rgba(37,99,235,.4)',
          }}>
            {!profile?.avatar_url && (profile?.full_name?.[0]?.toUpperCase() || 'U')}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{profile?.full_name}</div>
          <div style={{ fontSize: 11, color: C.text3, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600,
              background: isAdmin ? 'rgba(37,99,235,.15)' : 'rgba(16,185,129,.12)',
              color: isAdmin ? '#60A5FA' : '#10B981',
            }}>
              {isAdmin ? 'Admin' : 'Employee'}
            </span>
            <span>EVduckzShop</span>
          </div>
        </div>

        {/* Nav groups */}
        {NAV_ITEMS.map(group => {
          const visibleItems = group.items.filter(item => !item.adminOnly || isAdmin)
          if (!visibleItems.length) return null
          return (
            <div key={group.group} style={{ padding: '8px 10px 2px' }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: C.text3, letterSpacing: '.1em', textTransform: 'uppercase', padding: '0 6px', marginBottom: 3 }}>
                {group.group}
              </div>
              {visibleItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => navTo(item.path)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    width: '100%', padding: '8px 6px', borderRadius: 9,
                    border: 'none', cursor: 'pointer', marginBottom: 1,
                    background: location.pathname === item.path ? 'rgba(37,99,235,.12)' : 'transparent',
                    textAlign: 'left',
                  }}
                >
                  <div style={{
                    fontSize: 13, fontWeight: location.pathname === item.path ? 600 : 500,
                    color: location.pathname === item.path ? C.accent2 : C.text2,
                  }}>
                    {item.label}
                  </div>
                </button>
              ))}
            </div>
          )
        })}

        {/* Sign out */}
        <div style={{ marginTop: 'auto', padding: '12px 10px 24px', borderTop: `1px solid ${C.border}` }}>
          <button onClick={handleSignOut} style={{
            display: 'flex', alignItems: 'center', gap: 9, width: '100%',
            padding: '8px 6px', borderRadius: 9, border: 'none', cursor: 'pointer',
            background: 'transparent', textAlign: 'left',
          }}>
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
              <path d="M13 7l3 3-3 3M16 10H8M8 5H5a2 2 0 00-2 2v6a2 2 0 002 2h3" stroke="#F87171" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#F87171' }}>Sign out</div>
          </button>
        </div>
      </div>

      {/* Topbar */}
      <div style={{
        padding: '12px 16px 10px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0, background: C.bg,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {location.pathname !== '/' && (
            <button onClick={() => navBack()} style={{
              width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.06)',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M13 4l-6 6 6 6" stroke={C.text2} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: -.4 }}>
              {pageTitle}
            </div>
            <div style={{ fontSize: 11, color: C.text3, marginTop: 1 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              {' · '}
              {profile?.full_name}
            </div>
          </div>
        </div>
        <button onClick={() => setSidebarOpen(true)} style={{
          width: 34, height: 34, borderRadius: '50%',
          background: profile?.avatar_url ? `url(${profile.avatar_url}) center/cover no-repeat` : 'linear-gradient(135deg, #2563EB, #7C3AED)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer',
          border: '2px solid #2563EB', flexShrink: 0,
        }}>
          {!profile?.avatar_url && (profile?.full_name?.[0]?.toUpperCase() || 'U')}
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 14px 90px', position: 'relative' }}>
        <PageTransition>
          {children}
        </PageTransition>
      </div>

      {/* Bottom nav */}
      <nav style={{
        display: 'flex', background: C.surface3,
        borderTop: `1px solid ${C.border}`,
        padding: '6px 0 max(16px, env(safe-area-inset-bottom))',
        flexShrink: 0,
      }}>
        {BOTTOM_TABS.map(tab => {
          const active = location.pathname === tab.path
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => navTo(tab.path)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, cursor: 'pointer', border: 'none', background: 'transparent', padding: '4px 2px 0',
            }}>
              <div style={{
                width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 8, background: active ? 'rgba(37,99,235,.15)' : 'transparent',
                transition: 'background .15s',
              }}>
                <Icon color={active ? C.accent2 : C.text3} />
              </div>
              <div style={{ fontSize: 9, fontWeight: 500, color: active ? C.accent2 : C.text3 }}>
                {tab.label}
              </div>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

function getPageTitle(path) {
  const map = { '/': 'EVdex', '/sales': 'Log a sale', '/buys': 'Log a buy', '/inventory': 'Inventory', '/shows': 'Add Show', '/shows/manage': 'Shows', '/expenses': 'Expenses', '/transactions': 'Transactions', '/cashflow': 'Cash Flow', '/pl': 'Profit & Loss', '/reporting': 'Reporting', '/shows/compare': 'Show Comparison', '/export': 'Export', '/employees': 'Team', '/activity': 'Activity Log', '/contacts': 'Contacts', '/contacts/add': 'Add Contact', '/settings': 'Settings', '/profile': 'Profile', '/pong': 'Pong' }
  if (map[path]) return map[path]
  if (path.match(/^\/contacts\/[^/]+\/edit$/)) return 'Edit Contact'
  if (path.match(/^\/contacts\/[^/]+$/)) return 'Contact'
  return 'EVdex'
}

// Bottom nav icons
function HomeIcon({ color }) { return <svg width="19" height="19" viewBox="0 0 20 20" fill="none"><path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke={color} strokeWidth="1.5" fill="none" strokeLinejoin="round"/></svg> }
function BuysIcon({ color }) { return <svg width="19" height="19" viewBox="0 0 20 20" fill="none"><path d="M3 3h2.5l2.5 9h8l2-6H7" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="17" r="1.2" fill={color}/><circle cx="15" cy="17" r="1.2" fill={color}/></svg> }
function SalesIcon({ color }) { return <svg width="19" height="19" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke={color} strokeWidth="1.5"/><path d="M10 6.5v7M7 10h6" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg> }
function ShowsIcon({ color }) { return <svg width="19" height="19" viewBox="0 0 20 20" fill="none"><rect x="2.5" y="4.5" width="15" height="12" rx="2" stroke={color} strokeWidth="1.5"/><path d="M2.5 8h15M7 2v5M13 2v5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg> }
function ExpIcon({ color }) { return <svg width="19" height="19" viewBox="0 0 20 20" fill="none"><path d="M10 2v16M6 5.5C6 4 7.8 3 10 3s4 1 4 2.5S12.2 8 10 8 6 9.5 6 11s1.8 3.5 4 3.5 4-1.5 4-3" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg> }
