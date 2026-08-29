import { useEffect, useRef } from 'react'
import { Navigate, useSearchParams, useLocation } from 'react-router-dom'
import { usePayment } from '@/hooks/usePayment'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'
import PagoLoading from './pago/PagoLoading'
import PagoExito from './pago/PagoExito'
import PagoCancelado from './pago/PagoCancelado'
import PagoPendiente from './pago/PagoPendiente'
import PagoError from './pago/PagoError'
import { leerParamsPago, estaOcupado, pedidoDesdeBusqueda } from './pago/pagoHelpers'
import type { PagoResumen } from './pago/pagoHelpers'
import {
  destinoVisitanteDesdePago,
  limpiarRetornoPagoVisitante,
} from '@/prototipo/visitante/pagoRetornoVisitante'

export default function PaymentStatusPage() {
  const [params] = useSearchParams()
  const { pathname, search } = useLocation()
  const destinoVisitante = destinoVisitanteDesdePago(pathname, search)
  const { stripeApproved, esCancelacion } = leerParamsPago(params, pathname)
  const numeroPedido = pedidoDesdeBusqueda(search)

  const { clearCart } = useCartStore()
  const { token } = useAuthStore()
  const {
    estado,
    pagoData,
    error,
    iniciarPolling,
    stopPolling,
    cancelarPedido,
  } = usePayment()
  const ran = useRef(false)

  useEffect(() => {
    if (!destinoVisitante) return
    limpiarRetornoPagoVisitante()
  }, [destinoVisitante])

  useEffect(() => () => stopPolling(), [stopPolling])

  useEffect(() => {
    globalThis.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  useEffect(() => {
    if (destinoVisitante) return
    if (estado === 'success') clearCart()
  }, [estado, clearCart, destinoVisitante])

  useEffect(() => {
    if (destinoVisitante || !numeroPedido || ran.current) return
    ran.current = true

    if (esCancelacion) {
      cancelarPedido(numeroPedido)
      return
    }

    iniciarPolling(numeroPedido)
  }, [numeroPedido, destinoVisitante, esCancelacion, cancelarPedido, iniciarPolling])

  if (destinoVisitante) {
    return <Navigate to={destinoVisitante} replace />
  }

  if (!numeroPedido) {
    return (
      <PagoError
        error="No encontramos el número de pedido en el enlace de retorno."
        numeroPedido={numeroPedido}
      />
    )
  }

  if (estaOcupado(estado)) {
    return <PagoLoading estado={estado} stripeApproved={stripeApproved} />
  }

  if (estado === 'success') {
    return <PagoExito pagoData={pagoData as PagoResumen | null} numeroPedido={numeroPedido} token={token} />
  }

  if (estado === 'cancelled') {
    return <PagoCancelado />
  }

  if (estado === 'timeout') {
    return <PagoPendiente pagoData={pagoData as PagoResumen | null} stripeApproved={stripeApproved} />
  }

  return <PagoError error={error} numeroPedido={numeroPedido} />
}
