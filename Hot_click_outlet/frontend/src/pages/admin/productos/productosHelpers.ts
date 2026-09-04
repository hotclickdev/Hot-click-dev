import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { Id } from '@/types/api'
import type { Producto, ProductoForm } from '@/types/producto'
import { mapearErrorBackend, type AccionError } from '@/services/errorMapper'

export type ProductoAdmin = Producto & { id: number }

export type CategoriaAdmin = {
  id: Id
  nombreCategoria?: string
  nombre?: string
  padreId?: Id | null
}

export type BodegaAdmin = {
  id: Id
  nombreBodega?: string
  nombre?: string
}

export type MarcaAdmin = {
  id: Id
  nombreMarca?: string
}

/** Formulario del modal admin: `ProductoForm` más `imagenes` y valores siempre presentes. */
export type AdminProductoForm = ProductoForm & {
  nombre: string
  titulo: string
  descripcion: string
  precioCompra: number | string
  precioVenta: number | string
  stock: number | string
  condicion: string
  categoriaId: Id | ''
  marcaId: Id | ''
  imagenUrl: string
  bodegaId: Id | ''
  destacado: boolean
  especificaciones: string
  comoUsar: string
  imagenes: string[]
  metaTitle: string
  metaDescription: string
  metaKeywords: string
  videoUrl: string
}

export type DeleteTargetProducto = { id: number; nombre: string }

export type ToastAdminProductos = (opts: {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  accion?: { label: string; onClick: () => void }
}) => void

export type AdminProductsActionsDeps = {
  prodPage: number
  bodegas: BodegaAdmin[]
  products: ProductoAdmin[]
  carruselSlots: ProductoAdmin[]
  form: AdminProductoForm
  editing: ProductoAdmin | null
  deleteTarget: DeleteTargetProducto | null
  editInitialFormRef: MutableRefObject<string | null>
  toast: ToastAdminProductos
  setProducts: Dispatch<SetStateAction<ProductoAdmin[]>>
  setTotalProds: Dispatch<SetStateAction<number>>
  setCategories: Dispatch<SetStateAction<CategoriaAdmin[]>>
  setBodegas: Dispatch<SetStateAction<BodegaAdmin[]>>
  setMarcas: Dispatch<SetStateAction<MarcaAdmin[]>>
  setLoading: Dispatch<SetStateAction<boolean>>
  setLoadError: Dispatch<SetStateAction<boolean>>
  setEditing: Dispatch<SetStateAction<ProductoAdmin | null>>
  setForm: Dispatch<SetStateAction<AdminProductoForm>>
  setModalOpen: Dispatch<SetStateAction<boolean>>
  setSaving: Dispatch<SetStateAction<boolean>>
  setDeleteTarget: Dispatch<SetStateAction<DeleteTargetProducto | null>>
  setSeoAutoTitle: Dispatch<SetStateAction<boolean>>
  setSeoAutoDesc: Dispatch<SetStateAction<boolean>>
  setSeoOpen: Dispatch<SetStateAction<boolean>>
  setShowDiscardModal: Dispatch<SetStateAction<boolean>>
}

export type FilaImportProducto = {
  nombre?: string
  nombreProducto?: string
  precioCompra?: string | number
  precioVenta?: string | number
  stock?: string | number
  stockActual?: string | number
  condicion?: string
  categoriaId?: string | number
  bodegaId?: string | number
  marcaId?: string | number
  descripcion?: string
  descripcionCorta?: string
}

export const EMPTY_FORM: AdminProductoForm = {
  nombre: '', titulo: '', descripcion: '',
  precioCompra: '', precioVenta: '', stock: '',
  condicion: 'NUEVO', categoriaId: '', marcaId: '', imagenUrl: '', bodegaId: '', destacado: false,
  especificaciones: '', comoUsar: '', imagenes: [],
  metaTitle: '', metaDescription: '', metaKeywords: '',
  videoUrl: '', sku: '', barcode: '',
}

