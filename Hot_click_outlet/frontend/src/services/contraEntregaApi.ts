import api from '@/services/api'

/**
 * S2 · Contra entrega por negocio. Contrato real de #211 (`docs/contratos/S2-contra-entrega-por-negocio.md`), que coincide con
 * los supuestos 1 y 2. En productos públicos los campos se OMITEN cuando no hay valor (nunca null): sin campo → config global.
 * El supuesto 3 (`contraEntregaCargoPorNegocio`) NO existe todavía (falta el monto del dueño): sin campo, no se muestra cargo.
 * Todo lo que depende del servidor vive acá para cambiarlo en un solo lugar cuando exista.
 *
 * Supuestos:
 * 1. Cada producto público trae, del negocio dueño:
 *      empresaAceptaContraEntrega?: boolean    (sin el campo = backend viejo → manda la config global)
 *      empresaContraEntregaMinimo?: number|null (₡; null o ausente = sin mínimo)
 * 2. Configuración del negocio (panel):
 *      GET  /api/negocio/contra-entrega → { acepta: boolean, minimo: number | null }
 *      PUT  /api/negocio/contra-entrega   { acepta: boolean, minimo: number | null } → mismo cuerpo
 * 3. Cargo (decisión del dueño, 16-oct-2026): por pedido y POR NEGOCIO. Llega en la config del checkout:
 *      GET /api/public/checkout-config → { contraEntregaNormal, contraEntregaCargoPorNegocio: number }
 *    El monto no se escribe en el front; el total final lo calcula el backend.
 */
export type ConfigContraEntrega = { acepta: boolean; minimo: number | null }

export type ItemContraEntrega = {
  empresaAceptaContraEntrega?: boolean
  empresaContraEntregaMinimo?: number | null
}

export const RUTA_CONFIG_CONTRA_ENTREGA = '/negocio/contra-entrega'

function normalizar(data: unknown): ConfigContraEntrega {
  const d = (data && typeof data === 'object' && 'data' in data ? (data as { data: unknown }).data : data) as Partial<ConfigContraEntrega> | null
  const minimo = typeof d?.minimo === 'number' && d.minimo > 0 ? d.minimo : null
  return { acepta: d?.acepta === true, minimo }
}

export const contraEntregaApi = {
  obtener: () => api.get(RUTA_CONFIG_CONTRA_ENTREGA).then((r) => normalizar(r.data)),
  guardar: (config: ConfigContraEntrega) => api.put(RUTA_CONFIG_CONTRA_ENTREGA, config).then((r) => normalizar(r.data)),
}
