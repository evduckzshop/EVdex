import { createContext, useContext, useState, useCallback } from 'react'

const ShowContext = createContext(null)

export function ShowProvider({ children }) {
  const [activeShowId, setActiveShowId] = useState(null)
  const [activeShowName, setActiveShowName] = useState(null)

  const selectShow = useCallback((id, name) => {
    if (activeShowId === id) {
      // Deselect
      setActiveShowId(null)
      setActiveShowName(null)
    } else {
      setActiveShowId(id)
      setActiveShowName(name || null)
    }
  }, [activeShowId])

  const clearShow = useCallback(() => {
    setActiveShowId(null)
    setActiveShowName(null)
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