export const STOCK_OPTIONS = [
  { label: 'Todos', value: '' },
  { label: 'En stock', value: 'ok' },
  { label: 'Stock bajo (≤3)', value: 'low' },
  { label: 'Agotado', value: 'out' },
]

export const PROD_PAGE_SIZE = 50

/** Días sin venta para marcar un producto como “no se vende”. */
export const DIAS_MOVIMIENTO_ACTIVO = 30

/** Descuento rápido desde la lista emprendedor (HOTCLICK revisa). */
export const PCT_OFERTA_RAPIDA = 15

export const COLUMNAS_EXPORT = [
  'nombre', 'precioCompra', 'precioVenta', 'stock', 'condicion',
  'categoriaId', 'categoriaNombre', 'bodegaId', 'bodegaNombre',
  'marcaId', 'marcaNombre', 'destacado', 'descripcion',
]

export const COLUMNAS_IMPORT = [
  'nombre', 'precioCompra', 'precioVenta', 'stock', 'condicion',
  'categoriaId', 'bodegaId', 'marcaId', 'descripcion',
]

const STOCK_BAJO_MAX = 3

export function filasExportProductos(products: ProductoAdmin[]) {
  return products.map((p) => ({
    nombre: p.nombre,
    precioCompra: p.precioCompra,
    precioVenta: p.precioVenta,
    stock: p.stock,
    condicion: p.condicion,
    categoriaId: p.categoriaId,
    categoriaNombre: p.categoriaNombre,
    bodegaId: p.bodegaId,
    bodegaNombre: p.bodegaNombre,
    marcaId: p.marcaId ?? '',
    marcaNombre: p.marcaNombre ?? '',
    destacado: p.destacado ? 'SI' : 'NO',
    descripcion: p.descripcion ?? '',
  }))
}

export function mapImportRow(row: FilaImportProducto, bodegaDefault?: Id | null) {
  return {
    nombreProducto: row.nombre ?? row.nombreProducto ?? '',
    precioCompra: Number(row.precioCompra) || 0,
    precioVenta: Number(row.precioVenta) || 0,
    stockActual: Number(row.stock ?? row.stockActual) || 0,
    condicion: row.condicion ?? 'NUEVO',
    categoriaId: row.categoriaId ? Number(row.categoriaId) : null,
    bodegaId: row.bodegaId ? Number(row.bodegaId) : (bodegaDefault ?? null),
    marcaId: row.marcaId ? Number(row.marcaId) : null,
    descripcionCorta: row.descripcion ?? row.descripcionCorta ?? '',
    visibleCatalogo: true,
  }
}

export function idsCategoriaYDescendientes(categories: CategoriaAdmin[], rootId: Id): Set<string> {
  const ids = new Set([String(rootId)])
  categories
    .filter((c) => String(c.padreId) === String(rootId))
    .forEach((c) => {
      idsCategoriaYDescendientes(categories, c.id).forEach((id) => ids.add(id))
    })
  return ids
}

export function filtrarProductos({
  products,
  search,
  filterCat,
  filterCond,
  filterStock,
  categories,
}: {
  products: ProductoAdmin[]
  search: string
  filterCat: string
  filterCond: string
  filterStock: string
  categories: CategoriaAdmin[]
}): ProductoAdmin[] {
  const descIds = filterCat ? idsCategoriaYDescendientes(categories, filterCat) : null
  return products.filter((p) => cumpleFiltrosProducto(p, { search, filterCond, filterStock, descIds }))
}

function cumpleFiltrosProducto(p: ProductoAdmin, {
  search,
  filterCond,
  filterStock,
  descIds,
}: {
  search: string
  filterCond: string
  filterStock: string
  descIds: Set<string> | null
}) {
  if (search && !p.nombre?.toLowerCase().includes(search.toLowerCase())) return false
  if (descIds && !descIds.has(String(p.categoriaId))) return false
  if (filterCond && p.condicion !== filterCond) return false
  if (filterStock === 'ok' && p.stock <= STOCK_BAJO_MAX) return false
  if (filterStock === 'low' && (p.stock === 0 || p.stock > STOCK_BAJO_MAX)) return false
  if (filterStock === 'out' && p.stock !== 0) return false
  return true
}

