/** EDITOR y LECTOR no pueden listar sucursales (/api/sucursales/** es solo propietario/admin). */
const ROLES_SIN_SUCURSALES = new Set(['EDITOR', 'LECTOR'])
export function verSucursales(rol: string | null | undefined): boolean {
  return !ROLES_SIN_SUCURSALES.has(rol ?? '')
}
