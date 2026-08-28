import { useState } from 'react'
import { useSignIn, useSignUp } from '@clerk/react'
import { useToast } from '@/components/ui/Toast'

type SocialMode = 'signIn' | 'signUp'

type ClerkSocialClient = {
  authenticateWithRedirect: (opts: {
    strategy: 'oauth_google'
    redirectUrl: string
    redirectUrlComplete: string
  }) => Promise<unknown>
}

function mensajeErrorSocial(err: unknown): string {
  if (!err || typeof err !== 'object') return 'Error al conectar con Google. Intentá de nuevo.'
  const e = err as { errors?: { message?: string }[]; message?: string }
  return e.errors?.[0]?.message || e.message || 'Error al conectar con Google. Intentá de nuevo.'
}

const ACTIVE_PROVIDERS = [
  {
    id: 'google',
    label: 'Google',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    ),
  },
]

const COMING_SOON = [
  {
    id: 'microsoft',
    label: 'Microsoft',
    icon: (
      <svg width="18" height="18" viewBox="0 0 21 21">
        <rect x="1"  y="1"  width="9" height="9" fill="#F25022"/>
        <rect x="11" y="1"  width="9" height="9" fill="#7FBA00"/>
        <rect x="1"  y="11" width="9" height="9" fill="#00A4EF"/>
        <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
      </svg>
    ),
  },
  {
    id: 'apple',
    label: 'Apple',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
    ),
  },
]

export default function SocialLoginButtons({ mode = 'signIn' }: { mode?: SocialMode }) {
  const signInHook = useSignIn() as unknown as { signIn?: ClerkSocialClient | null; isLoaded: boolean }
  const signUpHook = useSignUp() as unknown as { signUp?: ClerkSocialClient | null; isLoaded: boolean }
  const signIn = signInHook.signIn
  const signUp = signUpHook.signUp
  const signInLoaded = signInHook.isLoaded
  const signUpLoaded = signUpHook.isLoaded
  const [loading, setLoading]               = useState<string | null>(null)
  const [error,   setError]                 = useState('')
  const toast                               = useToast()

  const isLoaded = mode === 'signUp' ? signUpLoaded : signInLoaded

  const handleSocial = async (providerId: string) => {
    if (!isLoaded || loading) return
    const client = mode === 'signUp' ? signUp : signIn
    if (!client) {
      toast({ message: 'Error al inicializar autenticación social. Recargá la página.', type: 'error' })
      return
    }
    setError('')
    setLoading(providerId)
    try {
      await client.authenticateWithRedirect({
        strategy: `oauth_${providerId}` as 'oauth_google',
        redirectUrl:         `${globalThis.location.origin}/sso-callback`,
        redirectUrlComplete: `${globalThis.location.origin}/sso-complete`,
      })
    } catch (err: unknown) {
      const msg = mensajeErrorSocial(err)
      setError(msg)
      setLoading(null)
    }
  }

  return (
    <div className="mt-5">
      {error && (
        <div className="mb-3 px-3 py-2 rounded-xl text-sm text-center"
          style={{ color: 'var(--hc-danger)', background: 'color-mix(in srgb, var(--hc-danger) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-danger) 22%, transparent)' }}>
          {error}
        </div>
      )}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px" style={{ background: 'var(--hc-border)' }} />
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--hc-muted)' }}>
          o continuá con
        </span>
        <div className="flex-1 h-px" style={{ background: 'var(--hc-border)' }} />
      </div>

      <div className="flex flex-col gap-2">
        {/* Google — activo */}
        {ACTIVE_PROVIDERS.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            disabled={!!loading}
            onClick={() => handleSocial(id)}
            className="flex items-center justify-center gap-2 h-10 px-3 rounded-xl font-medium text-sm transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            style={{
              background: 'var(--hc-surface-2)',
              border: '1px solid var(--hc-border)',
              color: 'var(--hc-text)',
            }}
          >
            {loading === id ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : icon}
            <span>{label}</span>
          </button>
        ))}

        {/* Microsoft y Apple — próximamente */}
        <div className="grid grid-cols-2 gap-2">
          {COMING_SOON.map(({ id, label, icon }) => (
            <div
              key={id}
              className="relative flex items-center justify-center gap-2 h-10 px-3 rounded-xl font-medium text-sm select-none"
              style={{
                background: 'var(--hc-surface-2)',
                border: '1px solid var(--hc-border)',
                color: 'var(--hc-muted)',
                opacity: 0.5,
                cursor: 'not-allowed',
              }}
            >
              {icon}
              <span>{label}</span>
              <span
                className="absolute -top-2 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                style={{ background: 'var(--hc-accent)', color: '#fff', letterSpacing: '0.03em' }}
              >
                Pronto
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
