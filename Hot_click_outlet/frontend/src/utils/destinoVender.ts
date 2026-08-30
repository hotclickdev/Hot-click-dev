import { RUTA_EMPRENDEDOR, rutaPanelPorRol } from '@/utils/planPaths'

export const RUTA_REGISTRO_EMPRESA = '/registro-empresa'
export const RUTA_REGISTRAR_NEGOCIO = '/registrar-negocio'
export const RUTA_PANEL_VENDEDOR = RUTA_EMPRENDEDOR

/**
 * Una puerta pública de Vender. No fusiona formularios:
 * cuenta nueva → registro-empresa; comprador logueado → registrar-negocio.
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
