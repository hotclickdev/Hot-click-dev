import { useEffect, useRef, useState } from 'react'
import { useAuth, useUser } from '@clerk/react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { useToast } from '@/components/ui/Toast'
import { authService } from '@/services/authService'
import { leoDeclaraMayoriaEdad } from '@/utils/mayoriaEdad'
import type { AuthResponse } from '@/types/auth'
import { sincronizarClerk, type SsoClerkPayload } from './sso/ssoClerkSync'

/**
 * After Clerk completes the OAuth flow, this page:
 *   1. Gets the Clerk session token.
 *   2. POSTs to /api/auth/clerk-sync with the token + user details.
 *   3. Stores the returned app JWT in authStore (same as email/password login).
 *   4. Signs out of Clerk (our app manages its own JWT session).
 *   5. Redirects to the app.
 * Primera cuenta social: si el API pide mayoría de edad, no cierra Clerk; muestra el checkbox.
 */
export default function SSOComplete() {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth()
  const { user }    = useUser()
  const navigate    = useNavigate()
  const login       = useAuthStore((s) => s.login)
  const toast       = useToast()
  const attempted   = useRef(false)
  const [fase, setFase] = useState<'conectando' | 'edad'>('conectando')
  const [declara, setDeclara] = useState(false)
  const [error, setError] = useState('')
  const [pendiente, setPendiente] = useState<{ token: string; payload: SsoClerkPayload } | null>(null)

  const terminarOk = async (data: AuthResponse, email: string) => {
    login(data)
    try { await signOut() } catch { /* ignore */ }
    toast({ message: `¡Bienvenido, ${data.nombre || email}!`, type: 'success' })
    const isNewUser = !data.empresaId && data.rol === 'USUARIO_FINAL'
    navigate(isNewUser ? '/registrar-negocio' : '/', { replace: true })
  }

  const fallar = async (msg: string) => {
    try { await signOut() } catch { /* ignore */ }
    toast({ message: msg, type: 'error' })
    navigate('/login', { replace: true })
  }

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
        const clerkToken = await getToken({ template: 'hotclick-session' })
          .catch(() => null)
          ?? await getToken()
        if (!clerkToken) throw new Error('No se pudo obtener el token de sesión de Clerk')

        const email    = user.primaryEmailAddress?.emailAddress ?? ''
        const payload: SsoClerkPayload = {
          email,
          nombre: user.firstName ?? '',
          apellido: user.lastName ?? '',
          fotoUrl: user.imageUrl ?? '',
        }
        if (!email) throw new Error('No se pudo obtener el email de tu cuenta Google')

        const yaDeclaro = leoDeclaraMayoriaEdad()
        const resultado = await sincronizarClerk(clerkToken, payload, yaDeclaro)
        if (resultado.ok) {
          await terminarOk(resultado.data, email)
          return
        }
        if (resultado.requiereEdad) {
          setPendiente({ token: clerkToken, payload })
          setFase('edad')
          return
        }
        await fallar(resultado.message)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al conectar tu cuenta social. Intentá de nuevo.'
        await fallar(msg)
      }
    })()
  }, [isLoaded, isSignedIn, user]) // eslint-disable-line react-hooks/exhaustive-deps

  const confirmarEdad = async () => {
    if (!pendiente || !declara) return
    setError('')
    authService.registrarConsentimiento('MAYORIA_EDAD')
    const resultado = await sincronizarClerk(pendiente.token, pendiente.payload, true)
    if (resultado.ok) {
      await terminarOk(resultado.data, pendiente.payload.email)
      return
    }
    if (resultado.requiereEdad) {
      setError('Debe declarar que es mayor de 18 años.')
      return
    }
    await fallar(resultado.message)
  }

  if (fase === 'edad') {
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
          padding: 24,
        }}
      >
        <p style={{ color: 'var(--hc-text)', fontSize: 16, fontWeight: 700, textAlign: 'center', maxWidth: 360 }}>
          HotClick solo admite personas mayores de 18 años.
        </p>
        <label
          className="flex items-start gap-2.5 cursor-pointer rounded-xl p-3"
          style={{
            maxWidth: 360,
            border: `1px solid ${declara ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
            background: declara ? 'color-mix(in srgb, var(--hc-accent) 5%, transparent)' : 'var(--hc-surface)',
          }}
        >
          <input
            type="checkbox"
            checked={declara}
            onChange={(e) => setDeclara(e.target.checked)}
            className="mt-0.5 shrink-0"
            style={{ accentColor: 'var(--hc-accent)', width: 15, height: 15 }}
          />
          <span className="text-xs leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
            Declaro que soy mayor de 18 años. HotClick no permite cuentas de personas menores de edad.
          </span>
        </label>
        {error && <p style={{ color: 'var(--hc-danger)', fontSize: 12 }}>{error}</p>}
        <button
          type="button"
          disabled={!declara}
          onClick={() => { void confirmarEdad() }}
          className="h-11 px-6 rounded-xl font-bold text-sm text-white disabled:opacity-60"
          style={{ background: 'var(--hc-accent)' }}
        >
          Continuar
        </button>
      </div>
    )
  }

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
