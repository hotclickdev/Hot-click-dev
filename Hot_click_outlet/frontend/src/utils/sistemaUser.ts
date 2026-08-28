/**
 * Dueño o equipo de un negocio. El plan (EMPRENDEDOR / PYME / NEGOCIO_PLUS)
 * no cambia el cromo Sistema. Tokens viejos pueden traer PROPIETARIO/EDITOR.
 */
export const ROLES_VENDEDOR = new Set<string>([
  'EMPRENDEDOR',
  'PROPIETARIO',
  'EDITOR',
  'LECTOR',
])

/** Acceso a /admin: plataforma + vendedor. ADMIN de equipo no va acá (el JWT lo mapea). */
export const ADMIN_ROLES = new Set<string>(['ADMIN', ...ROLES_VENDEDOR])

export function esUsuarioSistema(userRole: string | null | undefined): boolean {
  return ROLES_VENDEDOR.has(userRole ?? '')
}
