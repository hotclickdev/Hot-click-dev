import { orderService } from '@/services/orderService'
import { listaPedidosDesdeRespuesta } from '@/pages/admin/ordenes/ordenesHelpers'
import type { Pedido, ItemPedido } from '@/types/pedido'
import type { PedidoEmprendedor } from '@/prototipo/emprendedor/types'
import type { PedidoMock } from '@/prototipo/compartido/mock'
import { confirmaPagoManual, estadoPedidoVendedor, pagaAlRetirar } from './estadoPedidoVendedor'
import type { DespachoPaquete } from '@/prototipo/emprendedor/pages/despacho/despachoPaquete'

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

/** «—» y vacíos del backend cuentan como sin dato. */
export function contacto(valor: unknown): string | undefined {
  return typeof valor === 'string' && valor.trim() && valor.trim() !== '—' ? valor.trim() : undefined
}

export function aPedidoEmprendedor(p: Pedido): PedidoEmprendedor {
  const estadoCrudo = p.estado ?? p.estadoPedido
  const datos = { metodoPago: p.metodoPago, metodoEnvio: p.metodoEnvio }
  const estado = estadoPedidoVendedor(estadoCrudo, datos)
  return {
    id: String(p.id ?? ''),
    numeroPedido: p.numeroPedido || undefined,
    cliente: p.nombreCliente ?? 'Cliente',
    total: Number(p.total ?? p.totalPedido ?? 0),
    estado,
    confirmaPago: confirmaPagoManual(estado, datos),
    pagaAlRetirar: pagaAlRetirar(estadoCrudo, datos),
    fecha: String(p.fechaCreacion ?? p.fechaPedido ?? ''),
    direccion: direccionDePedido(p),
    telefono: contacto((p as Pedido & { clienteTel?: unknown }).clienteTel),
    correo: contacto((p as Pedido & { clienteCorreo?: unknown }).clienteCorreo),
    origen: p.origen,
    productos: lineas(p.items),
  }
}

export function aPedidoSeller(p: PedidoEmprendedor): PedidoMock {
  return {
    id: p.id,
    numeroPedido: p.numeroPedido,
    cliente: p.cliente,
    total: p.total,
    estado: p.estado,
    pagaAlRetirar: p.pagaAlRetirar,
    fecha: p.fecha,
    direccion: p.direccion,
    telefono: p.telefono,
    correo: p.correo,
    confirmaPago: p.confirmaPago,
    origen: p.origen,
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

/** Cancela un pedido sin pago confirmado; el backend libera la reserva de stock. */
export async function cancelarPedidoVendedorApi(id: string) {
  await orderService.updateStatus(id, 'CANCELADO')
}

/** Pedido de tienda propia: el vendedor confirma que recibió el pago (mismo PUT de estado que usa Admin). */
export async function confirmarPagoVendedorApi(id: string) {
  await orderService.updateStatus(id, 'PAGADO')
}

export async function marcarPedidoEnviadoApi(id: string) {
  await orderService.updateStatus(id, 'ENVIADO')
}

export async function cargarDespachoPaquete(id: string): Promise<DespachoPaquete> {
  const { data } = await orderService.getDespacho(id)
  return data as DespachoPaquete
}

/** Con guía de Correos el backend guarda el seguimiento y le escribe al cliente; sin guía solo cambia el estado. */
export async function despacharPaqueteApi(id: string, numeroGuia: string | null) {
  if (numeroGuia) {
    await orderService.asignarGuia(id, numeroGuia)
    return
  }
  await marcarPedidoEnviadoApi(id)
}

/** Efectivo con retiro: el backend registra el cobro y deja el pedido ENTREGADO. */
export async function marcarPedidoEntregadoApi(id: string) {
  await orderService.updateStatus(id, 'ENTREGADO')
}

/** Asigna la guía de Correos: el backend deja el pedido en ENVIADO y avisa al cliente con el seguimiento. */
export async function marcarPedidoConGuiaApi(id: string, numeroGuia: string) {
  await orderService.asignarGuia(id, numeroGuia)
}
