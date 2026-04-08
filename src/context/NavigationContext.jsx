import { createContext, useContext, useCallback, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const NavigationContext = createContext(null)

// Tab paths and their order for directional slide detection
const TAB_PATHS = ['/', '/sales', '/buys', '/shows/manage', '/expenses']
const TAB_SET = new Set(TAB_PATHS)

// Top-level pages (not "deeper" navigations)
const TOP_LEVEL = new Set([
  ...TAB_PATHS,
  '/inventory', '/contacts', '/transactions', '/cashflow', '/pl',
  '/reporting', '/shows/compare', '/export', '/employees', '/activity',
  '/settings', '/profile', '/pong',
  // Customer portal
  '/portal', '/portal/history', '/portal/badges', '/portal/profile',
])

function isDeepPath(path) {
  // Paths like /contacts/123, /contacts/add, /contacts/123/edit
  return !TOP_LEVEL.has(path)
}

export function NavigationProvider({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const transitionType = useRef('fade')
  const prevPath = useRef(location.pathname)
  const manualNav = useRef(false) // true when navTo/navBack/navFade was used
  const navigating = useRef(false) // guard against double-tap during animation

  // Auto-detect transition for raw navigate() calls
  useEffect(() => {
    // Navigation completed — unlock
    navigating.current = false

    if (manualNav.current) {
      // Was set explicitly by navTo/navBack/navFade — don't override
      manualNav.current = false
      prevPath.current = location.pathname
      return
    }

    const from = prevPath.current
    const to = location.pathname

    if (from === to) return

    // Both tabs → fade
    if (TAB_SET.has(from) && TAB_SET.has(to)) {
      transitionType.current = 'fade'
    }
    // Going deeper (e.g. /contacts → /contacts/123) → slide left
    else if (!isDeepPath(from) && isDeepPath(to)) {
      transitionType.current = 'slide-left'
    }
    // Going back from deep to top → slide right
    else if (isDeepPath(from) && !isDeepPath(to)) {
      transitionType.current = 'slide-right'
    }
    // Deep to deep (e.g. /contacts/123 → /contacts/123/edit) → slide left
    else if (isDeepPath(from) && isDeepPath(to)) {
      transitionType.current = 'slide-left'
    }
    // Top-level to top-level (sidebar nav) → fade
    else {
      transitionType.current = 'fade'
    }

    prevPath.current = to
  }, [location.pathname])

  const navTo = useCallback((path, opts) => {
    // Skip if already navigating or already on this page
    if (navigating.current) return
    if (path === location.pathname) return

    const fromPath = location.pathname
    const fromIdx = TAB_PATHS.indexOf(fromPath)
    const toIdx = TAB_PATHS.indexOf(path)

    if (fromIdx !== -1 && toIdx !== -1) {
      transitionType.current = 'fade'
    } else if (TAB_SET.has(path) && TAB_SET.has(fromPath)) {
      transitionType.current = 'fade'
    } else {
      transitionType.current = 'slide-left'
    }

    navigating.current = true
    manualNav.current = true
    navigate(path, opts)
  }, [navigate, location.pathname])

  const navBack = useCallback(() => {
    if (navigating.current) return
    transitionType.current = 'slide-right'
    navigating.current = true
    manualNav.current = true
    navigate(-1)
  }, [navigate])

  const navFade = useCallback((path, opts) => {
    if (navigating.current) return
    if (path === location.pathname) return
    transitionType.current = 'fade'
    navigating.current = true
    manualNav.current = true
    navigate(path, opts)
  }, [navigate, location.pathname])

  return (
    <NavigationContext.Provider value={{ navTo, navBack, navFade, transitionType }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNav() {
  return useContext(NavigationContext)
}
