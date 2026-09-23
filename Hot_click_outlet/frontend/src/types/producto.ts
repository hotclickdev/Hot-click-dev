import type { Id } from './api'

export type ProductoRelacion = {
  id?: number
  nombreCategoria?: string
  nombre?: string
  nombreBodega?: string
  permiteRetiroCliente?: boolean
  direccionExacta?: string
  telefono?: string
  nombreMarca?: string
  logoUrl?: string
}

/** Campos que manda el backend (nombres de entidad JPA). */
export type ProductoBackend = {
  id?: number
  nombreProducto?: string
  nombre?: string
  barcode?: string | null
  sku?: string | null
  precioVenta?: number
  precio?: number
  precioCompra?: number
  stockActual?: number
  stock?: number
  imagenPrincipalUrl?: string
  imagenUrl?: string
  descripcionCorta?: string
  descripcionLarga?: string
  descripcion?: string
  categoria?: ProductoRelacion
  categoriaId?: Id
  categoriaNombre?: string
  bodega?: ProductoRelacion
  bodegaId?: Id
  bodegaNombre?: string
  bodegaPermiteRetiro?: boolean
  bodegaDireccion?: string
  bodegaTelefono?: string
  marca?: ProductoRelacion
  marcaId?: number | null
  marcaTexto?: string
  marcaNombre?: string
  marcaLogoUrl?: string | null
  destacado?: boolean
  enOferta?: boolean
  precioOferta?: number | null
  porcentajeDescuento?: number | null
  enCarrusel?: boolean
  ordenCarrusel?: number
  tituloProducto?: string
  titulo?: string | null
  especificaciones?: string | null
  comoUsar?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  metaKeywords?: string | null
  tags?: string
  fechaUltimaVenta?: string | null
  visibleCatalogo?: boolean
  metaTitleEn?: string | null
  metaTitlePt?: string | null
  metaTitleFr?: string | null
  metaDescriptionEn?: string | null
  metaDescriptionPt?: string | null
  metaDescriptionFr?: string | null
  videoUrl?: string | null
  empresaNombre?: string | null
  empresaSlug?: string | null
  empresaId?: number | null
  talla?: string | null
  garantiaDias?: number
  grupoVarianteId?: number | null
  colorVariante?: string | null
  condicion?: string
  esPersonalizado?: boolean
  modoPrecioPersonalizado?: 'FIJO' | 'RANGO' | 'COTIZACION' | string | null
  precioPersonalizadoMin?: number | null
  precioPersonalizadoMax?: number | null
  instruccionesPersonalizacion?: string | null
}

/** Forma canónica en el frontend tras `normalizeProduct`. */
export type Producto = ProductoBackend & {
  nombre: string
  barcode: string | null
  sku: string | null
  precio: number
  precioCompra: number
  precioVenta: number
  stock: number
  imagenUrl: string
  descripcion: string
  categoriaId: Id | ''
  categoriaNombre: string
  bodegaId: Id | ''
  bodegaNombre: string
  bodegaPermiteRetiro: boolean
  bodegaDireccion: string
  bodegaTelefono: string
  marcaId: number | null
  marcaNombre: string
  marcaLogoUrl: string | null
  destacado: boolean
  enOferta: boolean
  precioOferta: number | null
  porcentajeDescuento: number | null
  enCarrusel: boolean
  ordenCarrusel: number
  titulo: string | null
  especificaciones: string | null
  comoUsar: string | null
  metaTitle: string | null
  metaDescription: string | null
  metaKeywords: string | null
  tags: string
  fechaUltimaVenta: string | null
  visibleCatalogo: boolean
  videoUrl: string | null
  empresaNombre: string | null
  empresaSlug: string | null
  empresaId?: number | null
  talla: string | null
  garantiaDias: number
  grupoVarianteId: number | null
  colorVariante: string | null
  esPersonalizado: boolean
  modoPrecioPersonalizado: string | null
  precioPersonalizadoMin: number | null
  precioPersonalizadoMax: number | null
  instruccionesPersonalizacion: string | null
}

/** Campos de formulario admin / wizard hacia `denormalizeProduct`. */
export type ProductoForm = {
  nombre?: string
  descripcion?: string
  precioCompra?: number | string
  precioVenta?: number | string
  precio?: number | string
  stock?: number | string
  condicion?: string
  categoriaId?: Id | null
  bodegaId?: Id | null
  imagenUrl?: string | null
  destacado?: boolean
  titulo?: string | null
  especificaciones?: string | null
  comoUsar?: string | null
  marcaId?: Id | null
  marcaTexto?: string | null
  marca?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  metaKeywords?: string | null
  metaTitleEn?: string | null
  metaTitlePt?: string | null
  metaTitleFr?: string | null
  metaDescriptionEn?: string | null
  metaDescriptionPt?: string | null
  metaDescriptionFr?: string | null
  videoUrl?: string | null
  talla?: string | null
  garantiaDias?: number | string
  sku?: string | null
  barcode?: string | null
  tags?: string | null
  esPersonalizado?: boolean
  modoPrecioPersonalizado?: string | null
  precioPersonalizadoMin?: number | string | null
  precioPersonalizadoMax?: number | string | null
  instruccionesPersonalizacion?: string | null
}
