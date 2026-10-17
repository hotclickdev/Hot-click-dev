import type { Producto } from '@/types/producto'
import { listaProductosDesdePagina, marcaEsLaTienda } from './productoHelpers'

/** De dónde salen los productos de "Más de {marca}": la marca del producto o, si no hay, la tienda. */
export type FuenteMasDeLaMarca =
  | { tipo: 'marca'; clave: string; marcaId: NonNullable<Producto['marcaId']>; nombre: string; verTodos: string }
  | { tipo: 'tienda'; clave: string; slug: string; nombre: string; verTodos: string }

/**
 * Marca propia (con id y nombre, distinta del nombre de la tienda) → catálogo de la marca.
 * Si no, la tienda del producto (`empresaSlug`). Sin ninguna de las dos no hay fila.
 */
export function fuenteMasDeLaMarca(
  product: Pick<Producto, 'marcaId' | 'marcaNombre' | 'empresaNombre' | 'empresaSlug'> | null | undefined,
): FuenteMasDeLaMarca | null {
  if (!product) return null
  const marca = product.marcaNombre?.trim()
  if (product.marcaId != null && marca && !marcaEsLaTienda(product)) {
    return {
      tipo: 'marca',
      clave: `marca:${product.marcaId}`,
      marcaId: product.marcaId,
      nombre: marca,
      verTodos: `/productos?marcaId=${encodeURIComponent(String(product.marcaId))}&marcaNombre=${encodeURIComponent(marca)}`,
    }
  }
  const slug = product.empresaSlug?.trim()
  const tienda = product.empresaNombre?.trim()
  if (slug && tienda) {
    return { tipo: 'tienda', clave: `tienda:${slug}`, slug, nombre: tienda, verTodos: `/tienda/${encodeURIComponent(slug)}` }
  }
  return null
}

/** Productos de la página que devolvió la API, sin el producto actual. */
export function productosMasDeLaMarca(data: unknown, actualId: Producto['id']): Producto[] {
  return listaProductosDesdePagina(data).filter((p) => String(p.id) !== String(actualId))
}

/**
 * "Ver los N": N es el catálogo entero de la tienda (NP-20), porque el enlace abre la tienda y ahí
 * también está el producto actual. Sin total de la API: los visibles más el actual.
 */
export function totalMasDeLaMarca(data: unknown, visibles: number): number {
  const total = data && typeof data === 'object' && 'totalElements' in data ? Number((data as { totalElements: unknown }).totalElements) : NaN
  return Number.isFinite(total) && total > 0 ? Math.max(visibles + 1, total) : visibles + 1
}

/** Iniciales para el chip de la marca: "Joyería Valeria" → "JV". */
export function inicialesMarca(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter((p) => /\p{L}/u.test(p[0] ?? ''))
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}
