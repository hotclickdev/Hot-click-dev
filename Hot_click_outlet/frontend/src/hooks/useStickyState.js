import { useState, useCallback } from 'react'

export function useStickyState(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const stored = sessionStorage.getItem(key)
      return stored === null ? defaultValue : JSON.parse(stored)
    } catch { return defaultValue }
  })

  const setStickyState = useCallback((value) => {
    setState(prev => {
      const next = typeof value === 'function' ? value(prev) : value
      try { sessionStorage.setItem(key, JSON.stringify(next)) } catch { /* ok */ }
      return next
    })
  }, [key])

  return [state, setStickyState]
}
