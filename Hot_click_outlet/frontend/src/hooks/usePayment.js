import { useState, useCallback } from 'react'
import { paymentService } from '../services/paymentService'

const MAX_INTENTOS = 3

export function usePayment() {
  const [estado, setEstado]     = useState('idle')
  // idle | loading | redirecting | polling | capturing | success | failed | cancelled | pending
  const [pagoData, setPagoData] = useState(null)
  const [error, setError]       = useState(null)
  const [intentos, setIntentos] = useState(0)

  /**
   * Inicia el flujo de pago con el proveedor elegido.
   * @param {{ items, metodoEnvio, bodegaId, notas, provider }} checkoutPayload
   */
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

  /**
   * Captura el pago PayPal tras el redirect de aprobación.
   * Solo se llama desde PaymentStatusPage cuando provider=paypal.
   */
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
      setError(msg)
      setEstado('failed')
    }
  }, [])

  /**
   * Consulta el estado del pago (usado para PayXpert y como fallback).
   */
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
    } catch (err) {
      setError('No se pudo verificar el estado del pago.')
      setEstado('failed')
    }
  }, [])

  const reintentar = useCallback(
    async (checkoutPayload) => {
      if (intentos >= MAX_INTENTOS) {
        setError('Máximo de intentos alcanzado. Contacta soporte en soporte@hotclick.com')
        return
      }
      setIntentos((i) => i + 1)
      await iniciarPago(checkoutPayload)
    },
    [intentos, iniciarPago]
  )

  const reset = useCallback(() => {
    setEstado('idle')
    setError(null)
    setPagoData(null)
  }, [])

  return {
    estado,
    pagoData,
    error,
    intentos,
    maxIntentos: MAX_INTENTOS,
    iniciarPago,
    capturarPayPal,
    verificarEstado,
    reintentar,
    reset,
  }
}
