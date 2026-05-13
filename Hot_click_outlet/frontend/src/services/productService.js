import api from './api'

// Maps backend Producto fields → consistent frontend names used everywhere
export function normalizeProduct(p) {
  if (!p) return p
  return {
    ...p,
    nombre: p.nombreProducto ?? p.nombre ?? '',
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
    destacado: p.destacado ?? false,
    titulo: p.tituloProducto ?? p.titulo ?? null,
    especificaciones: p.especificaciones ?? null,
    comoUsar: p.comoUsar ?? null,
  }
}

// Maps frontend form fields → backend ProductoRequestDTO
export function denormalizeProduct(form) {
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
  }
}

const normalizeList = (data) => {
  const items = Array.isArray(data) ? data : data?.content ?? []
  const normalized = items.map(normalizeProduct)
  if (data?.content !== undefined) return { ...data, content: normalized }
  return normalized
}

export const productService = {
  getAll: (page = 0, size = 12, params = {}) =>
    api.get('/productos', { params: { page, size, ...params } })
       .then((r) => ({ ...r, data: normalizeList(r.data) })),

  adminGetAll: (page = 0, size = 200) =>
    api.get('/productos/admin/todos', { params: { page, size } })
       .then((r) => ({ ...r, data: normalizeList(r.data) })),

  getById: (id) =>
    api.get(`/productos/${id}`)
       .then((r) => ({ ...r, data: normalizeProduct(r.data) })),

  create: (data) =>
    api.post('/productos', data),

  update: (id, data) =>
    api.put(`/productos/${id}`, data),

  delete: (id) =>
    api.delete(`/productos/${id}`),

  uploadImage: (formData) =>
    api.post('/productos/imagen', formData),

  getDestacados: () =>
    api.get('/productos/destacados')
       .then((r) => ({ ...r, data: (r.data?.data ?? r.data ?? []).map(normalizeProduct) })),

  toggleDestacado: (id, valor) =>
    api.patch(`/productos/${id}/destacado`, { destacado: valor }),

  getCategories: () =>
    api.get('/categorias'),
}
