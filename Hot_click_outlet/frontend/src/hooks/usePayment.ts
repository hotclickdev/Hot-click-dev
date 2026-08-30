import { useState, useCallback, useRef, useEffect } from 'react'
import { paymentService } from '../services/paymentService'
import type { CheckoutPayload } from '@/types/pedido'
import { sincronizarRetornoPagoAlIniciar } from '@/prototipo/visitante/pagoRetornoVisitante'

const MAX_INTENTOS = 3
const POLL_INTERVAL_MS = 3000
const POLL_MAX_ATTEMPTS = 60

const GUEST_KEY = 'hc-guest-checkout'

type PagoData = {
  total?: number
  proveedor?: string
  redirectUrl?: string
  estadoPago?: string
  numeroPedido?: string
}

function mensajeError(err: unknown, respaldo: string): string {
  if (!err || typeof err !== 'object' || !('response' in err)) return respaldo
  const data = (err as { response?: { data?: { message?: string } | string } }).response?.data
  if (typeof data === 'string') return data
  if (data && typeof data === 'object' && data.message) return data.message
  return respaldo
}

/**
 * Flujo de pago Stripe/SINPE/gift card. Mismo orden de llamadas que el hook original.
 */
export function usePayment() {
  const [estado, setEstado] = useState('idle')
  const [pagoData, setPagoData] = useState<PagoData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [intentos, setIntentos] = useState(0)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const iniciarPago = useCallback(async (checkoutPayload: CheckoutPayload, isGuest: boolean = false, isSinpe: boolean = false) => {
    sessionStorage.setItem(GUEST_KEY, isGuest ? '1' : '0')
    sincronizarRetornoPagoAlIniciar(globalThis.location.pathname)
    setEstado('loading')
    setError(null)
    setIntentos((i: number) => i + 1)
    try {
      let method
      if (isSinpe) {
        method = isGuest ? paymentService.guestSinpeCheckout : paymentService.sinpeCheckout
      } else {
        method = isGuest ? paymentService.guestCheckout : paymentService.checkout
      }
      const { data } = await method(checkoutPayload)
      setPagoData(data)
      if (data.proveedor === 'GIFT_CARD') {
        setEstado('gift_card_paid')
      } else if (!data.redirectUrl || data.proveedor === 'SINPE') {
        setEstado('sinpe_pendiente')
      } else {
        setEstado('redirecting')
        if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current)
        redirectTimeoutRef.current = setTimeout(() => {
          redirectTimeoutRef.current = null
          setError(
            'La página de pago no cargó. Es posible que tu navegador bloqueó la redirección. ' +
            'Intenta de nuevo o contáctanos por WhatsApp.',
          )
          setEstado('failed')
        }, 12000)
        globalThis.location.href = data.redirectUrl
      }
    } catch (err: unknown) {
      setError(mensajeError(err, 'No se pudo iniciar el pago. Intenta de nuevo.'))
      setEstado('failed')
    }
  }, [])

  const cancelarPedido = useCallback(async (numeroPedido: string) => {
    setEstado('polling')
    try {
      await paymentService.guestCancelarPedido(numeroPedido)
    } catch {
      try {
        await paymentService.cancelarPedido(numeroPedido)
      } catch {
        // Si ya estaba cancelado o hubo error, igual mostramos estado cancelado
      }
    }
    setEstado('cancelled')
  }, [])

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const iniciarPolling = useCallback((numeroPedido: string) => {
    stopPolling()
    let attempts = 0
    setEstado('polling')
    setError(null)

    const tick = async () => {
      attempts++
      try {
        const { data } = await paymentService.consultarEstado(numeroPedido)
        setPagoData(data)
        const e = data.estadoPago
        if (e === 'CAPTURADO') { setEstado('success'); return }
        if (e === 'CANCELADO') { setEstado('cancelled'); return }
        if (e === 'FALLIDO') { setEstado('failed'); return }
      } catch {
        // red lenta o error transitorio: seguir intentando
      }

      if (attempts >= POLL_MAX_ATTEMPTS) {
        setEstado('timeout')
        return
      }
      pollRef.current = setTimeout(tick, POLL_INTERVAL_MS)
    }

    pollRef.current = setTimeout(tick, 0)
  }, [stopPolling])

  const verificarEstado = useCallback(async (numeroPedido: string) => {
    setEstado('polling')
    try {
      const { data } = await paymentService.consultarEstado(numeroPedido)
      setPagoData(data)
      if (data.estadoPago === 'CAPTURADO') {
        setEstado('success')
      } else if (data.estadoPago === 'CANCELADO') {
        setEstado('cancelled')
      } else if (data.estadoPago === 'FALLIDO') {
        setEstado('failed')
      } else {
        setEstado('pending')
      }
      return data
    } catch {
      setError('No se pudo verificar el estado del pago.')
      setEstado('failed')
    }
  }, [])

  const reintentar = useCallback(
    async (checkoutPayload: CheckoutPayload) => {
      if (intentos >= MAX_INTENTOS) {
        setError('Máximo de intentos alcanzado. Contacta soporte en hotclick.cr@gmail.com')
        return
      }
      await iniciarPago(checkoutPayload)
    },
    [intentos, iniciarPago],
  )

  useEffect(() => () => {
    stopPolling()
    if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current)
  }, [stopPolling])

  const reset = useCallback(() => {
    stopPolling()
    if (redirectTimeoutRef.current) {
      clearTimeout(redirectTimeoutRef.current)
      redirectTimeoutRef.current = null
    }
    setEstado('idle')
    setError(null)
    setPagoData(null)
  }, [stopPolling])

  return {
    estado,
    pagoData,
    error,
    intentos,
    maxIntentos: MAX_INTENTOS,
    iniciarPago,
    cancelarPedido,
    verificarEstado,
    iniciarPolling,
    stopPolling,
    reintentar,
    reset,
  }
}
