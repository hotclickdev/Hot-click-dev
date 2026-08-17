export const EMPTY_FORM = {
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

/**
 * @param {object[]} products
 * @returns {object[]}
 */
export function filasExportProductos(products) {
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

/**
 * @param {object} row
 * @param {number|string|null} [bodegaDefault]
 */
export function mapImportRow(row, bodegaDefault) {
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

/**
 * @param {object[]} categories
 * @param {string|number} rootId
 * @returns {Set<string>}
 */
export function idsCategoriaYDescendientes(categories, rootId) {
  const ids = new Set([String(rootId)])
  categories
    .filter((c) => String(c.padreId) === String(rootId))
    .forEach((c) => {
      idsCategoriaYDescendientes(categories, c.id).forEach((id) => ids.add(id))
    })
  return ids
}

/**
 * @param {{
 *   products: object[]
 *   search: string
 *   filterCat: string
 *   filterCond: string
 *   filterStock: string
 *   categories: object[]
 * }} args
 * @returns {object[]}
 */
export function filtrarProductos({ products, search, filterCat, filterCond, filterStock, categories }) {
  const descIds = filterCat ? idsCategoriaYDescendientes(categories, filterCat) : null
  return products.filter((p) => cumpleFiltrosProducto(p, { search, filterCond, filterStock, descIds }))
}

/**
 * @param {object} p
 * @param {{ search: string, filterCond: string, filterStock: string, descIds: Set<string>|null }} filtros
 */
function cumpleFiltrosProducto(p, { search, filterCond, filterStock, descIds }) {
  if (search && !p.nombre?.toLowerCase().includes(search.toLowerCase())) return false
  if (descIds && !descIds.has(String(p.categoriaId))) return false
  if (filterCond && p.condicion !== filterCond) return false
  if (filterStock === 'ok' && p.stock <= STOCK_BAJO_MAX) return false
  if (filterStock === 'low' && (p.stock === 0 || p.stock > STOCK_BAJO_MAX)) return false
  if (filterStock === 'out' && p.stock !== 0) return false
  return true
}

/**
 * @param {object} p
 * @param {object[]} bodegas
 */
export function formDesdeProducto(p, bodegas) {
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

/** @param {string} nombre */
export function metaTitleAuto(nombre) {
  return nombre ? `${nombre} | HotClick Outlet`.slice(0, 60) : ''
}

/**
 * @param {string} descripcion
 * @param {string|number} precioVenta
 */
export function metaDescriptionAuto(descripcion, precioVenta) {
  const precio = precioVenta ? Number(precioVenta).toLocaleString('es-CR') : ''
  const base = descripcion || ''
  if (!base) return ''
  return `${base}${precio ? ` | Precio: ₡${precio}` : ''} | Envíos a todo Costa Rica`.slice(0, 160)
}

/**
 * @param {string|number} precioCompra
 * @param {string|number} precioVenta
 * @returns {{ monto: number, pct: string|null, positivo: boolean }}
 */
export function margenForm(precioCompra, precioVenta) {
  const compra = Number(precioCompra)
  const venta = Number(precioVenta)
  const monto = venta - compra
  return {
    monto,
    pct: compra > 0 ? ((monto / compra) * 100).toFixed(1) : null,
    positivo: venta > compra,
  }
}
