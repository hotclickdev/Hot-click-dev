import type { AuthResponse } from '@/types/auth'

/** Longitud mínima de la contraseña de administrador (alineada con el backend). */
export const MIN_PASSWORD = 8

export type RegistroEmpresaForm = {
  nombreEmpresa: string
  correoEmpresa: string
  telefonoEmpresa: string
  nombreAdmin: string
  correoAdmin: string
  passwordAdmin: string
  telefonoAdmin: string
  inscritoTributacion: boolean
}

export type AuthRegistroEmpresa = AuthResponse & { otpEnviado?: boolean }

/**
 * Extrae AuthResponse del body ya desempaquetado por el interceptor de api
 * (ResponseDTO.data) o de un envelope anidado residual.
 */
export function authDataRegistroEmpresa(data: unknown): AuthRegistroEmpresa | undefined {
  if (!data || typeof data !== 'object') return undefined
  const envelope = data as { data?: AuthRegistroEmpresa; accessToken?: string }
  if (envelope.data?.accessToken) return envelope.data
  if (envelope.accessToken) return envelope as AuthRegistroEmpresa
  return undefined
}
