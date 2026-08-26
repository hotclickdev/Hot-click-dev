export const RUTA_EMPRENDE = '/emprende'
export const RUTA_EMPRENDIMIENTOS = '/emprendimientos'
export const RUTA_CATALOGO_EMPRENDIMIENTOS = '/productos?vista=emprendimientos'

/** Nav Emprender cubre el hub y el directorio de aliados (no se borra). */
export function esRutaEmprender(pathname) {
  return pathname === RUTA_EMPRENDE
    || pathname === RUTA_EMPRENDIMIENTOS
    || pathname.startsWith(`${RUTA_EMPRENDIMIENTOS}/`)
}
