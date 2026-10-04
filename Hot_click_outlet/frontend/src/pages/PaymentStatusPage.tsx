import { useEffect, useRef } from 'react'
import { Link, Navigate, useSearchParams, useLocation } from 'react-router-dom'
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

function PedidoSinNumero() {
  return (
    <div className="mx-auto flex max-w-[480px] flex-col items-center gap-4 px-4 py-12 text-center">
      <h1 className="font-display text-[19px] font-bold text-hc-n-900">No encontramos ese pedido</h1>
      <p className="text-[14px] leading-5 text-hc-n-600">El enlace no trae un número de pedido.</p>
      <Link to="/mis-pedidos" className="inline-flex h-12 items-center justify-center rounded-[12px] bg-hc-red-500 px-6 text-[15px] font-semibold text-white no-underline">
        Ver mis pedidos
      </Link>
    </div>
  )
}

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

  useEffect(() => () => {
    stopPolling()
    // En StrictMode el efecto se monta dos veces: sin reiniciar la marca, el segundo montaje no volvería a consultar el pago.
    ran.current = false
  }, [stopPolling])

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
    return <PedidoSinNumero />
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
    return <PagoPendiente pagoData={pagoData as PagoResumen | null} stripeApproved={stripeApproved} token={token} />
  }

  return <PagoError error={error} numeroPedido={numeroPedido} />
}
