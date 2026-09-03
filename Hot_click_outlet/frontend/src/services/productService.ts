import type { AxiosRequestConfig } from 'axios'
import api from './api'
import type { Id } from '@/types/api'
import type { Producto, ProductoBackend, ProductoForm } from '@/types/producto'

function esPagina(data: unknown): data is { content: ProductoBackend[] } {
  return !!data && typeof data === 'object' && 'content' in data
    && Array.isArray((data as { content: unknown }).content)
}

// Maps backend Producto fields → consistent frontend names used everywhere
export function normalizeProduct(p: ProductoBackend | null | undefined): Producto | null | undefined {
  if (!p) return p
  return {
    ...p,
    nombre: p.nombreProducto ?? p.nombre ?? '',
    barcode: p.barcode ?? null,
    sku: p.sku ?? null,
    precio: p.precioVenta ?? p.precio ?? 0,
    precioCompra: p.precioCompra ?? 0,
    precioVenta: p.precioVenta ?? p.precio ?? 0,
    stock: p.stockActual ?? p.stock ?? 0,
    imagenUrl: p.imagenPrincipalUrl ?? p.imagenUrl ?? '',
    descripcion: p.descripcionCorta ?? p.descripcionLarga ?? p.descripcion ?? '',
    categoriaId: p.categoria?.id ?? p.categoriaId ?? '',
    categoriaNombre: p.categoria?.nombreCategoria ?? p.categoria?.nombre ?? p.categoriaNombre ?? '',
    bodegaId: p.bodega?.id ?? p.bodegaId ?? '',
    bodegaNombre: p.bodega?.nombreBodega ?? p.bodega?.nombre ?? p.bodegaNombre ?? '',
    bodegaPermiteRetiro: p.bodega?.permiteRetiroCliente ?? p.bodegaPermiteRetiro ?? false,
    bodegaDireccion: p.bodega?.direccionExacta ?? p.bodegaDireccion ?? '',
    bodegaTelefono: p.bodega?.telefono ?? p.bodegaTelefono ?? '',
    marcaId: p.marca?.id ?? p.marcaId ?? null,
    marcaNombre: p.marca?.nombreMarca ?? p.marcaTexto ?? p.marcaNombre ?? '',
    marcaLogoUrl: p.marca?.logoUrl ?? p.marcaLogoUrl ?? null,
    destacado: p.destacado ?? false,
    enOferta: p.enOferta ?? false,
    precioOferta: p.precioOferta ?? null,
    porcentajeDescuento: p.porcentajeDescuento ?? null,
    enCarrusel: p.enCarrusel ?? false,
    ordenCarrusel: p.ordenCarrusel ?? 0,
    titulo: p.tituloProducto ?? p.titulo ?? null,
    especificaciones: p.especificaciones ?? null,
    comoUsar: p.comoUsar ?? null,
    metaTitle: p.metaTitle ?? null,
    metaDescription: p.metaDescription ?? null,
    metaKeywords: p.metaKeywords ?? null,
    tags: p.tags ?? '',
    fechaUltimaVenta: p.fechaUltimaVenta ?? null,
    visibleCatalogo: p.visibleCatalogo !== false,
    metaTitleEn: p.metaTitleEn ?? null,
    metaTitlePt: p.metaTitlePt ?? null,
    metaTitleFr: p.metaTitleFr ?? null,
    metaDescriptionEn: p.metaDescriptionEn ?? null,
    metaDescriptionPt: p.metaDescriptionPt ?? null,
    metaDescriptionFr: p.metaDescriptionFr ?? null,
    videoUrl: p.videoUrl ?? null,
    empresaNombre: p.empresaNombre ?? null,
    empresaSlug: p.empresaSlug ?? null,
    talla: p.talla ?? null,
    garantiaDias: p.garantiaDias ?? 0,
    grupoVarianteId: p.grupoVarianteId ?? null,
    colorVariante: p.colorVariante ?? null,
    esPersonalizado: p.esPersonalizado === true,
    modoPrecioPersonalizado: p.modoPrecioPersonalizado ?? null,
    precioPersonalizadoMin: p.precioPersonalizadoMin ?? null,
    precioPersonalizadoMax: p.precioPersonalizadoMax ?? null,
    instruccionesPersonalizacion: p.instruccionesPersonalizacion ?? null,
  }
}

// Maps frontend form fields → backend ProductoRequestDTO
export function denormalizeProduct(form: ProductoForm) {
  return {
    nombreProducto: form.nombre,
    descripcionCorta: form.descripcion,
    precioCompra: Number(form.precioCompra) || 0,
    precioVenta: Number(form.precioVenta || form.precio) || 0,
    stockActual: Number(form.stock) || 0,
    condicion: form.condicion ?? 'NUEVO',
    categoriaId: form.categoriaId ? Number(form.categoriaId) : null,
    bodegaId: form.bodegaId ? Number(form.bodegaId) : null,
    imagenPrincipalUrl: form.imagenUrl || null,
    visibleCatalogo: true,
    destacado: form.destacado ?? false,
    tituloProducto: form.titulo || null,
    especificaciones: form.especificaciones || null,
    comoUsar: form.comoUsar || null,
    marcaId: form.marcaId ? Number(form.marcaId) : null,
    marcaTexto: form.marcaTexto || form.marca || null,
    metaTitle: form.metaTitle || null,
    metaDescription: form.metaDescription || null,
    metaKeywords: form.metaKeywords || null,
    metaTitleEn: form.metaTitleEn || null,
    metaTitlePt: form.metaTitlePt || null,
    metaTitleFr: form.metaTitleFr || null,
    metaDescriptionEn: form.metaDescriptionEn || null,
    metaDescriptionPt: form.metaDescriptionPt || null,
    metaDescriptionFr: form.metaDescriptionFr || null,
    videoUrl: form.videoUrl || null,
    talla: form.talla || null,
    garantiaDias: Number(form.garantiaDias) || 0,
    sku:     form.sku     || null,
    barcode: form.barcode || null,
    tags:    form.tags    || null,
    esPersonalizado: form.esPersonalizado === true,
    modoPrecioPersonalizado: form.esPersonalizado
      ? (form.modoPrecioPersonalizado || 'FIJO')
      : null,
    precioPersonalizadoMin: form.esPersonalizado && form.precioPersonalizadoMin != null && form.precioPersonalizadoMin !== ''
      ? Number(form.precioPersonalizadoMin)
      : null,
    precioPersonalizadoMax: form.esPersonalizado && form.precioPersonalizadoMax != null && form.precioPersonalizadoMax !== ''
      ? Number(form.precioPersonalizadoMax)
      : null,
    instruccionesPersonalizacion: form.esPersonalizado
      ? (form.instruccionesPersonalizacion || null)
      : null,
  }
}

