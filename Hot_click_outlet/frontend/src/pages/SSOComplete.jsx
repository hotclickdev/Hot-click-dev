import { useEffect, useRef } from 'react'
import { useAuth, useUser } from '@clerk/react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { useToast } from '@/components/ui/Toast'

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

    ;(async () => {
      try {
        const clerkToken = await getToken()
        const email      = user.primaryEmailAddress?.emailAddress ?? ''
        const nombre     = user.firstName ?? ''
        const apellido   = user.lastName  ?? ''
        const fotoUrl    = user.imageUrl  ?? ''

        const res = await fetch('/api/auth/clerk-sync', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${clerkToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, nombre, apellido, fotoUrl }),
        })

        const json = await res.json()

        if (json.success && json.data) {
          login(json.data)
          // Sign out of Clerk — our app manages the session via its own JWT
          try { await signOut() } catch { /* ignore */ }
          toast({ message: `¡Bienvenido, ${json.data.nombre || email}!`, type: 'success' })
          // New user without empresa → offer to register their business
          const isNewUser = !json.data.empresaId && json.data.rol === 'USUARIO_FINAL'
          navigate(isNewUser ? '/registrar-negocio' : '/', { replace: true })
        } else {
          throw new Error(json.message || 'Error al sincronizar cuenta')
        }
      } catch (err) {
        console.error('[sso-complete]', err)
        try { await signOut() } catch { /* ignore */ }
        toast({ message: 'Error al conectar tu cuenta social. Intentá de nuevo.', type: 'error' })
        navigate('/login', { replace: true })
      }
    })()
  }, [isLoaded, isSignedIn, user]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        background: 'var(--hc-bg)',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: '3px solid var(--hc-accent)',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <p style={{ color: 'var(--hc-muted)', fontSize: 14 }}>Conectando tu cuenta…</p>
    </div>
  )
}
