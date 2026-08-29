import { orderService } from '@/services/orderService'
import { listaPedidosDesdeRespuesta } from '@/pages/admin/ordenes/ordenesHelpers'
import type { Pedido, ItemPedido } from '@/types/pedido'
import type { PedidoEmprendedor } from '@/prototipo/emprendedor/types'
import type { PedidoMock } from '@/prototipo/compartido/mock'

function estadoFigma(estado?: string): PedidoEmprendedor['estado'] {
  const e = (estado ?? '').toUpperCase()
  if (e === 'ENTREGADO' || e === 'COMPLETADO') return 'Entregado'
  if (e === 'ENVIADO') return 'Enviado'
  return 'Pendiente'
}

function lineas(items: ItemPedido[] | undefined): PedidoEmprendedor['productos'] {
  return (items ?? []).map((item, i) => ({
    id: String(item.productoId ?? i),
    nombre: item.nombreProducto ?? item.nombre ?? 'Producto',
    cantidad: Number(item.cantidad ?? 1),
    precio: Number(item.precioUnitario ?? item.precio ?? 0),
  }))
}

function direccionDePedido(p: Pedido): string {
  const extra = p as Pedido & { direccionEntrega?: unknown; direccion?: unknown }
  if (typeof extra.direccionEntrega === 'string' && extra.direccionEntrega) return extra.direccionEntrega
  if (typeof extra.direccion === 'string' && extra.direccion) return extra.direccion
  return ''
}

export function aPedidoEmprendedor(p: Pedido): PedidoEmprendedor {
  return {
    id: String(p.id ?? ''),
    cliente: p.nombreCliente ?? 'Cliente',
    total: Number(p.total ?? p.totalPedido ?? 0),
    estado: estadoFigma(p.estado ?? p.estadoPedido),
    fecha: String(p.fechaCreacion ?? p.fechaPedido ?? ''),
    direccion: direccionDePedido(p),
    productos: lineas(p.items),
  }
}

export function aPedidoSeller(p: PedidoEmprendedor): PedidoMock {
  return {
    id: p.id,
    cliente: p.cliente,
    total: p.total,
    estado: p.estado,
    fecha: p.fecha,
    direccion: p.direccion,
    items: p.productos.map((item) => ({
      nombre: item.nombre,
      cantidad: item.cantidad,
      precio: item.precio,
    })),
  }
}

export async function cargarPedidosVendedor(): Promise<Pedido[]> {
  const { data } = await orderService.getAll()
  return listaPedidosDesdeRespuesta(data)
}

export async function marcarPedidoEnviadoApi(id: string) {
  await orderService.updateStatus(id, 'ENVIADO')
}
