/**
 * Dueño de negocio: rol EMPRENDEDOR, cualquier plan
 * (EMPRENDEDOR, PYME, NEGOCIO_PLUS). El plan no cambia el cromo Sistema.
 * @param {string|null|undefined} userRole
 */
export function esUsuarioSistema(userRole) {
  return userRole === 'EMPRENDEDOR'
}
