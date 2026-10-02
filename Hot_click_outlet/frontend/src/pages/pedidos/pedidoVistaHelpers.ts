import { agruparPedidosPorPaquete, estadoDePedido, itemsDePedido, totalDePedido, DIAS_GARANTIA, MS_POR_DIA } from './pedidoHelpers'
import type { GrupoDePedidos, ItemPedidoCliente, PedidoCliente } from './pedidoHelpers'
import { estadoGlobal } from '../perfil/cuenta/cuentaHelpers'

/** Filtros de "Mis pedidos" (Figma `28:1317`). Se aplican al estado global del pedido. */
export type FiltroPedidos = 'todos' | 'enCamino' | 'enPreparacion' | 'entregados' | 'cancelados'

export const FILTROS_PEDIDOS: FiltroPedidos[] = ['todos', 'enCamino', 'enPreparacion', 'entregados', 'cancelados']

const ESTADOS_POR_FILTRO: Record<Exclude<FiltroPedidos, 'todos'>, string[]> = {
  enCamino: ['ENVIADO', 'LISTO_RETIRO'],
  enPreparacion: ['PENDIENTE', 'PAGADO', 'EN_PREPARACION'],
  entregados: ['ENTREGADO'],
  cancelados: ['CANCELADO'],
}

/** Un pedido tal como lo ve el comprador: un pago, con uno o varios paquetes (subpedidos). */
export type PedidoComprador = {
  clave: string
  numero: string
  fecha: string | undefined
  paquetes: PedidoCliente[]
  estado: string
  total: number
}

export function pedidosDelComprador(orders: PedidoCliente[]): PedidoComprador[] {
  return agruparPedidosPorPaquete(orders).map((grupo: GrupoDePedidos) => {
    const primero = grupo.pedidos[0]
    return {
      clave: grupo.grupoPago ?? String(primero.id ?? primero.numeroPedido),
      numero: primero.numeroPedido ?? String(primero.id ?? ''),
      fecha: primero.fechaPedido,
      paquetes: grupo.pedidos,
      estado: estadoGlobal(grupo.pedidos),
      total: grupo.pedidos.reduce((suma, p) => suma + (totalDePedido(p) ?? 0), 0),
    }
  })
}

export function filtrarPedidos(pedidos: PedidoComprador[], filtro: FiltroPedidos): PedidoComprador[] {
  if (filtro === 'todos') return pedidos
  const estados = ESTADOS_POR_FILTRO[filtro]
  return pedidos.filter((p) => estados.includes(p.estado))
}

/** Productos (unidades de línea) de todos los paquetes del pedido. */
export function productosDelPedido(pedido: PedidoComprador): ItemPedidoCliente[] {
  return pedido.paquetes.flatMap((p) => itemsDePedido(p))
}

export function nombreTienda(paquete: PedidoCliente): string | null {
  return paquete.nombreEmpresa ?? itemsDePedido(paquete).find((i) => i.producto?.empresaNombre)?.producto?.empresaNombre ?? null
}

export function tiendasDelPedido(pedido: PedidoComprador): number {
  const nombres = pedido.paquetes.map((p) => nombreTienda(p) ?? `paquete-${p.id}`)
  return new Set(nombres).size
}

export function paquetesEntregados(pedido: PedidoComprador): number {
  return pedido.paquetes.filter((p) => estadoDePedido(p) === 'ENTREGADO').length
}

/** Costo de envío de cada paquete y, si todos valen lo mismo, ese valor (para "3 paquetes × ₡4.000"). */
export function envioDelPedido(pedido: PedidoComprador): { total: number; igual: number | null } {
  const valores = pedido.paquetes.map((p) => p.costoEnvio ?? 0)
  const total = valores.reduce((a, b) => a + b, 0)
  const igual = valores.length > 1 && valores.every((v) => v === valores[0]) ? valores[0] : null
  return { total, igual }
}

export function subtotalProductos(pedido: PedidoComprador): number {
  return productosDelPedido(pedido).reduce((suma, i) => suma + (i.subtotalItem ?? (i.precioUnitarioMomento ?? 0) * (i.cantidad ?? 1)), 0)
}

export function cantidadProductos(pedido: PedidoComprador): number {
  return productosDelPedido(pedido).reduce((suma, i) => suma + (i.cantidad ?? 1), 0)
}

/** Días de garantía que le quedan a un paquete entregado (0 si venció o no hay fecha). */
export function diasDeGarantia(paquete: PedidoCliente, ahora = Date.now()): number {
  const base = paquete.fechaEntregaReal ?? paquete.fechaPedido
  if (!base) return 0
  const limite = new Date(base)
  limite.setDate(limite.getDate() + DIAS_GARANTIA)
  return Math.max(0, Math.ceil((limite.getTime() - ahora) / MS_POR_DIA))
}

/** Pedido por número, o `null`: el detalle se abre con `?pedido=<numero>`. */
export function pedidoPorNumero(pedidos: PedidoComprador[], numero: string | null): PedidoComprador | null {
  if (!numero) return null
  return pedidos.find((p) => p.numero === numero) ?? null
}

export function urlRastreo(paquete: PedidoCliente): string | null {
  if (!paquete.numeroGuia) return null
  const url = paquete.urlTracking
  if (url) {
    try {
      if (new URL(url).protocol === 'https:') return url
    } catch { /* se usa el rastreo oficial */ }
  }
  return `https://rastreo.correos.go.cr/?codigo=${encodeURIComponent(paquete.numeroGuia)}`
}
