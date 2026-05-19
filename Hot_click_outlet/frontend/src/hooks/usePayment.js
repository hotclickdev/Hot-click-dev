import { useState, useCallback, useRef } from 'react'
import { paymentService } from '../services/paymentService'

const MAX_INTENTOS     = 3
const POLL_INTERVAL_MS = 3000
const POLL_MAX_ATTEMPTS = 30  // 90 segundos

export function usePayment() {
  const [estado, setEstado]     = useState('idle')
  // idle | loading | redirecting | polling | capturing | success | failed | cancelled | timeout
  const [pagoData, setPagoData] = useState(null)
  const [error, setError]       = useState(null)
  const [intentos, setIntentos] = useState(0)
  const pollRef                 = useRef(null)

  const iniciarPago = useCallback(async (checkoutPayload) => {
    setEstado('loading')
    setError(null)
    try {
      const { data } = await paymentService.checkout(checkoutPayload)
      setPagoData(data)
      setEstado('redirecting')
      window.location.href = data.redirectUrl
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        'No se pudo iniciar el pago. Intenta de nuevo.'
      setError(msg)
      setEstado('failed')
    }
  }, [])

  const cancelarPedido = useCallback(async (numeroPedido) => {
    setEstado('polling')
    try {
      await paymentService.cancelarPedido(numeroPedido)
    } catch {
      // Si ya estaba cancelado o hubo error, igual mostramos estado cancelado
    }
    setEstado('cancelled')
  }, [])

  const capturarPayPal = useCallback(async (paypalOrderId, numeroPedido) => {
    setEstado('capturing')
    setError(null)
    try {
      const { data } = await paymentService.capturarPayPal(paypalOrderId, numeroPedido)
      setPagoData(data)
      if (data.estadoPago === 'CAPTURADO') {
        setEstado('success')
      } else if (data.estadoPago === 'CANCELADO') {
        setEstado('cancelled')
      } else {
        setEstado('failed')
        setError('El pago no pudo completarse.')
      }
      return data
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        'Error al capturar el pago con PayPal.'
      if (typeof msg === 'string' && msg.includes('ORDER_NOT_APPROVED')) {
        setEstado('cancelled')
      } else {
        setError(typeof msg === 'string' ? msg : 'Error al capturar el pago con PayPal.')
        setEstado('failed')
      }
    }
  }, [])

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const iniciarPolling = useCallback((numeroPedido) => {
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
        if (e === 'CAPTURADO') { setEstado('success');   return }
        if (e === 'CANCELADO') { setEstado('cancelled'); return }
        if (e === 'FALLIDO')   { setEstado('failed');    return }
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

  // Mantenemos verificarEstado como fallback de un solo disparo
  const verificarEstado = useCallback(async (numeroPedido) => {
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
    async (checkoutPayload) => {
      if (intentos >= MAX_INTENTOS) {
        setError('Máximo de intentos alcanzado. Contacta soporte en hotclick.cr@gmail.com')
        return
      }
      setIntentos((i) => i + 1)
      await iniciarPago(checkoutPayload)
    },
    [intentos, iniciarPago]
  )

  const reset = useCallback(() => {
    stopPolling()
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
    capturarPayPal,
    verificarEstado,
    iniciarPolling,
    stopPolling,
    reintentar,
    reset,
  }
}
