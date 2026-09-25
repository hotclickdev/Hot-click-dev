import type { Id } from './api'

export type RolUsuario = 'ADMIN' | 'EMPRENDEDOR' | 'USUARIO_FINAL' | string

export type AuthResponse = {
  accessToken: string
  /** Puede venir en el body por compat; el FE no lo persiste (cookie HttpOnly). */
  refreshToken?: string | null
  tipo?: string
  id?: Id | null
  correo?: string | null
  rol?: RolUsuario | null
  nombre?: string | null
  empresaId?: Id | null
  empresaSlug?: string | null
  empresaNombre?: string | null
  permisos?: string[]
  correoVerificado?: boolean
}

export type JwtClaims = {
  empresaId?: Id
  empresaSlug?: string
  permisos?: string[]
  rol?: RolUsuario | null
}

export type RegistroPayload = {
  correo?: string
  contrasena?: string
  nombre?: string
  [key: string]: unknown
}

/** Solo lo que vive en localStorage (hotclick-auth). Sin refreshToken. */
export type AuthPersistido = {
  token?: string | null
}
