import type { Producto } from '@/types/producto'

/** Cuántos primeros resultados no pueden repetir categoría. */
export const PRIMEROS_SIN_CATEGORIA_REPETIDA = 3

type ProductoDiversificable = Partial<Pick<Producto, 'id' | 'empresaSlug' | 'empresaId' | 'empresaNombre' | 'categoriaId' | 'categoriaNombre'>>

/** Clave del negocio; sin negocio conocido, cada producto cuenta como uno propio. */
export function claveNegocio(p: ProductoDiversificable): string {
  const slug = p.empresaSlug?.trim()
  if (slug) return `s:${slug.toLowerCase()}`
  if (p.empresaId != null) return `i:${p.empresaId}`
  const nombre = p.empresaNombre?.trim()
  if (nombre) return `n:${nombre.toLowerCase()}`
  return `p:${String(p.id)}`
}

/** Clave de categoría, o null si el producto no tiene (no cuenta como repetida). */
export function claveCategoria(p: ProductoDiversificable): string | null {
  if (p.categoriaId != null && String(p.categoriaId) !== '') return `i:${String(p.categoriaId)}`
  const nombre = p.categoriaNombre?.trim()
  return nombre ? `n:${nombre.toLowerCase()}` : null
}

function agruparPorNegocio<T extends ProductoDiversificable>(productos: readonly T[]): Map<string, T[]> {
  const grupos = new Map<string, T[]>()
  for (const p of productos) {
    const k = claveNegocio(p)
    const g = grupos.get(k)
    if (g) g.push(p)
    else grupos.set(k, [p])
  }
  return grupos
}

/** Orden de negocios: por relevancia de su mejor producto, sin repetir categoría en los primeros 3 si se puede. */
function ordenarNegocios<T extends ProductoDiversificable>(grupos: Map<string, T[]>): string[] {
  const pendientes = [...grupos.keys()]
  const categoriaDe = (k: string) => claveCategoria(grupos.get(k)![0])
  const orden: string[] = []
  const usadas = new Set<string>()
  while (orden.length < PRIMEROS_SIN_CATEGORIA_REPETIDA && pendientes.length > 0) {
    const libre = pendientes.findIndex((k) => {
      const cat = categoriaDe(k)
      return cat === null || !usadas.has(cat)
    })
    const [k] = pendientes.splice(Math.max(libre, 0), 1) // pocas categorías: se repite antes que dejar huecos
    const cat = categoriaDe(k)
    if (cat) usadas.add(cat)
    orden.push(k)
  }
  return [...orden, ...pendientes]
}

/**
 * Reordena una lista ya ordenada por relevancia para que Descubrí no arranque con un solo negocio o categoría:
 * - primera ronda: un producto por negocio (el más relevante de cada uno);
 * - entre los primeros 3, sin categoría repetida mientras haya otro negocio que lo permita;
 * - después, round-robin por negocio en el orden de la primera ronda.
 * Mantiene el orden de relevancia dentro de cada negocio, es determinista y no pierde ni duplica productos.
 */
export function diversificarDescubri<T extends ProductoDiversificable>(productos: readonly T[]): T[] {
  const grupos = agruparPorNegocio(productos)
  const orden = ordenarNegocios(grupos)
  const rondas = Math.max(0, ...[...grupos.values()].map((g) => g.length))
  const out: T[] = []
  for (let ronda = 0; ronda < rondas; ronda++) {
    for (const k of orden) {
      const p = grupos.get(k)![ronda]
      if (p) out.push(p)
    }
  }
  return out
}
