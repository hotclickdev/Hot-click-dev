import type { AuthResponse } from '@/types/auth'
import { esErrorMayoriaEdad } from '@/utils/mayoriaEdad'

/**
 * Solo datos de perfil. La identidad (correo y usuario de Clerk) sale del token verificado:
 * el hotfix P1-01 ignora `email`/`clerkUserId` del body y master usa el claim `email` del JWT
 * (plantilla `hotclick-session`), así que no se mandan.
 */
export type SsoClerkPayload = {
  nombre: string
  apellido: string
  fotoUrl: string
}

export type SsoClerkResultado =
  | { ok: true; data: AuthResponse }
  | { ok: false; requiereEdad: true }
  | { ok: false; requiereEdad: false; message: string; codigo?: SsoClerkCodigoError }

/** 409: la cuenta HotClick ya está vinculada a otro usuario de Clerk (P1-01). 401 con «correo verificado»: token sin `email_verified` (solo con el hotfix). */
export type SsoClerkCodigoError = 'vinculo-conflicto' | 'correo-no-verificado'

export async function sincronizarClerk(
  clerkToken: string,
  payload: SsoClerkPayload,
  declaraMayoriaEdad: boolean,
): Promise<SsoClerkResultado> {
  const res = await fetch('/api/auth/clerk-sync', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${clerkToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      ...(declaraMayoriaEdad ? { declaraMayoriaEdad: 'true' } : {}),
    }),
  })
  const json: unknown = await res.json().catch(() => ({}))
  const body = json && typeof json === 'object'
    ? json as { success?: boolean; message?: string; data?: AuthResponse }
    : {}
  if (res.status === 400 && esErrorMayoriaEdad(body.message)) {
    return { ok: false, requiereEdad: true }
  }
  if (res.status === 409) {
    return { ok: false, requiereEdad: false, codigo: 'vinculo-conflicto', message: body.message || '' }
  }
  if (res.status === 401 && /verificad/i.test(body.message || '')) {
    return { ok: false, requiereEdad: false, codigo: 'correo-no-verificado', message: body.message || '' }
  }
  if (!res.ok || !body.success || !body.data) {
    return { ok: false, requiereEdad: false, message: body.message || `Error del servidor (${res.status})` }
  }
  return { ok: true, data: body.data }
}
