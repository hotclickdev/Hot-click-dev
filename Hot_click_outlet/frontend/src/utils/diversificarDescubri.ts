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

/**
 * Reordena una lista ya ordenada por relevancia para que Descubrí no arranque con un solo negocio o categoría:
 * - primera ronda: un producto por negocio (el más relevante de cada uno);
 * - entre los primeros 3, sin categoría repetida mientras haya otro negocio que lo permita;
 * - después, round-robin por negocio en el orden de la primera ronda.
 * Mantiene el orden de relevancia dentro de cada negocio, es determinista y no pierde ni duplica productos.
 */
export function diversificarDescubri<T extends ProductoDiversificable>(productos: readonly T[]): T[] {
  const grupos = new Map<string, T[]>()
  for (const p of productos) {
    const k = claveNegocio(p)
    const g = grupos.get(k)
    if (g) g.push(p)
    else grupos.set(k, [p])
  }

  // Orden de negocios en la primera ronda: por relevancia de su mejor producto, con la regla de categoría al inicio.
  const pendientes = [...grupos.keys()]
  const orden: string[] = []
  const categoriasUsadas = new Set<string>()
  while (orden.length < PRIMEROS_SIN_CATEGORIA_REPETIDA && pendientes.length > 0) {
    let idx = pendientes.findIndex((k) => {
      const cat = claveCategoria(grupos.get(k)![0])
      return cat === null || !categoriasUsadas.has(cat)
    })
    if (idx < 0) idx = 0 // pocas categorías: se repite antes que dejar huecos
    const [k] = pendientes.splice(idx, 1)
    const cat = claveCategoria(grupos.get(k)![0])
    if (cat) categoriasUsadas.add(cat)
    orden.push(k)
  }
  orden.push(...pendientes)

  const out: T[] = []
  for (let ronda = 0; out.length < productos.length; ronda++) {
    for (const k of orden) {
      const p = grupos.get(k)![ronda]
      if (p) out.push(p)
    }
  }
  return out
}
