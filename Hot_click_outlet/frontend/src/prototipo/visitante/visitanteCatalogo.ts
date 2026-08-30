import type { NegocioVisitante, ProductoVisitante } from './visitanteMock'

export function productosDeNegocio(
  id: string | undefined,
  productos: ProductoVisitante[],
): ProductoVisitante[] {
  if (!id) return []
  return productos.filter((item) => item.negocioId === id)
}

export function negocioDesdeProductos(
  id: string,
  deTienda: ProductoVisitante[],
): NegocioVisitante | null {
  if (deTienda.length === 0) return null
  const nombre = deTienda[0].negocio
  return {
    id,
    nombre,
    inicial: nombre.slice(0, 1).toUpperCase(),
    plan: 'EMPRENDIMIENTO',
    rubro: deTienda[0].categoria,
    detalle: '',
    rating: 0,
    productos: deTienda.length,
    bio: '',
  }
}

export function negociosUnicos(productos: ProductoVisitante[]): NegocioVisitante[] {
  const porId = new Map<string, ProductoVisitante[]>()
  for (const item of productos) {
    const lista = porId.get(item.negocioId) ?? []
    lista.push(item)
    porId.set(item.negocioId, lista)
  }
  return [...porId.entries()]
    .map(([id, items]) => negocioDesdeProductos(id, items))
    .filter((negocio): negocio is NegocioVisitante => negocio != null)
}
