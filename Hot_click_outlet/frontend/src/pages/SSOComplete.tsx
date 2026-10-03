import { useEffect, useRef } from 'react'
import { useAuth, useUser } from '@clerk/react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { useToast } from '@/components/ui/Toast'
import type { AuthResponse } from '@/types/auth'

/**
 * After Clerk completes the OAuth flow, this page:
 *   1. Gets the Clerk session token.
 *   2. POSTs to /api/auth/clerk-sync with the token + user details.
 *   3. Stores the returned app JWT in authStore (same as email/password login).
 *   4. Signs out of Clerk (our app manages its own JWT session).
 *   5. Redirects to the app.
 */
export default function SSOComplete() {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth()
  const { user }    = useUser()
  const navigate    = useNavigate()
  const login       = useAuthStore((s) => s.login)
  const toast       = useToast()
  const attempted   = useRef(false)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn || !user) {
      navigate('/login', { replace: true })
      return
    }
    if (attempted.current) return
    attempted.current = true

    void (async () => {
      try {
        // Intentar el template con email claim; si no existe (dev/sin configurar) usar el default.
        const clerkToken = await getToken({ template: 'hotclick-session' })
          .catch(() => null)
          ?? await getToken()

        if (!clerkToken) throw new Error('No se pudo obtener el token de sesión de Clerk')

        const email    = user.primaryEmailAddress?.emailAddress ?? ''
        const nombre   = user.firstName ?? ''
        const apellido = user.lastName  ?? ''
        const fotoUrl  = user.imageUrl  ?? ''

        if (!email) {
          throw new Error('No se pudo obtener el email de tu cuenta Google')
        }

        const res = await fetch('/api/auth/clerk-sync', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${clerkToken}`,
            'Content-Type': 'application/json',
          },
          // email incluido como fallback para cuando el JWT template no está configurado.
          // El backend prefiere el email del JWT verificado si está disponible.
          body: JSON.stringify({ email, nombre, apellido, fotoUrl }),
        })

        const json: unknown = await res.json().catch(() => ({}))
        const body = json && typeof json === 'object' ? json as { success?: boolean; message?: string; data?: AuthResponse } : {}

        if (!res.ok || !body.success) {
          throw new Error(body.message || `Error del servidor (${res.status})`)
        }

        if (body.success && body.data) {
          login(body.data)
          // Sign out of Clerk — our app manages the session via its own JWT
          try { await signOut() } catch { /* ignore */ }
          toast({ message: `¡Bienvenido, ${body.data.nombre || email}!`, type: 'success' })
          // New user without empresa → offer to register their business
          const isNewUser = !body.data.empresaId && body.data.rol === 'USUARIO_FINAL'
          navigate(isNewUser ? '/registrar-negocio' : '/', { replace: true })
        } else {
          throw new Error(body.message || 'Error al sincronizar cuenta')
        }
      } catch (err: unknown) {
        try { await signOut() } catch { /* ignore */ }
        const msg = err instanceof Error ? err.message : 'Error al conectar tu cuenta social. Intentá de nuevo.'
        toast({ message: msg, type: 'error' })
        navigate('/login', { replace: true })
      }
    })()
  }, [isLoaded, isSignedIn, user]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div role="status" aria-live="polite" className="flex min-h-screen flex-col items-center justify-center gap-3 bg-hc-n-0 px-6 text-center leading-[normal]">
      <span className="flex size-[72px] items-center justify-center rounded-full bg-hc-blue-50">
        <span aria-hidden="true" className="size-9 animate-spin rounded-full border-[3px] border-hc-blue-100 border-t-hc-blue-600" />
      </span>
      <p className="font-display text-[19px] font-bold text-hc-n-900">Conectando tu cuenta…</p>
    </div>
  )
}
