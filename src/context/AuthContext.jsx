import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, getProfile } from '../lib/supabase'

const AuthContext = createContext(null)

const log = (...args) => console.log('[EVdex Auth]', ...args)
const logErr = (...args) => console.error('[EVdex Auth]', ...args)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId) => {
    log('loadProfile called for userId:', userId)
    try {
      const p = await getProfile(userId)
      log('loadProfile success:', { id: p?.id, role: p?.role, is_active: p?.is_active })
      setProfile(p)
    } catch (e) {
      logErr('loadProfile FAILED:', e?.message || e)
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    log('AuthProvider mounted')
    let initialDone = false

    // onAuthStateChange handles ALL events including INITIAL_SESSION
    // IMPORTANT: callback must NOT be async — awaiting blocks the Supabase client queue
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      log('onAuthStateChange:', event)
      setSession(newSession)

      if (newSession?.user) {
        // Fire loadProfile WITHOUT await — don't block the client
        loadProfile(newSession.user.id).then(() => {
          if (!initialDone) {
            initialDone = true
            log('Initial profile loaded, setting loading=false')
            setLoading(false)
          }
        })
      } else {
        setProfile(null)
        if (!initialDone) {
          initialDone = true
          log('No session, setting loading=false')
          setLoading(false)
        }
      }
    })

    // Safety net: if nothing resolves in 10s, force loading=false
    const safety = setTimeout(() => {
      if (!initialDone) {
        logErr('Safety timeout — forcing loading=false after 10s')
        initialDone = true
        setLoading(false)
      }
    }, 10000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(safety)
    }
  }, [loadProfile])

  const refreshProfile = useCallback(() => {
    if (session?.user) return loadProfile(session.user.id)
  }, [session, loadProfile])

  const isAdmin = profile?.role === 'admin'
  const isEmployee = profile?.role === 'employee'
  const isActive = profile?.is_active === true

  log('Render — loading:', loading, 'session:', !!session, 'profile:', profile?.role || 'null', 'isActive:', isActive)

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profile,
      loading,
      isAdmin,
      isEmployee,
      isActive,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
