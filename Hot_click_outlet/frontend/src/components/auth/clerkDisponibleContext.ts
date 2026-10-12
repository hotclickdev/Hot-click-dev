import { createContext, useContext } from 'react'

/** `true` solo dentro de un `ClerkProvider` con clave válida (ver `ClerkShell`). */
export const ClerkDisponibleContext = createContext(false)

export function useClerkDisponible(): boolean {
  return useContext(ClerkDisponibleContext)
}
