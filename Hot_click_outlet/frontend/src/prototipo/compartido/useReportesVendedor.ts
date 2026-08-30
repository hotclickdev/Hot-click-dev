import { useMemo } from 'react'
import { useCatalogoVendedor } from './useCatalogoVendedor'
import { usePedidosEmprendedor } from '@/prototipo/emprendedor/hooks/usePedidosEmprendedor'
import type { PedidoEmprendedor } from '@/prototipo/emprendedor/types'

export type TopVendido = {
  nombre: string
  vendidos: number
  total: number
}

export type ResumenReportes = {
  publicados: number
  unidadesVendidas: number
  gananciaVendida: number
  gananciaPotencial: number
  top: TopVendido[]
  cargando: boolean
  error: string | null
}

/**
 * KPIs de reportes a partir del catálogo y pedidos reales. Sin SKUs demo.
 */
export function useReportesVendedor(): ResumenReportes {
  const { productos, cargando: cargandoCat, error: errorCat } = useCatalogoVendedor()
  const { pedidos, cargando: cargandoPed, error: errorPed } = usePedidosEmprendedor()

  return useMemo(() => {
    const publicados = productos.filter((p) => p.estado === 'Publicado').length
    const potencial = productos.reduce((acc, p) => acc + Math.max(0, p.precio - p.precioCompra) * p.stock, 0)
    const top = agruparTop(pedidos)
    const unidadesVendidas = top.reduce((acc, item) => acc + item.vendidos, 0)
    const gananciaVendida = pedidos
      .filter((p) => p.estado !== 'Pendiente')
      .reduce((acc, p) => acc + p.total, 0)
    return {
      publicados,
      unidadesVendidas,
      gananciaVendida,
      gananciaPotencial: potencial,
      top,
      cargando: cargandoCat || cargandoPed,
      error: errorCat ?? errorPed,
    }
  }, [productos, pedidos, cargandoCat, cargandoPed, errorCat, errorPed])
}

function agruparTop(pedidos: PedidoEmprendedor[]): TopVendido[] {
  const mapa = new Map<string, TopVendido>()
  for (const pedido of pedidos) {
    for (const linea of pedido.productos) {
      const actual = mapa.get(linea.nombre) ?? { nombre: linea.nombre, vendidos: 0, total: 0 }
      actual.vendidos += linea.cantidad
      actual.total += linea.precio * linea.cantidad
      mapa.set(linea.nombre, actual)
    }
  }
  return [...mapa.values()].sort((a, b) => b.vendidos - a.vendidos).slice(0, 5)
}
