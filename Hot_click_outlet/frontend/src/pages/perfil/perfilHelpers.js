import { DIAS_GARANTIA, MS_POR_DIA } from '../pedidos/pedidoHelpers'

export const MAX_PEDIDOS_RECIENTES = 3
export const MAX_RESENAS = 3
export const ESTADOS_VALIDOS_RESENA = new Set([
  'PAGADO', 'EN_PREPARACION', 'ENVIADO', 'ENTREGADO', 'LISTO_RETIRO',
])
export const RATING_LABELS = {
  1: 'Muy malo', 2: 'Malo', 3: 'Regular', 4: 'Bueno', 5: 'Excelente',
}

const ROLE_LABELS = {
  ADMIN: 'Admin',
  EMPRENDEDOR: 'Emprendedor',
  USUARIO_FINAL: 'Cliente',
}

/**
 * Días restantes de garantía a partir de la fecha del pedido.
 * @param {string | Date | null | undefined} fechaPedido
 * @returns {number | null}
 */
export function garantiaDias(fechaPedido) {
  if (!fechaPedido) return null
  const limite = new Date(fechaPedido)
  limite.setDate(limite.getDate() + DIAS_GARANTIA)
  return Math.ceil((limite - Date.now()) / MS_POR_DIA)
}

/**
 * Nombre del primer ítem del pedido, con sufijo si hay más.
 * @param {{ items?: { nombreProducto?: string, producto?: { nombreProducto?: string } }[] }} order
 * @returns {string}
 */
export function primerProducto(order) {
  const items = order.items ?? []
  if (items.length === 0) return 'Sin productos'
  const nombre = items[0].nombreProducto ?? items[0].producto?.nombreProducto ?? 'Producto'
  return items.length > 1 ? `${nombre} +${items.length - 1}` : nombre
}

/**
 * Etiqueta visible del rol de cuenta.
 * @param {string} [role]
 * @returns {string | undefined}
 */
export function roleLabel(role) {
  return ROLE_LABELS[role] ?? role
}

/**
 * Lista de pedidos desde la respuesta de `orderService.getByUser`.
 * @param {unknown} data
 * @returns {object[]}
 */
export function listaPedidosDesdeRespuesta(data) {
  if (Array.isArray(data)) return data
  return data?.content ?? []
}

/**
 * Productos únicos de pedidos en estados que permiten reseña.
 * @param {{ estadoPedido?: string, items?: object[] }[]} orders
 * @returns {{ id: number, nombre: string }[]}
 */
export function productosElegiblesParaResena(orders) {
  return orders
    .filter((o) => ESTADOS_VALIDOS_RESENA.has(o.estadoPedido))
    .flatMap((o) => o.items ?? [])
    .reduce((acc, item) => {
      const id = item.productoId ?? item.producto?.id
      const nombre = item.nombreProducto ?? item.producto?.nombreProducto ?? 'Producto'
      if (id && !acc.find((p) => p.id === id)) acc.push({ id, nombre })
      return acc
    }, [])
}

/**
 * Conteo de reseñas por producto desde los testimonios del usuario.
 * @param {{ tipo?: string, productoId?: number }[]} testimonios
 * @returns {Record<number, number>}
 */
export function conteoResenasPorProducto(testimonios) {
  return testimonios.reduce((mapa, r) => {
    if (r.tipo === 'RESENA' && r.productoId) {
      mapa[r.productoId] = (mapa[r.productoId] ?? 0) + 1
    }
    return mapa
  }, {})
}
