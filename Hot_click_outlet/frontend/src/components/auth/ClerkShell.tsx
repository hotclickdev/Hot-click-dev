import { useEffect, useState } from 'react'
import { ClerkProvider } from '@clerk/react'
import { Outlet } from 'react-router-dom'
import { cargarClaveClerk } from './clerkConfig'
import { ClerkDisponibleContext } from './clerkDisponibleContext'

/**
 * Envuelve /login, /registro y /sso-*. La clave de Clerk se resuelve en runtime;
 * sin clave las páginas siguen funcionando con correo y contraseña (sin botón de Google).
 */
export default function ClerkShell() {
  const [clave, setClave] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    let vivo = true
    void cargarClaveClerk().then((k) => { if (vivo) setClave(k) })
    return () => { vivo = false }
  }, [])

  if (clave === undefined) {
    return <div aria-busy="true" className="min-h-screen bg-hc-n-0" />
  }
  if (!clave) {
    return (
      <ClerkDisponibleContext.Provider value={false}>
        <Outlet />
      </ClerkDisponibleContext.Provider>
    )
  }
  return (
    <ClerkProvider publishableKey={clave}>
      <ClerkDisponibleContext.Provider value={true}>
        <Outlet />
      </ClerkDisponibleContext.Provider>
    </ClerkProvider>
  )
}