export function formDesdeProducto(p: ProductoAdmin, bodegas: BodegaAdmin[]): AdminProductoForm {
  return {
    nombre: p.nombre ?? '',
    titulo: p.titulo ?? '',
    descripcion: p.descripcion ?? '',
    precioCompra: p.precioCompra ?? '',
    precioVenta: p.precioVenta ?? p.precio ?? '',
    stock: p.stock ?? '',
    condicion: p.condicion ?? 'NUEVO',
    categoriaId: p.categoriaId ?? '',
    marcaId: p.marcaId ? String(p.marcaId) : '',
    imagenUrl: p.imagenUrl ?? '',
    bodegaId: p.bodegaId ?? bodegas[0]?.id ?? '',
    destacado: p.destacado ?? false,
    especificaciones: p.especificaciones ?? '',
    comoUsar: p.comoUsar ?? '',
    imagenes: p.imagenUrl ? [p.imagenUrl] : [],
    metaTitle: p.metaTitle ?? '',
    metaDescription: p.metaDescription ?? '',
    metaKeywords: p.metaKeywords ?? '',
    videoUrl: p.videoUrl ?? '',
  }
}

export function metaTitleAuto(nombre: string) {
  return nombre ? `${nombre} | HotClick Outlet`.slice(0, 60) : ''
}

export function metaDescriptionAuto(descripcion: string, precioVenta: string | number) {
  const precio = precioVenta ? Number(precioVenta).toLocaleString('es-CR') : ''
  const base = descripcion || ''
  if (!base) return ''
  return `${base}${precio ? ` | Precio: ₡${precio}` : ''} | Envíos a todo Costa Rica`.slice(0, 160)
}

export function etiquetaMovimiento(producto: ProductoAdmin) {
  const fecha = producto.fechaUltimaVenta
  if (!fecha) return 'No se vende'
  const dias = (Date.now() - new Date(fecha).getTime()) / 86_400_000
  return dias <= DIAS_MOVIMIENTO_ACTIVO ? 'Se vende' : 'No se vende'
}

export function margenForm(precioCompra: string | number, precioVenta: string | number) {
  const compra = Number(precioCompra)
  const venta = Number(precioVenta)
  const monto = venta - compra
  return {
    monto,
    pct: compra > 0 ? ((monto / compra) * 100).toFixed(1) : null,
    positivo: venta > compra,
  }
}

export function mensajeErrorProducto(err: unknown, fallback: string): string {
  return mapearErrorBackend(err, fallback).mensaje
}

/** Acción de upgrade (ej. al chocar con un límite de plan) para ofrecer un CTA en el toast de error. */
export function accionErrorProducto(err: unknown): AccionError | undefined {
  return mapearErrorBackend(err, '').accion
}

export function idDesdeRespuestaProducto(data: unknown): Id | undefined {
  if (!data || typeof data !== 'object') return undefined
  const cuerpo = data as { id?: unknown; data?: { id?: unknown } }
  const directo = cuerpo.id
  if (typeof directo === 'number' || typeof directo === 'string') return directo
  const anidado = cuerpo.data?.id
  if (typeof anidado === 'number' || typeof anidado === 'string') return anidado
  return undefined
}

export function urlsDesdeImagenes(imgs: unknown): string[] {
  if (!Array.isArray(imgs)) return []
  return imgs.map((item) => {
    if (typeof item === 'string') return item
    if (item && typeof item === 'object' && 'urlImagen' in item) {
      const url = (item as { urlImagen?: unknown }).urlImagen
      if (typeof url === 'string') return url
    }
    return typeof item === 'string' ? item : ''
  })
}
