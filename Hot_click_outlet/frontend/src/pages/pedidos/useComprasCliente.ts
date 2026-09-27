import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/components/ui/Toast'
import { orderService } from '@/services/orderService'
import useAuthStore from '@/store/authStore'
import type { Id } from '@/types/api'
import { PAQUETES_POR_CONSULTA, cargarPaginasPedidos } from './cargarPaginasPedidos'
import { agruparCompras, type CompraCliente } from './comprasCliente'
import { pedidosDesdeRespuesta, type PedidoCliente } from './pedidoHelpers'

type ComprasCliente = { cargando: boolean; compras: CompraCliente[]; pedidos: PedidoCliente[] }

function cargarPedidosComprador(userId: Id): Promise<PedidoCliente[]> {
  return cargarPaginasPedidos(async (pagina) => {
    const { data } = await orderService.getByUser(userId, pagina, PAQUETES_POR_CONSULTA)
    return pedidosDesdeRespuesta(data)
  })
}

/** Paquetes del comprador agrupados por compra (un pago, un paquete por negocio). */
export function useComprasCliente(): ComprasCliente {
  const userId = useAuthStore((s) => s.userId)
  const toast = useToast()
  const { t } = useTranslation()
  const [pedidos, setPedidos] = useState<PedidoCliente[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!userId) return
    let cancelado = false
    cargarPedidosComprador(userId)
      .then((todos) => { if (!cancelado) setPedidos(todos) })
      .catch((error: unknown) => {
        if (cancelado) return
        console.error('No se pudieron cargar los pedidos del comprador', error)
        toast({ message: t('common.error'), type: 'error' })
      })
      .finally(() => { if (!cancelado) setCargando(false) })
    return () => { cancelado = true }
  }, [userId, toast, t])

  const compras = useMemo(() => agruparCompras(pedidos), [pedidos])
  return { cargando, compras, pedidos }
}
