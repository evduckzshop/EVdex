import { createContext, useContext, useState, useCallback } from 'react'

const ShowContext = createContext(null)

export function ShowProvider({ children }) {
  const [activeShowId, setActiveShowId] = useState(() => localStorage.getItem('activeShowId') || null)
  const [activeShowName, setActiveShowName] = useState(() => localStorage.getItem('activeShowName') || null)

  const selectShow = useCallback((id, name) => {
    if (activeShowId === id) {
      setActiveShowId(null)
      setActiveShowName(null)
      localStorage.removeItem('activeShowId')
      localStorage.removeItem('activeShowName')
    } else {
      setActiveShowId(id)
      setActiveShowName(name || null)
      localStorage.setItem('activeShowId', id)
      if (name) localStorage.setItem('activeShowName', name)
      else localStorage.removeItem('activeShowName')
    }
  }, [activeShowId])

  const clearShow = useCallback(() => {
    setActiveShowId(null)
    setActiveShowName(null)
    localStorage.removeItem('activeShowId')
    localStorage.removeItem('activeShowName')
  }, [])

  return (
    <ShowContext.Provider value={{ activeShowId, activeShowName, selectShow, clearShow }}>
      {children}
    </ShowContext.Provider>
  )
}

export function useActiveShow() {
  return useContext(ShowContext)
}
