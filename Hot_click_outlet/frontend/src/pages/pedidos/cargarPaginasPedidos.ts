import type { PedidoCliente } from './pedidoHelpers'

/** Paquetes por página al pedirle el historial al backend. */
export const PAQUETES_POR_CONSULTA = 50
/** Tope de páginas (500 paquetes): el Figma no pagina «Mis pedidos», pero la carga no puede ser infinita. */
export const MAX_PAGINAS_PEDIDOS = 10

export type PaginaPedidos = { pedidos: PedidoCliente[]; totalPages: number }

/**
 * Trae todas las páginas del historial (hasta el tope) para que ninguna compra quede partida
 * entre páginas. Si llega un pedido nuevo a mitad de la carga, la página siguiente repite uno: se descarta.
 */
export async function cargarPaginasPedidos(
  cargarPagina: (pagina: number) => Promise<PaginaPedidos>,
  maxPaginas = MAX_PAGINAS_PEDIDOS,
): Promise<PedidoCliente[]> {
  const primera = await cargarPagina(0)
  const paginas = Math.min(primera.totalPages, maxPaginas)
  const resto = await Promise.all(Array.from({ length: Math.max(0, paginas - 1) }, (_, i) => cargarPagina(i + 1)))
  const vistos = new Set<number>()
  return [primera, ...resto].flatMap((p) => p.pedidos).filter((pedido) => {
    if (pedido.id == null) return true
    if (vistos.has(pedido.id)) return false
    vistos.add(pedido.id)
    return true
  })
}
