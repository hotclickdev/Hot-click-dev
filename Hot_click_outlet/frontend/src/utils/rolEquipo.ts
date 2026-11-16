import type { AuthResponse } from '@/types/auth'

/**
 * El JWT/AuthResponse.rol es EMPRENDEDOR para cualquier miembro de un negocio (incluido el cajero): la restricción
 * real del cajero la aplica el servidor según la membresía. Para que la UI no muestre opciones que darían 403,
 * un miembro con rolEquipo=CAJERO se trata en la UI como CAJERO (solo Caja/POS). Los demás roles no cambian.
 */
export function rolUiDesdeRespuesta(rol: string | null | undefined, rolEquipo: string | null | undefined): string | null {
  if (rolEquipo === 'CAJERO' && rol !== 'ADMIN') return 'CAJERO'
  return rol ?? null
}

/** CAJERO: permisos de equipo (solo POS). Resto: `permisos` de la respuesta, o los del token como respaldo. */
export function permisosUiDesdeRespuesta(
  data: Pick<AuthResponse, 'rolEquipo' | 'permisos' | 'permisosEquipo'>,
  permisosToken?: string[],
): string[] {
  const permisos = data.rolEquipo === 'CAJERO' && Array.isArray(data.permisosEquipo)
    ? data.permisosEquipo
    : (data.permisos ?? permisosToken ?? [])
  return Array.isArray(permisos) ? permisos : []
}
