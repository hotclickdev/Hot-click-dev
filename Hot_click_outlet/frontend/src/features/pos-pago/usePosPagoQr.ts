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

/** Vista (y código de error, si corresponde) para la sesión leída del servidor. */
function vistaDesdeInfo(data: QrPagoInfo, resultado: string | null): { vista: PosPagoVista; error?: string } {
  const vistaQuery = vistaDesdeQuery(resultado, data.estado)
  if (vistaQuery) return { vista: vistaQuery }
  if (data.estado === 'EXPIRADO') return { vista: 'vencido' }
  if (data.estado === 'CANCELADO') return { vista: 'error', error: 'qr_invalido' }
  if (!data.items?.length) return { vista: 'error', error: 'sin_items' }
  return { vista: 'resumen' }
}

export function usePosPagoQr(token: string | undefined) {
  const [searchParams] = useSearchParams()
  const resultadoQuery = searchParams.get('resultado')

  const [info, setInfo] = useState<QrPagoInfo | null>(null)
  // Sin token la vista arranca en error: el efecto de carga no llama a setState de forma síncrona.
  const [vista, setVista] = useState<PosPagoVista>(token ? 'cargando' : 'error')
  const [mensajeError, setMensajeError] = useState<string | null>(token ? null : 'token_faltante')
  const [iniciandoPago, setIniciandoPago] = useState(false)
  const pollCount = useRef(0)

  const aplicarInfo = useCallback((data: QrPagoInfo) => {
    setInfo(data)
    const { vista: siguiente, error } = vistaDesdeInfo(data, resultadoQuery)
    setVista(siguiente)
    if (error) setMensajeError(error)
  }, [resultadoQuery])

  // Los setState quedan en los callbacks de la promesa: el efecto de carga no los llama de forma síncrona.
  const cargarInfo = useCallback((): Promise<void> => {
    if (!token) return Promise.resolve()
    return posService.infoQrSesion(token)
      .then((data) => aplicarInfo(data as QrPagoInfo))
      .catch(() => {
        setVista('error')
        setMensajeError('qr_invalido')
      })
  }, [token, aplicarInfo])

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
    recargar: cargarInfo,
    pagarHosted,
    reintentar,
    marcarExitoEmbed,
  }
}
