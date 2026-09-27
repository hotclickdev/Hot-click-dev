import { estadoDePedido, totalDePedido } from './pedidoHelpers'
import type { ItemPedidoCliente, PedidoCliente } from './pedidoHelpers'

/** Miniaturas de producto que muestra la tarjeta de «Mis pedidos» (Figma `28:1351`). */
export const MAX_MINIATURAS = 2

export type EstadoCompra = 'enCamino' | 'enPreparacion' | 'entregado' | 'cancelado' | 'pendiente'
export type FiltroCompras = 'todos' | 'enCamino' | 'enPreparacion' | 'entregado' | 'cancelado'

export const FILTROS_COMPRAS: readonly FiltroCompras[] = ['todos', 'enCamino', 'enPreparacion', 'entregado', 'cancelado']

/** Una compra del comprador: un solo pago que agrupa un paquete (pedido) por negocio. */
export type CompraCliente = {
  clave: string
  numero: string
  /** Id del paquete que abre el detalle de toda la compra. */
  idDetalle?: number
  fecha?: string
  metodoPago?: string
  paquetes: PedidoCliente[]
}

function claveCompra(pedido: PedidoCliente, indice: number): string {
  if (pedido.compraId != null) return `compra-${pedido.compraId}`
  return `pedido-${pedido.id ?? `sin-id-${indice}`}`
}

function porNumeroPaquete(a: PedidoCliente, b: PedidoCliente): number {
  return (a.numeroPaquete ?? 1) - (b.numeroPaquete ?? 1)
}

function crearCompra(clave: string, paquetes: PedidoCliente[]): CompraCliente {
  const ordenados = [...paquetes].sort(porNumeroPaquete)
  const primero = ordenados[0]
  return {
    clave,
    numero: primero.numeroCompra ?? primero.numeroPedido ?? `#${primero.id ?? ''}`,
    idDetalle: primero.id,
    fecha: primero.fechaPedido,
    metodoPago: primero.metodoPago,
    paquetes: ordenados,
  }
}

/** Agrupa los paquetes por compra respetando el orden en que llegan (más reciente primero). */
export function agruparCompras(pedidos: PedidoCliente[]): CompraCliente[] {
  const grupos = new Map<string, PedidoCliente[]>()
  pedidos.forEach((pedido, indice) => {
    const clave = claveCompra(pedido, indice)
    grupos.set(clave, [...(grupos.get(clave) ?? []), pedido])
  })
  return [...grupos.entries()].map(([clave, paquetes]) => crearCompra(clave, paquetes))
}

export function estadoCompra(compra: CompraCliente): EstadoCompra {
  const activos = compra.paquetes.map(estadoDePedido).filter((estado) => estado !== 'CANCELADO')
  if (activos.length === 0) return 'cancelado'
  if (activos.every((estado) => estado === 'ENTREGADO')) return 'entregado'
  if (activos.some((estado) => estado === 'ENVIADO' || estado === 'ENTREGADO')) return 'enCamino'
  if (activos.every((estado) => estado === 'PENDIENTE')) return 'pendiente'
  return 'enPreparacion'
}

export function filtrarCompras(compras: CompraCliente[], filtro: FiltroCompras): CompraCliente[] {
  if (filtro === 'todos') return compras
  return compras.filter((compra) => estadoCompra(compra) === filtro)
}

export function totalCompra(compra: CompraCliente): number {
  return compra.paquetes.reduce((suma, paquete) => suma + (totalDePedido(paquete) ?? 0), 0)
}

export function envioCompra(compra: CompraCliente): number {
  return compra.paquetes.reduce((suma, paquete) => suma + (paquete.costoEnvio ?? 0), 0)
}

export function cantidadProductos(compra: CompraCliente): number {
  return compra.paquetes
    .flatMap((paquete) => paquete.items ?? [])
    .reduce((suma, item) => suma + (item.cantidad ?? 1), 0)
}

/** `cantidadPaquetes` de la compra manda: la página puede no haber traído todos los paquetes. */
export function totalPaquetes(compra: CompraCliente): number {
  return Math.max(compra.paquetes[0]?.cantidadPaquetes ?? 0, compra.paquetes.length)
}

export function paquetesEntregados(compra: CompraCliente): number {
  return compra.paquetes.filter((paquete) => estadoDePedido(paquete) === 'ENTREGADO').length
}

/** Mismo costo de envío en todos los paquetes → «3 paquetes × ₡4.000»; si no, null. */
export function envioUniforme(compra: CompraCliente): number | null {
  const costos = new Set(compra.paquetes.map((paquete) => paquete.costoEnvio ?? 0))
  return compra.paquetes.length > 1 && costos.size === 1 ? [...costos][0] : null
}

export type Miniatura = { url: string | null; nombre: string }

/** Primeros productos de la compra; `url` null cuando el producto no tiene foto. */
export function miniaturasCompra(compra: CompraCliente): Miniatura[] {
  return compra.paquetes
    .flatMap((paquete) => paquete.items ?? [])
    .slice(0, MAX_MINIATURAS)
    .map((item) => ({
      url: item.producto?.imagenPrincipalUrl ?? null,
      nombre: nombreItem(item),
    }))
}

export function nombreItem(item: ItemPedidoCliente): string {
  return item.nombreProducto ?? item.producto?.nombreProducto ?? ''
}

/** Fecha de entrega más reciente entre los paquetes entregados. */
export function fechaEntregaCompra(compra: CompraCliente): string | null {
  const fechas = compra.paquetes
    .map((paquete) => paquete.fechaEntregaReal)
    .filter((fecha): fecha is string => Boolean(fecha))
    .sort()
  return fechas.at(-1) ?? null
}

/** Busca la compra del paquete `idPaquete`; si la lista no lo trae, arma la compra solo con ese paquete. */
export function compraDelPaquete(paquete: PedidoCliente, delComprador: PedidoCliente[]): CompraCliente {
  if (paquete.compraId == null) return agruparCompras([paquete])[0]
  const hermanos = delComprador.filter((pedido) => pedido.compraId === paquete.compraId)
  const sinDuplicar = hermanos.some((pedido) => pedido.id === paquete.id) ? hermanos : [paquete, ...hermanos]
  return agruparCompras(sinDuplicar)[0]
}
