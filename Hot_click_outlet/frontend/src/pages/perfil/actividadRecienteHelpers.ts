import { estadoDePedido, type PedidoCliente } from '../pedidos/pedidoHelpers'
import { primerProducto } from './perfilHelpers'
import type { ProductoParaResena, SolicitudBusqueda } from '../servicios/serviciosHelpers'

export type ActividadItem = {
  id: string
  tipo: 'pedido' | 'solicitud' | 'resena'
  titulo: string
  detalle: string
  fecha: string
  to: string
}

const ESTADOS_ACTIVOS = new Set(['PAGADO', 'EN_PREPARACION', 'LISTO_RETIRO', 'ENVIADO'])

/** El pedido a destacar arriba de "Mi cuenta": el más reciente que sigue en curso. */
export function pedidoActivo(orders: PedidoCliente[]): PedidoCliente | null {
  return orders.find((o) => ESTADOS_ACTIVOS.has(estadoDePedido(o))) ?? null
}

function fechaOrdenable(fecha?: string): number {
  const t = fecha ? new Date(fecha).getTime() : NaN
  return Number.isNaN(t) ? 0 : t
}

/**
 * Feed único de actividad (Figma `28:1196`): fusiona pedidos, solicitudes de
 * Servicios HOT y productos con reseña pendiente. Sin endpoint nuevo — todo
 * sale de datos que la app ya carga en otras pantallas.
 */
export function construirActividad(
  orders: PedidoCliente[],
  solicitudes: SolicitudBusqueda[],
  productosParaResenar: ProductoParaResena[],
  limite = 6,
): ActividadItem[] {
  const items: ActividadItem[] = []

  for (const o of orders) {
    if (!o.fechaPedido) continue
    items.push({
      id: `pedido-${o.id}`,
      tipo: 'pedido',
      titulo: o.numeroPedido ? `Pedido ${o.numeroPedido}` : 'Pedido',
      detalle: `${estadoDePedido(o)} · ${primerProducto(o)}`,
      fecha: o.fechaPedido,
      to: '/mis-pedidos',
    })
  }

  for (const s of solicitudes) {
    if (!s.fechaCreacion) continue
    items.push({
      id: `solicitud-${s.id}`,
      tipo: 'solicitud',
      titulo: 'Búsqueda de Servicios HOT',
      detalle: s.estado ? `Estado: ${s.estado}` : (s.descripcion ?? 'Solicitud enviada'),
      fecha: s.fechaCreacion,
      to: '/servicios',
    })
  }

  for (const p of productosParaResenar) {
    if (p.yaReseno) continue
    items.push({
      id: `resena-${p.productoId}`,
      tipo: 'resena',
      titulo: 'Te falta opinar',
      detalle: p.nombre ?? 'Un producto que compraste',
      fecha: '',
      to: '/perfil#opinion',
    })
  }

  return items
    .sort((a, b) => fechaOrdenable(b.fecha) - fechaOrdenable(a.fecha))
    .slice(0, limite)
}
