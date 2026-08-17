import { useEffect, useRef } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import { usePayment } from '@/hooks/usePayment'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'
import PagoLoading from './pago/PagoLoading'
import PagoExito from './pago/PagoExito'
import PagoCancelado from './pago/PagoCancelado'
import PagoPendiente from './pago/PagoPendiente'
import PagoError from './pago/PagoError'
import { leerParamsPago, estaOcupado } from './pago/pagoHelpers'

export default function PaymentStatusPage() {
  const [params]      = useSearchParams()
  const { pathname }  = useLocation()
  // Stripe agrega redirect_status=succeeded cuando el pago ya fue aprobado
  const { numeroPedido, provider, paypalToken, stripeApproved, esCancelacion } =
    leerParamsPago(params, pathname)

  const { clearCart }                                                           = useCartStore()
  const { token }                                                               = useAuthStore()
  const { estado, pagoData, error, iniciarPolling, stopPolling,
          capturarPayPal, cancelarPedido }                                      = usePayment()
  const ran = useRef(false)

  // Limpiar el polling al desmontar el componente
  useEffect(() => () => stopPolling(), [stopPolling])

  // Scroll al inicio al regresar de la pasarela de pago
  useEffect(() => {
    globalThis.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  // Limpiar carrito cuando el pago se confirma (independiente del proveedor)
  useEffect(() => {
    if (estado === 'success') clearCart()
  }, [estado, clearCart])

  // Iniciar el flujo según si es cancelación o retorno de pago
  useEffect(() => {
    if (!numeroPedido || ran.current) return
    ran.current = true

    if (esCancelacion) {
      // El usuario canceló en la página del proveedor — liberar stock reservado
      cancelarPedido(numeroPedido)
      return
    }

    if (provider === 'paypal' && paypalToken) {
      // URL de retorno PayPal con aprobación — capturar el pago directamente
      capturarPayPal(paypalToken, numeroPedido)
    } else {
      // Stripe (y otros) — el webhook confirma el pago; iniciamos polling
      iniciarPolling(numeroPedido)
    }
  }, [numeroPedido])

  if (estaOcupado(estado)) {
    return <PagoLoading estado={estado} stripeApproved={stripeApproved} />
  }

  if (estado === 'success') {
    return <PagoExito pagoData={pagoData} numeroPedido={numeroPedido} token={token} />
  }

  if (estado === 'cancelled') {
    return <PagoCancelado />
  }

  if (estado === 'timeout') {
    return <PagoPendiente pagoData={pagoData} stripeApproved={stripeApproved} />
  }

  return <PagoError error={error} numeroPedido={numeroPedido} />
}
