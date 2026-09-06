import type { Id } from '@/types/api'

export const TABS = [
  { id: 'url', label: 'URL del sitio' },
  { id: 'pdf', label: 'Catálogo PDF' },
  { id: 'csv', label: 'Archivo CSV' },
] as const

export type ImportarTabId = (typeof TABS)[number]['id']

export const CONDICIONES = [
  { value: 'NUEVO',      label: 'Nuevo'      },
  { value: 'COMO_NUEVO', label: 'Como nuevo' },
  { value: 'USADO',      label: 'Usado'      },
] as const

export type CategoriaImportar = {
  id: Id
  nombreCategoria?: string
}

export type MarcaImportar = {
  id: Id
  nombreMarca?: string
}

export type BodegaImportar = {
  id: Id
  nombre?: string
  nombreBodega?: string
}

export type EmpresaImportar = {
  id: Id
  nombreComercial?: string
  nombreEmpresa?: string
  slug?: string
  logoUrl?: string | null
}

export type ProductoImportado = {
  _id: number
  _sel: boolean
  _ventaFmt?: string
  _costoFmt?: string
  _colorLabel?: string | null
  _colorHex?: string | null
  nombreProducto?: string
  descripcionCorta?: string
  imagenPrincipalUrl?: string | null
  marcaTexto?: string | null
  precioVenta?: number
  precioCompra?: number
  categoriaId?: number | null
  marcaId?: number | null
  bodegaId?: number | null
  stockActual?: number | string
  condicion?: string
  grupoVarianteId?: string | null
  colorVariante?: string | null
}

export type ChipCategoriaImportar = {
  id: string
  label: string
  cantidad: number
}

export type GrupoCategoriaImportar = {
  categoriaId: number | null
  label: string
  productos: ProductoImportado[]
}

export type ToastImportar = (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void

export function fuenteDesdeParam(raw: string | null | undefined): ImportarTabId {
  if (raw === 'url' || raw === 'pdf' || raw === 'csv') return raw
  return 'url'
}

export function nombreCategoriaImportar(
  categorias: CategoriaImportar[],
  categoriaId: number | null | undefined,
): string {
  if (categoriaId == null) return 'Sin categoría'
  const cat = categorias.find((c) => Number(c.id) === Number(categoriaId))
  return cat?.nombreCategoria?.trim() || `Categoría ${categoriaId}`
}

/** Agrupa productos por categoría para la vista de revisión del catálogo. */
export function agruparProductosPorCategoria(
  productos: ProductoImportado[],
  categorias: CategoriaImportar[],
): GrupoCategoriaImportar[] {
  const mapa = new Map<string, GrupoCategoriaImportar>()
  for (const p of productos) {
    const categoriaId = p.categoriaId ?? null
    const key = categoriaId == null ? 'sin' : String(categoriaId)
    const existente = mapa.get(key)
    if (existente) {
      existente.productos.push(p)
      continue
    }
    mapa.set(key, {
      categoriaId,
      label: nombreCategoriaImportar(categorias, categoriaId),
      productos: [p],
    })
  }
  return [...mapa.values()].sort((a, b) => {
    if (a.categoriaId == null) return 1
    if (b.categoriaId == null) return -1
    return a.label.localeCompare(b.label, 'es')
  })
}

/** Chips de filtro: Todas + categorías presentes en los productos. */
export function chipsCategoriaImportar(
  productos: ProductoImportado[],
  categorias: CategoriaImportar[],
): ChipCategoriaImportar[] {
  const chips: ChipCategoriaImportar[] = [
    { id: 'todas', label: 'Todas', cantidad: productos.length },
  ]
  const grupos = agruparProductosPorCategoria(productos, categorias)
  for (const g of grupos) {
    chips.push({
      id: g.categoriaId == null ? 'sin' : String(g.categoriaId),
      label: g.label,
      cantidad: g.productos.length,
    })
  }
  return chips
}

export function filtrarProductosPorChip(
  productos: ProductoImportado[],
  chipId: string,
): ProductoImportado[] {
  if (chipId === 'todas') return productos
  if (chipId === 'sin') return productos.filter((p) => p.categoriaId == null)
  const id = Number(chipId)
  return productos.filter((p) => Number(p.categoriaId) === id)
}

export function fmtColones(v: number | string | null | undefined): string {
  return (v || v === 0) ? Number(v).toLocaleString('es-CR') : ''
}

export function parseColones(str: string | null | undefined): number {
  return parseInt(String(str ?? '').replace(/[^0-9]/g, ''), 10) || 0
}

export function innerData(data: unknown): unknown {
  if (data && typeof data === 'object' && 'data' in data) return (data as { data?: unknown }).data
  return undefined
}

export function mensajeErrorImportar(err: unknown, respaldo: string): string {
  if (typeof err !== 'object' || err === null || !('response' in err)) return respaldo
  const data = (err as { response?: { data?: { message?: unknown; error?: unknown } } }).response?.data
  if (data && typeof data === 'object') {
    if (typeof data.message === 'string' && data.message) return data.message
    if (typeof data.error === 'string' && data.error) return data.error
  }
  return respaldo
}
