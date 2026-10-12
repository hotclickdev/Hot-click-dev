export type ClienteOAuthClerk = {
  authenticateWithRedirect: (opts: {
    strategy: 'oauth_google'
    redirectUrl: string
    redirectUrlComplete: string
  }) => Promise<unknown>
}

/** Redirige a Google vía Clerk; vuelve a /sso-callback → /sso-complete (clerk-sync). */
export function iniciarGoogle(cliente: ClienteOAuthClerk, origen: string): Promise<unknown> {
  return cliente.authenticateWithRedirect({
    strategy: 'oauth_google',
    redirectUrl: `${origen}/sso-callback`,
    redirectUrlComplete: `${origen}/sso-complete`,
  })
}
