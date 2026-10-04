import type { AuthResponse } from '@/types/auth'
import { esErrorMayoriaEdad } from '@/utils/mayoriaEdad'

export type SsoClerkPayload = {
  email: string
  nombre: string
  apellido: string
  fotoUrl: string
}

export type SsoClerkResultado =
  | { ok: true; data: AuthResponse }
  | { ok: false; requiereEdad: true }
  | { ok: false; requiereEdad: false; message: string }

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
  if (!res.ok || !body.success || !body.data) {
    return { ok: false, requiereEdad: false, message: body.message || `Error del servidor (${res.status})` }
  }
  return { ok: true, data: body.data }
}
