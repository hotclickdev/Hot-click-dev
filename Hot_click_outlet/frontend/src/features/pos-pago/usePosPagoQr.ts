import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { posService } from '@/services/posService'
import type { PosPagoVista, QrPagoInfo } from './posPagoTypes'

const POLL_MS = 2500
const POLL_MAX = 24

function vistaDesdeQuery(resultado: string | null, estado?: string): PosPagoVista | null {
  if (resultado === 'exito') return 'exito'
  if (resultado === 'cancelado') return 'cancelado'
  if (estado === 'PAGADO') return 'pagado'
  return null
}

export function usePosPagoQr(token: string | undefined) {
  const [searchParams] = useSearchParams()
  const resultadoQuery = searchParams.get('resultado')

  const [info, setInfo] = useState<QrPagoInfo | null>(null)
  const [vista, setVista] = useState<PosPagoVista>('cargando')
  const [mensajeError, setMensajeError] = useState<string | null>(null)
  const [iniciandoPago, setIniciandoPago] = useState(false)
  const pollCount = useRef(0)

  const cargarInfo = useCallback(async () => {
    if (!token) {
      setVista('error')
      setMensajeError('token_faltante')
      return
    }
    try {
      const data = await posService.infoQrSesion(token) as QrPagoInfo
      setInfo(data)
      const vistaQuery = vistaDesdeQuery(resultadoQuery, data.estado)
      if (vistaQuery) {
        setVista(vistaQuery)
        return
      }
      if (data.estado === 'EXPIRADO' || data.estado === 'CANCELADO') {
        setVista('error')
        setMensajeError('qr_invalido')
        return
      }
      if (data.estado === 'PAGADO') {
        setVista('pagado')
        return
      }
      if (!data.items?.length) {
        setVista('error')
        setMensajeError('sin_items')
        return
      }
      setVista('resumen')
    } catch {
      setVista('error')
      setMensajeError('qr_invalido')
    }
  }, [token, resultadoQuery])

  useEffect(() => {
    void cargarInfo()
  }, [cargarInfo])

  useEffect(() => {
    if (!token || vista !== 'exito') return
    pollCount.current = 0

    const poll = async () => {
      try {
        const { estado } = await posService.estadoQrSesion(token) as { estado?: string }
        if (estado === 'PAGADO') {
          setVista('pagado')
          return true
        }
      } catch {
        /* seguir intentando */
      }
      pollCount.current += 1
      return pollCount.current >= POLL_MAX
    }

    const id = window.setInterval(async () => {
      const fin = await poll()
      if (fin) window.clearInterval(id)
    }, POLL_MS)

    return () => window.clearInterval(id)
  }, [token, vista])

  const pagarHosted = useCallback(async () => {
    if (!token) return
    setIniciandoPago(true)
    setMensajeError(null)
    try {
      const { checkoutUrl } = await posService.iniciarStripeQr(token) as { checkoutUrl?: string }
      if (!checkoutUrl) throw new Error('sin_url')
      window.location.href = checkoutUrl
    } catch {
      setMensajeError('pago_fallido')
      setIniciandoPago(false)
    }
  }, [token])

  const reintentar = useCallback(() => {
    setMensajeError(null)
    setVista('resumen')
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('resultado')
      window.history.replaceState({}, '', url.pathname)
    }
  }, [])

  const marcarExitoEmbed = useCallback(() => {
    setVista('exito')
  }, [])

  return {
    info,
    vista,
    mensajeError,
    iniciandoPago,
    pagarHosted,
    reintentar,
    marcarExitoEmbed,
  }
}
