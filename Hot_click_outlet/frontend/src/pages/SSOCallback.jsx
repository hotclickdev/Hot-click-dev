import { AuthenticateWithRedirectCallback } from '@clerk/react'

/**
 * Intermediate page that Clerk redirects to after the OAuth provider completes.
 * AuthenticateWithRedirectCallback exchanges the OAuth code for a Clerk session,
 * then redirects to /sso-complete where we sync with our backend.
 */
export default function SSOCallback() {
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
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/sso-complete"
        signUpFallbackRedirectUrl="/sso-complete"
        signInForceRedirectUrl="/sso-complete"
        signUpForceRedirectUrl="/sso-complete"
      />
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
      <p style={{ color: 'var(--hc-muted)', fontSize: 14 }}>Verificando identidad…</p>
    </div>
  )
}
