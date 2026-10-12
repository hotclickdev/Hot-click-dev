import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useClerkDisponible } from './clerkDisponibleContext'

/** Las páginas SSO usan hooks de Clerk: sin proveedor vuelven al login en vez de romper. */
export function RequiereClerk({ children }: { children: ReactNode }) {
  return useClerkDisponible() ? <>{children}</> : <Navigate to="/login" replace />
}
