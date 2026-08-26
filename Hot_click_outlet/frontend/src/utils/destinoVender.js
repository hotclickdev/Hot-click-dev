export const RUTA_REGISTRO_EMPRESA = '/registro-empresa'
export const RUTA_REGISTRAR_NEGOCIO = '/registrar-negocio'
export const RUTA_PANEL_VENDEDOR = '/admin'

/**
 * Una puerta pública de Vender. No fusiona formularios:
 * cuenta nueva → registro-empresa; comprador logueado → registrar-negocio.
 *
 * @param {{ tokenVivo: boolean, rol?: string | null, empresaId?: number | null }} ctx
 * @returns {typeof RUTA_REGISTRO_EMPRESA | typeof RUTA_REGISTRAR_NEGOCIO | typeof RUTA_PANEL_VENDEDOR}
 */
export function destinoVender({ tokenVivo, rol, empresaId }) {
  if (!tokenVivo) return RUTA_REGISTRO_EMPRESA
  if (yaTieneNegocio(rol, empresaId)) return RUTA_PANEL_VENDEDOR
  return RUTA_REGISTRAR_NEGOCIO
}

function yaTieneNegocio(rol, empresaId) {
  if (rol === 'EMPRENDEDOR' || rol === 'ADMIN') return true
  return Boolean(empresaId) && rol !== 'USUARIO_FINAL'
}
