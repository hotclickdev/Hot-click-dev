import { useState, useCallback } from 'react'

export function useStickyState<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(key)
      return stored === null ? defaultValue : JSON.parse(stored) as T
    } catch { return defaultValue }
  })

  const setStickyState = useCallback((value: T | ((prev: T) => T)) => {
    setState(prev => {
      const next = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value
      try { sessionStorage.setItem(key, JSON.stringify(next)) } catch { /* ok */ }
      return next
    })
  }, [key])

  return [state, setStickyState]
}
