import { useQuery } from '@tanstack/react-query'
import { aPedidoEmprendedor, cargarPedidosVendedor } from './pedidosVendedorApi'
import type { EstadoPedido } from './mock'

const ESTADO_POR_DESPACHAR: EstadoPedido = 'Pendiente'

/** Pedidos con el pago confirmado que todavía no se despacharon (o entregaron). */
export function contarPorDespachar(pedidos: ReadonlyArray<{ estado: EstadoPedido }>): number {
  return pedidos.filter((pedido) => pedido.estado === ESTADO_POR_DESPACHAR).length
}

/**
 * Cantidad real de pedidos por despachar, para el badge de Pedidos y la tarjeta de Inicio.
 * Sin dato (cargando o error) no hay cantidad: nadie dibuja un número inventado.
 */
export function usePedidosPorDespachar() {
  return useQuery({
    queryKey: ['pedidos', 'vendedor', 'por-despachar'],
    queryFn: async () => {
      const pedidos = await cargarPedidosVendedor()
      return contarPorDespachar(pedidos.map(aPedidoEmprendedor))
    },
    staleTime: 60_000,
  })
}
