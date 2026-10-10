import { useQuery } from '@tanstack/react-query'
import { aProductoEmprendedor, cargarProductosVendedor } from './catalogoVendedorApi'
import { aPedidoEmprendedor, cargarPedidosVendedor } from './pedidosVendedorApi'
import { contarPedidosHoy, contarStockBajo } from './kpisInicioHelpers'

export type KpisInicio = {
  pedidosHoy: number
  stockBajo: number
}

/**
 * KPIs de Inicio del panel: pedidos de hoy y productos con stock bajo.
 * Solo números que vienen de la API; si falla, no hay cifra.
 */
export function useKpisInicio() {
  return useQuery({
    queryKey: ['inicio-vendedor', 'kpis'],
    queryFn: cargarKpisInicio,
    staleTime: 60_000,
  })
}

async function cargarKpisInicio(): Promise<KpisInicio> {
  const [pedidos, productos] = await Promise.all([
    cargarPedidosVendedor().then((lista) => lista.map(aPedidoEmprendedor)),
    cargarProductosVendedor().then((lista) => lista.map(aProductoEmprendedor)),
  ])
  return {
    pedidosHoy: contarPedidosHoy(pedidos),
    stockBajo: contarStockBajo(productos),
  }
}
