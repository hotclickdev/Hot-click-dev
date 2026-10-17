/** Plantilla JWT de Clerk que trae los claims `email` y `email_verified` que exige /api/auth/clerk-sync. */
export const PLANTILLA_SESION = 'hotclick-session'
export const MSG_PLANTILLA = 'No pudimos conectar tu cuenta: la plantilla hotclick-session no está configurada. Probá con correo y contraseña o escribinos.'

type GetToken = (opts?: { template?: string }) => Promise<string | null>

function claimsDe(token: string): Record<string, unknown> | null {
  try {
    const parte = token.split('.')[1]
    if (!parte) return null
    const b64 = parte.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(parte.length / 4) * 4, '=')
    return JSON.parse(atob(b64)) as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * Pide el token de la plantilla `hotclick-session`. Sin respaldo a `getToken()` simple: ese token no trae
 * correo y clerk-sync lo rechazaría. Si falla o no trae `email`, registra el motivo y lanza un error claro.
 */
export async function obtenerTokenSesion(getToken: GetToken): Promise<string> {
  let token: string | null
  try {
    token = await getToken({ template: PLANTILLA_SESION })
  } catch (e) {
    console.error('[sso] plantilla hotclick-session no configurada o con error', e)
    throw new Error(MSG_PLANTILLA, { cause: e })
  }
  if (!token) {
    console.error('[sso] plantilla hotclick-session no configurada: Clerk no devolvió token')
    throw new Error(MSG_PLANTILLA)
  }
  const email = claimsDe(token)?.email
  if (typeof email !== 'string' || !email) {
    console.error('[sso] el token de hotclick-session no trae el claim email')
    throw new Error(MSG_PLANTILLA)
  }
  return token
}
