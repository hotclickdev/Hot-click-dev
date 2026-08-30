import { useEffect, useState } from 'react'
import { aPedidoEmprendedor, aPedidoSeller, cargarPedidosVendedor } from '@/prototipo/compartido/pedidosVendedorApi'
import type { PedidoEmprendedor } from '../types'

/**
 * Pedidos reales del vendedor (`orderService`).
 */
export function usePedidosEmprendedor() {
  const [pedidos, setPedidos] = useState<PedidoEmprendedor[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    cargarPedidosVendedor()
      .then((lista) => {
        if (!vivo) return
        setPedidos(lista.map(aPedidoEmprendedor))
        setError(null)
      })
      .catch((err: unknown) => {
        console.error('[pedidosVendedor]', err)
        if (!vivo) return
        setPedidos([])
        setError('No se pudieron cargar los pedidos.')
      })
      .finally(() => {
        if (vivo) setCargando(false)
      })
    return () => { vivo = false }
  }, [])

  return { pedidos, seller: pedidos.map(aPedidoSeller), cargando, error }
}
