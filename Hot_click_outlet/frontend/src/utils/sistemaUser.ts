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

/** Caja: POSShell en `/admin/pos`. No entran al shell Figma vendedor. */
export const ROLES_POS = new Set<string>(['CAJERO', 'GERENTE', 'SUPERVISOR'])

/** Staff de plataforma (sin bypass CompanyScope; menú por global.*). */
export const ROLES_STAFF = new Set<string>(['SUPPORT', 'FINANCE', 'TRUST'])

/** Operadores de la consola de plataforma (ADMIN + staff). */
export const ROLES_PLATAFORMA = new Set<string>(['ADMIN', ...ROLES_STAFF])

/** Acceso a /admin: plataforma + vendedor. */
export const ADMIN_ROLES = new Set<string>(['ADMIN', ...ROLES_VENDEDOR, ...ROLES_STAFF])

export function esUsuarioSistema(userRole: string | null | undefined): boolean {
  return ROLES_VENDEDOR.has(userRole ?? '')
}

export function esStaffPlataforma(userRole: string | null | undefined): boolean {
  return ROLES_PLATAFORMA.has(userRole ?? '')
}
