import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NavigationProvider } from './context/NavigationContext'
import { RequireAuth, RequireAdmin, RequireCustomer, AccessDenied, DeactivatedPage } from './components/auth/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'
import CustomerLayout from './components/layout/CustomerLayout'

// Pages
import LoginPage from './pages/LoginPage'
import { ForgotPasswordPage, ResetPasswordPage } from './pages/PasswordPages'
import ProfilePage from './pages/ProfilePage'
import EmployeesPage from './pages/EmployeesPage'

// Lazy-load heavy pages (code split)
import { lazy, Suspense } from 'react'
const HomePage       = lazy(() => import('./pages/HomePage'))
const SalesPage      = lazy(() => import('./pages/SalesPage'))
const BuysPage       = lazy(() => import('./pages/BuysPage'))
const ExpensesPage   = lazy(() => import('./pages/ExpensesPage'))
const ShowsPage      = lazy(() => import('./pages/ShowsPage'))
const InventoryPage  = lazy(() => import('./pages/InventoryPage'))
const ContactsPage       = lazy(() => import('./pages/ContactsPage'))
const ContactDetailPage  = lazy(() => import('./pages/ContactsPage').then(m => ({ default: m.ContactDetailPage })))
const ContactEditPage    = lazy(() => import('./pages/ContactsPage').then(m => ({ default: m.ContactEditPage })))
const ContactAddPage     = lazy(() => import('./pages/ContactsPage').then(m => ({ default: m.ContactAddPage })))
const ShowManagePage = lazy(() => import('./pages/ShowManagePage'))
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'))
const PongPage         = lazy(() => import('./pages/PongPage'))
const ShowComparePage  = lazy(() => import('./pages/ShowComparePage'))
const CashFlowPage   = lazy(() => import('./pages/CashFlowPage'))
const PLPage         = lazy(() => import('./pages/PLPage'))
const ReportingPage  = lazy(() => import('./pages/ReportingPage'))
const ExportPage     = lazy(() => import('./pages/ExportPage'))
const ActivityPage   = lazy(() => import('./pages/ActivityPage'))
const SettingsPage   = lazy(() => import('./pages/SettingsPage'))

// Customer portal pages
const PortalDashboard = lazy(() => import('./pages/portal/PortalDashboard'))
const PortalHistory   = lazy(() => import('./pages/portal/PortalHistory'))
const PortalBadges    = lazy(() => import('./pages/portal/PortalBadges'))
const PortalProfile   = lazy(() => import('./pages/portal/PortalProfile'))

const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
    <div style={{ width: 24, height: 24, border: '2px solid rgba(37,99,235,.2)', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
)

// Wraps a page with AppLayout (staff)
function Layout({ children }) {
  return <AppLayout><Suspense fallback={<PageLoader />}>{children}</Suspense></AppLayout>
}

// Wraps a page with CustomerLayout (customer portal)
function PortalLayout({ children }) {
  return <CustomerLayout><Suspense fallback={<PageLoader />}>{children}</Suspense></CustomerLayout>
}

// Redirect authenticated users away from login
function PublicOnlyRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return null
  if (session) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <NavigationProvider>
      <AuthProvider>
        <Routes>

          {/* ── Public routes ── */}
          <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/access-denied" element={<AccessDenied />} />
          <Route path="/deactivated" element={<DeactivatedPage />} />

          {/* ── Auth required (any role) ── */}
          <Route path="/" element={<RequireAuth><Layout><HomePage /></Layout></RequireAuth>} />
          <Route path="/sales" element={<RequireAuth><Layout><SalesPage /></Layout></RequireAuth>} />
          <Route path="/buys" element={<RequireAuth><Layout><BuysPage /></Layout></RequireAuth>} />
          <Route path="/expenses" element={<RequireAuth><Layout><ExpensesPage /></Layout></RequireAuth>} />
          <Route path="/shows" element={<RequireAuth><Layout><ShowsPage /></Layout></RequireAuth>} />
          <Route path="/inventory" element={<RequireAuth><Layout><InventoryPage /></Layout></RequireAuth>} />
          <Route path="/contacts" element={<RequireAuth><Layout><ContactsPage /></Layout></RequireAuth>} />
          <Route path="/contacts/add" element={<RequireAuth><Layout><ContactAddPage /></Layout></RequireAuth>} />
          <Route path="/contacts/:id" element={<RequireAuth><Layout><ContactDetailPage /></Layout></RequireAuth>} />
          <Route path="/contacts/:id/edit" element={<RequireAuth><Layout><ContactEditPage /></Layout></RequireAuth>} />
          <Route path="/shows/manage" element={<RequireAuth><Layout><ShowManagePage /></Layout></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><Layout><ProfilePage /></Layout></RequireAuth>} />
          <Route path="/transactions" element={<RequireAuth><Layout><TransactionsPage /></Layout></RequireAuth>} />
          <Route path="/pong" element={<RequireAuth><Layout><PongPage /></Layout></RequireAuth>} />

          {/* ── Admin only ── */}
          <Route path="/cashflow" element={<RequireAdmin><Layout><CashFlowPage /></Layout></RequireAdmin>} />
          <Route path="/pl" element={<RequireAdmin><Layout><PLPage /></Layout></RequireAdmin>} />
          <Route path="/reporting" element={<RequireAdmin><Layout><ReportingPage /></Layout></RequireAdmin>} />
          <Route path="/shows/compare" element={<RequireAdmin><Layout><ShowComparePage /></Layout></RequireAdmin>} />
          <Route path="/export" element={<RequireAdmin><Layout><ExportPage /></Layout></RequireAdmin>} />
          <Route path="/employees" element={<RequireAdmin><Layout><EmployeesPage /></Layout></RequireAdmin>} />
          <Route path="/activity" element={<RequireAdmin><Layout><ActivityPage /></Layout></RequireAdmin>} />
          <Route path="/settings" element={<RequireAdmin><Layout><SettingsPage /></Layout></RequireAdmin>} />

          {/* ── Customer portal ── */}
          <Route path="/portal" element={<RequireCustomer><PortalLayout><PortalDashboard /></PortalLayout></RequireCustomer>} />
          <Route path="/portal/history" element={<RequireCustomer><PortalLayout><PortalHistory /></PortalLayout></RequireCustomer>} />
          <Route path="/portal/badges" element={<RequireCustomer><PortalLayout><PortalBadges /></PortalLayout></RequireCustomer>} />
          <Route path="/portal/profile" element={<RequireCustomer><PortalLayout><PortalProfile /></PortalLayout></RequireCustomer>} />

          {/* ── Fallback ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
      </NavigationProvider>
    </BrowserRouter>
  )
}
