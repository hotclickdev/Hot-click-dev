import type { Producto } from '@/types/producto'

/** Figma `9:218`: la fila de destacados del hero desktop muestra 4. */
export const MAX_DESTACADOS = 4
/** Figma `9:388`: "Nuevos en HotClick" muestra 6 en desktop y 4 en móvil. */
export const MAX_NUEVOS = 6
export const MAX_CATEGORIAS_HOME = 6
export const MAX_VISTOS = 4

export const CONSULTAS_ASISTENTE = [
  'home.compra.consulta1',
  'home.compra.consulta2',
  'home.compra.consulta3',
] as const

export function conStock(productos: Producto[]): Producto[] {
  return productos.filter((p) => (p.stock ?? 0) > 0)
}

/** Destacados con stock; si faltan, se completa con otros productos para no dejar huecos. */
export function elegirDestacados(destacados: Producto[], catalogo: Producto[], max = MAX_DESTACADOS): Producto[] {
  const elegidos = conStock(destacados).slice(0, max)
  if (elegidos.length >= max) return elegidos
  const ids = new Set(elegidos.map((p) => p.id))
  const relleno = conStock(catalogo).filter((p) => !ids.has(p.id))
  return [...elegidos, ...relleno].slice(0, max)
}

/** Productos del catálogo que no aparecen ya en destacados, más recientes primero. */
export function elegirNuevos(catalogo: Producto[], excluir: Producto[], max = MAX_NUEVOS): Producto[] {
  const ids = new Set(excluir.map((p) => p.id))
  return conStock(catalogo)
    .filter((p) => !ids.has(p.id))
    .sort((a, b) => fechaMs(b) - fechaMs(a))
    .slice(0, max)
}

function fechaMs(p: Producto): number {
  const valor = (p as { fechaCreacion?: string | null }).fechaCreacion
  const ms = valor ? Date.parse(valor) : Number.NaN
  return Number.isNaN(ms) ? 0 : ms
}
