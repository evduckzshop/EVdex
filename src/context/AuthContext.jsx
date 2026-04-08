import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, getProfile } from '../lib/supabase'

const AuthContext = createContext(null)

const log = (...args) => console.log('[EVdex Auth]', ...args)
const logErr = (...args) => console.error('[EVdex Auth]', ...args)

// Timeout wrapper — if getProfile takes longer than 8s, give up
function withTimeout(promise, ms = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Profile query timed out')), ms))
  ])
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId) => {
    log('loadProfile called for userId:', userId)
    try {
      const p = await withTimeout(getProfile(userId))
      log('loadProfile success:', { id: p?.id, role: p?.role, is_active: p?.is_active })
      setProfile(p)
    } catch (e) {
      logErr('loadProfile FAILED:', e?.message || e)
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    log('AuthProvider mounted')
    let initialLoadDone = false

    // Use onAuthStateChange for ALL session handling (handles INITIAL_SESSION in v2)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      log('onAuthStateChange:', event, newSession ? `user=${newSession.user?.id}` : 'no session')

      setSession(newSession)

      if (newSession?.user) {
        await loadProfile(newSession.user.id)
      } else {
        setProfile(null)
      }

      if (!initialLoadDone) {
        initialLoadDone = true
        log('Initial auth resolved, setting loading=false')
        setLoading(false)
      }
    })

    // Safety net: if onAuthStateChange never fires within 10s, force loading=false
    const safetyTimer = setTimeout(() => {
      if (!initialLoadDone) {
        logErr('Safety timeout — auth never resolved after 10s, forcing loading=false')
        initialLoadDone = true
        setLoading(false)
      }
    }, 10000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(safetyTimer)
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
