import axios from 'axios'
import { normalizeProduct } from './productService'
import useTiendaStore from '../store/tiendaStore'
import type { Id } from '@/types/api'
import type { PedidoTiendaInvitado } from '@/types/pedido'
import type { ProductoBackend } from '@/types/producto'

// Instancia sin interceptor JWT — todas las llamadas son públicas
const tiendaApi = axios.create({
  baseURL: '/api/tienda',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Adjunta el slug activo como header en cada petición.
// El backend hoy resuelve el tenant por path variable ({slug} en la URL);
// este header es redundante para las rutas actuales pero cubre endpoints
// futuros que no lleven el slug en el path (ver SlugTenantInterceptor.java).
tiendaApi.interceptors.request.use((config) => {
  const slug = useTiendaStore.getState().slug
  if (slug) {
    config.headers['X-Tenant-Slug'] = slug
  }
  return config
})

// Auto-unwrap ResponseDTO { success, message, data }
tiendaApi.interceptors.response.use(
  (response) => {
    const d = response.data
    if (d && 'success' in d && 'data' in d && d.data !== undefined && d.data !== null) {
      response.data = d.data
    }
    return response
  },
  (error) => Promise.reject(error)
)

const tiendaService = {
  /** Metadatos públicos de la tienda: nombre, logo, colores. */
  getInfo: (slug: string) =>
    tiendaApi.get(`/${slug}`).then(r => r.data),

  /** Catálogo paginado. Parámetros opcionales: q (búsqueda), categoriaId. */
  getProductos: (slug: string, { page = 0, size = 20, q, categoriaId }: {
    page?: number
    size?: number
    q?: string
    categoriaId?: Id
  } = {}) =>
    tiendaApi.get(`/${slug}/productos`, { params: { page, size, q, categoriaId } })
      .then(r => ({
        ...r.data,
        content: ((r.data as { content?: ProductoBackend[] }).content ?? []).map(normalizeProduct),
      })),

  /** Detalle de un producto individual. */
  getProducto: (slug: string, productoId: Id) =>
    tiendaApi.get(`/${slug}/productos/${productoId}`)
      .then(r => normalizeProduct(r.data as ProductoBackend)),

  /** Categorías de la tienda. */
  getCategorias: (slug: string) =>
    tiendaApi.get(`/${slug}/categorias`).then(r => r.data ?? []),

  /** Marcas de la tienda. */
  getMarcas: (slug: string) =>
    tiendaApi.get(`/${slug}/marcas`).then(r => r.data ?? []),

  /**
   * Crea un pedido como invitado.
   * @param {string} slug
   * @param {{ nombreCliente, correoCliente, telefonoCliente, direccionEntrega,
   *            metodoPago, metodoEnvio, notas,
   *            items: Array<{productoId, cantidad}> }} dto
   */
  crearPedido: (slug: string, dto: PedidoTiendaInvitado) =>
    tiendaApi.post(`/${slug}/pedidos`, dto).then(r => r.data),
}

export default tiendaService
