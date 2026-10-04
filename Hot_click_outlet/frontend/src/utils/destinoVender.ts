import { RUTA_EMPRENDEDOR, rutaPanelPorRol } from '@/utils/planPaths'

export const RUTA_REGISTRO_EMPRESA = '/registro-empresa'
export const RUTA_REGISTRAR_NEGOCIO = '/registrar-negocio'
export const RUTA_PANEL_VENDEDOR = RUTA_EMPRENDEDOR

/**
 * Una puerta pública de Vender.
 * Sin sesión → registro-empresa. Con sesión y sin negocio → registrar-negocio,
 * que entra al mismo alta sin pedir cuenta de nuevo. Con negocio → panel.
 */
export function destinoVender({ tokenVivo, rol, empresaId, planNombre }: {
  tokenVivo: boolean
  rol?: string | null
  empresaId?: number | null
  planNombre?: string | null
}) {
  if (!tokenVivo) return RUTA_REGISTRO_EMPRESA
  if (yaTieneNegocio(rol, empresaId)) return rutaPanelPorRol(rol, planNombre)
  return RUTA_REGISTRAR_NEGOCIO
}

function yaTieneNegocio(rol: string | null | undefined, empresaId: number | null | undefined) {
  if (rol === 'EMPRENDEDOR' || rol === 'ADMIN') return true
  return Boolean(empresaId) && rol !== 'USUARIO_FINAL'
}
