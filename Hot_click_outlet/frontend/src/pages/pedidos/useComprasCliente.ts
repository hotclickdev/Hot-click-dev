import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/components/ui/Toast'
import { orderService } from '@/services/orderService'
import useAuthStore from '@/store/authStore'
import { agruparCompras, type CompraCliente } from './comprasCliente'
import { pedidosDesdeRespuesta, type PedidoCliente } from './pedidoHelpers'

/** Paquetes que se piden de una vez: sin paginación en el Figma, alcanza para agrupar las compras recientes. */
export const PAQUETES_POR_CONSULTA = 50

type ComprasCliente = { cargando: boolean; compras: CompraCliente[]; pedidos: PedidoCliente[] }

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
    orderService.getByUser(userId, 0, PAQUETES_POR_CONSULTA)
      .then(({ data }) => { if (!cancelado) setPedidos(pedidosDesdeRespuesta(data).pedidos) })
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
