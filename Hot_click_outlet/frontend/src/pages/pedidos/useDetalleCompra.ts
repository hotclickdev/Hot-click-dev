import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/components/ui/Toast'
import { orderService } from '@/services/orderService'
import useAuthStore from '@/store/authStore'
import { compraDelPaquete, type CompraCliente } from './comprasCliente'
import { pedidoDesdeRespuesta, pedidosDesdeRespuesta } from './pedidoHelpers'

/** Lee el paquete pedido y, si la compra tiene más, trae los demás paquetes de esa compra. */
async function cargarCompra(idPaquete: string): Promise<CompraCliente | null> {
  const { data } = await orderService.getById(idPaquete)
  const paquete = pedidoDesdeRespuesta(data)
  if (!paquete) return null
  if ((paquete.cantidadPaquetes ?? 1) <= 1) return compraDelPaquete(paquete, [])
  const compra = await orderService.getCompra(idPaquete)
  return compraDelPaquete(paquete, pedidosDesdeRespuesta(compra.data).pedidos)
}

type DetalleCompra = { cargando: boolean; compra: CompraCliente | null }

export function useDetalleCompra(idPaquete: string | undefined): DetalleCompra {
  const userId = useAuthStore((s) => s.userId)
  const toast = useToast()
  const { t } = useTranslation()
  const [detalle, setDetalle] = useState<DetalleCompra>({ cargando: true, compra: null })

  useEffect(() => {
    if (!idPaquete || !userId) return
    let cancelado = false
    cargarCompra(idPaquete)
      .then((compra) => { if (!cancelado) setDetalle({ cargando: false, compra }) })
      .catch((error: unknown) => {
        if (cancelado) return
        console.error('No se pudo cargar el detalle del pedido', error)
        toast({ message: t('common.error'), type: 'error' })
        setDetalle({ cargando: false, compra: null })
      })
    return () => { cancelado = true }
  }, [idPaquete, userId, toast, t])

  return detalle
}
