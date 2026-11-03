import { useEffect, useRef } from 'react'
import { Link, Navigate, useSearchParams, useLocation } from 'react-router-dom'
import { usePayment, MENSAJE_LOGIN_PEDIDO } from '@/hooks/usePayment'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'
import PagoLoading from './pago/PagoLoading'
import PagoExito from './pago/PagoExito'
import PagoCancelado from './pago/PagoCancelado'
import PagoPendiente from './pago/PagoPendiente'
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
  // Token de estado firmado que agrega el backend a la URL de retorno de ONVO (solo lectura).
  const tokenEstado = params.get('st')

  const { clearCart } = useCartStore()
  const { token } = useAuthStore()
  const {
    estado,
    pagoData,
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

    iniciarPolling(numeroPedido, tokenEstado)
  }, [numeroPedido, tokenEstado, destinoVisitante, esCancelacion, cancelarPedido, iniciarPolling])

  if (destinoVisitante) {
    return <Navigate to={destinoVisitante} replace />
  }

  if (!numeroPedido) {
    return <PagoCancelado />
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

  if (estado === 'login_required') {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center" role="status">
        <p className="text-lg font-semibold">{MENSAJE_LOGIN_PEDIDO}</p>
        <Link to="/login" className="mt-4 inline-block underline">Iniciar sesión</Link>
      </div>
    )
  }

  if (estado === 'timeout') {
    return (
      <PagoPendiente
        pagoData={pagoData as PagoResumen | null}
        stripeApproved={stripeApproved}
        token={token}
      />
    )
  }

  return <PagoCancelado />
}
