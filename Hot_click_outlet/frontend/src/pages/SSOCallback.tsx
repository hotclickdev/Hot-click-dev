import { AuthenticateWithRedirectCallback } from '@clerk/react'

/**
 * Intermediate page that Clerk redirects to after the OAuth provider completes.
 * AuthenticateWithRedirectCallback exchanges the OAuth code for a Clerk session,
 * then redirects to /sso-complete where we sync with our backend.
 */
export default function SSOCallback() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-screen flex-col items-center justify-center gap-3 bg-hc-n-0 px-6 text-center leading-[normal]">
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/sso-complete"
        signUpFallbackRedirectUrl="/sso-complete"
        signInForceRedirectUrl="/sso-complete"
        signUpForceRedirectUrl="/sso-complete"
      />
      <span className="flex size-[72px] items-center justify-center rounded-full bg-hc-blue-50">
        <span aria-hidden="true" className="size-9 animate-spin rounded-full border-[3px] border-hc-blue-100 border-t-hc-blue-600" />
      </span>
      <p className="font-display text-[19px] font-bold text-hc-n-900">Verificando identidad…</p>
    </div>
  )
}
