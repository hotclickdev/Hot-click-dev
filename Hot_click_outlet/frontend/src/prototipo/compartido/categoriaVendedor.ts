export type CategoriaVendedor = {
  id: number | string
  nombreCategoria?: string
  nombre?: string
}

export function listaCategoriasVendedor(data: unknown): CategoriaVendedor[] {
  if (Array.isArray(data)) return data as CategoriaVendedor[]
  if (data && typeof data === 'object' && 'data' in data) {
    const inner = (data as { data?: unknown }).data
    return Array.isArray(inner) ? inner as CategoriaVendedor[] : []
  }
  return []
}

export function nombreCategoriaVendedor(cat: CategoriaVendedor): string {
  const nombre = cat.nombreCategoria || cat.nombre || ''
  return nombre.trim() || 'Categoría'
}

export function idCategoriaValido(categoriaId: string | undefined): string | null {
  if (!categoriaId) return null
  const n = Number(categoriaId)
  if (!Number.isFinite(n) || n < 1) return null
  return String(n)
}
