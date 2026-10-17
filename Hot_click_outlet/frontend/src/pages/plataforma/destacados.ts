import { texto, type Fila } from './normalizar'

/**
 * Destacar negocio (admin) · handoff /workspace/diseno/extra/HANDOFF_DEV.md §1.
 * Publicidad paga: el precio lo define HOT_CLICK (PENDIENTES_DUENO #9); acá no hay montos.
 * Endpoint existente: PUT /api/admin/empresas/{id}/destacado {destacado, orden?}. La regla de quién se
 * puede destacar (Aprobado + catálogo visible) y el orden los decide el backend; el front solo refleja.
 */
export const PRECIO_DESTACADO = 'precio a definir por HOT_CLICK'
export const ETIQUETA_DESTACADO = 'Destacado · publicidad paga'
export const ETIQUETA_SIN_DESTACAR = 'Sin destacar'

export const FILTROS_DESTACADO = ['todos', 'destacados', 'sin-destacar'] as const
export type FiltroDestacado = typeof FILTROS_DESTACADO[number]

export const esDestacado = (fila: Fila) => fila.destacado === true

export function filtrarPorDestacado(filas: Fila[], filtro: string): Fila[] {
  if (filtro === 'destacados') return filas.filter(esDestacado).sort((a, b) => ordenDe(a) - ordenDe(b))
  if (filtro === 'sin-destacar') return filas.filter((f) => !esDestacado(f))
  return filas
}

export function contarDestacados(filas: Fila[]): Record<FiltroDestacado, number> {
  const destacados = filas.filter(esDestacado).length
  return { todos: filas.length, destacados, 'sin-destacar': filas.length - destacados }
}

function ordenDe(fila: Fila): number {
  const n = Number(fila.destacadoOrden)
  return Number.isFinite(n) && n > 0 ? n : Number.MAX_SAFE_INTEGER
}

export function textoOrden(fila: Fila, total?: number): string | null {
  const n = Number(fila.destacadoOrden)
  if (!Number.isFinite(n) || n <= 0) return null
  return total && total >= n ? `${n} de ${total}` : String(n)
}

export function textoDesde(valor: unknown): string | null {
  const s = texto(valor)
  if (!s) return null
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${String(d.getDate()).padStart(2, '0')}-${meses[d.getMonth()]}-${d.getFullYear()}`
}

export const confirmacionDestacado = (negocio: string, activar: boolean) => activar
  ? { titulo: `¿Destacar a ${negocio}?`, texto: `Va a aparecer en el carrusel del inicio como publicidad paga. Precio: ${PRECIO_DESTACADO}. Confirmá que el cobro ya está acordado con el negocio.`, cta: 'Sí, destacar' }
  : { titulo: `¿Quitar el destacado de ${negocio}?`, texto: 'Deja de aparecer en el carrusel del inicio desde ahora. Los otros destacados se reordenan.', cta: 'Sí, quitar' }

/** Público: solo negocios aprobados y no pausados (el backend ya filtra; esto es defensa por si llega un campo). */
export function soloPublicables<T extends { pausada?: unknown; estado?: unknown }>(lista: T[]): T[] {
  return lista.filter((n) => n.pausada !== true && (n.estado === undefined || String(n.estado).toUpperCase() === 'ACTIVO'))
}
