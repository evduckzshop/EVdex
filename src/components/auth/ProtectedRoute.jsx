import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// Spinner shown while auth state is resolving
function LoadingScreen() {
  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#111318', gap: 16,
    }}>
      <div style={{
        width: 40, height: 40, border: '3px solid rgba(37,99,235,.2)',
        borderTopColor: '#2563EB', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <div style={{ color: '#475569', fontSize: 13, fontWeight: 500 }}>Loading EVdex…</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// Requires any authenticated, active user
export function RequireAuth({ children }) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />
  if (profile && !profile.is_active) return <Navigate to="/deactivated" replace />

  return children
}

// Requires admin role — redirects employees to /access-denied
export function RequireAdmin({ children }) {
  const { session, profile, loading, isAdmin } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />
  if (!isAdmin) return <Navigate to="/access-denied" replace />

  return children
}

// Access denied page shown to employees who hit admin-only routes
export function AccessDenied() {
  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#111318', padding: 24, textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: 'rgba(248,113,113,.1)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', marginBottom: 20,
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#F87171" strokeWidth="1.5"/>
          <path d="M15 9l-6 6M9 9l6 6" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#F1F5F9', marginBottom: 8 }}>
        Access Denied
      </div>
      <div style={{ fontSize: 14, color: '#475569', marginBottom: 28, maxWidth: 280 }}>
        You don't have permission to view this page. Contact your admin if you think this is a mistake.
      </div>
      <a href="/" style={{
        padding: '11px 24px', background: '#2563EB', borderRadius: 12,
        color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none',
      }}>
        Back to Home
      </a>
    </div>
  )
}

// Shown to deactivated accounts
export function DeactivatedPage() {
  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#111318', padding: 24, textAlign: 'center',
    }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#F1F5F9', marginBottom: 8 }}>
        Account Deactivated
      </div>
      <div style={{ fontSize: 14, color: '#475569', marginBottom: 28, maxWidth: 280 }}>
        Your account has been deactivated. Please contact your admin.
      </div>
      <button onClick={() => supabase.auth.signOut()} style={{
        padding: '11px 24px', background: '#374151', borderRadius: 12,
        color: '#fff', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
      }}>
        Sign Out
      </button>
    </div>
  )
}