const normalizeList = (data: unknown) => {
  const items = Array.isArray(data) ? data : esPagina(data) ? data.content : []
  const normalized = items.map((item) => normalizeProduct(item) as Producto)
  if (data && typeof data === 'object' && 'content' in data) return { ...data, content: normalized }
  return normalized
}

export const productService = {
  getAll: (page = 0, size = 12, params: Record<string, unknown> = {}) =>
    api.get('/productos', { params: { page, size, ...params } })
       .then((r) => ({ ...r, data: normalizeList(r.data) })),

  adminGetAll: (page = 0, size = 200) =>
    api.get('/productos/admin/todos', { params: { page, size } })
       .then((r) => ({ ...r, data: normalizeList(r.data) })),

  getById: (id: Id) =>
    api.get(`/productos/${id}`)
       .then((r) => ({ ...r, data: normalizeProduct(r.data as ProductoBackend) })),

  getRecommendations: (id: Id, config: AxiosRequestConfig = {}) =>
    api.get(`/productos/${id}/recomendaciones`, config)
       .then((r) => {
         const lista = (r.data as { data?: ProductoBackend[] } | ProductoBackend[] | undefined)
         const items = Array.isArray(lista) ? lista : lista?.data ?? []
         return items.map((item) => normalizeProduct(item) as Producto)
       }),

  getByMarca: (marcaId: Id, page = 0, size = 12) =>
    api.get(`/productos/marca/${marcaId}`, { params: { page, size } })
       .then((r) => ({ ...r, data: normalizeList(r.data) })),

  getVariantes: (id: Id, config: AxiosRequestConfig = {}) =>
    api.get(`/productos/${id}/variantes`, config)
       .then((r) => {
         const lista = r.data as { data?: unknown[] } | unknown[] | undefined
         return Array.isArray(lista) ? lista : lista?.data ?? []
       }),

  create: (data: unknown, config: AxiosRequestConfig = {}) =>
    api.post('/productos', data, config),

  update: (id: Id, data: unknown) =>
    api.put(`/productos/${id}`, data),

  delete: (id: Id) =>
    api.delete(`/productos/${id}`),

  importBulk: (dtos: unknown[]) =>
    api.post('/productos/bulk', dtos),

  uploadImage: (formData: FormData) =>
    api.post('/productos/imagen', formData, { timeout: 60000 }),

  getDestacados: () =>
    api.get('/productos/destacados')
       .then((r) => {
         const lista = r.data as { data?: ProductoBackend[] } | ProductoBackend[] | undefined
         const items = Array.isArray(lista) ? lista : lista?.data ?? []
         return { ...r, data: items.map((item) => normalizeProduct(item) as Producto) }
       }),

  toggleDestacado: (id: Id, valor: boolean) =>
    api.patch(`/productos/${id}/destacado`, { destacado: valor }),

  toggleVisibleCatalogo: (id: Id, valor: boolean) =>
    api.patch(`/productos/${id}/visibilidad-catalogo`, { visibleCatalogo: valor }),

  getCarrusel: () =>
    api.get('/productos/carrusel')
       .then((r) => {
         const lista = r.data as { data?: ProductoBackend[] } | ProductoBackend[] | undefined
         const items = Array.isArray(lista) ? lista : lista?.data ?? []
         return { ...r, data: items.map((item) => normalizeProduct(item) as Producto) }
       }),

  toggleCarrusel: (id: Id, valor: boolean, orden: number) =>
    api.patch(`/productos/${id}/carrusel`, { enCarrusel: valor, orden }),

  buscar: (q: string) =>
    api.get('/productos/buscar', { params: { q } }).then((r) => {
      const lista = r.data as { data?: ProductoBackend[] } | ProductoBackend[] | undefined
      const items = Array.isArray(lista) ? lista : lista?.data ?? []
      return items.map((item) => normalizeProduct(item) as Producto)
    }),

  kardex: (id: Id) =>
    api.get(`/productos/${id}/kardex`).then((r) => {
      const lista = r.data as { data?: unknown[] } | unknown[] | undefined
      return Array.isArray(lista) ? lista : lista?.data ?? []
    }),

  getCategories: () =>
    api.get('/categorias/publicas'),

  getImagenes: (productoId: Id) =>
    api.get(`/productos/${productoId}/imagenes`),

  sincronizarImagenes: (productoId: Id, urls: string[]) =>
    api.put(`/productos/${productoId}/imagenes`, { urls }),

  archivarSinStock: () =>
    api.post('/productos/archivar-sin-stock'),

  ajustarPrecios: (porcentaje: number) =>
    api.post('/productos/ajustar-precios', { porcentaje }),
}
