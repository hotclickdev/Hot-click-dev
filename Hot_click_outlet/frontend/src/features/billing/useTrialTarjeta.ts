import { useCallback, useEffect, useRef, useState } from 'react'
import { billingService, type TrialTarjetaEstado } from '@/services/billingService'
import {
  ESPERA_CONFIRMACION_MS,
  REINTENTOS_CONFIRMACION,
  estadoHttp,
  mensajeErrorTarjeta,
} from './trialTarjeta'

export type PagoTrial = { subscriptionId: string; customerId?: string; publishableKey?: string }

type Opciones = {
  /** Solo se consulta con el plan en TRIAL y rol dueño; si no, no se hace ninguna llamada. */
  activo: boolean
  /** Textos ya traducidos (el hook no conoce i18n). */
  textos: { errorGenerico: string; errorIniciar: string }
}

const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Estado de la tarjeta del trial + acción «Agregar tarjeta» (abre el SDK de ONVO sobre la suscripción del trial). */
export function useTrialTarjeta({ activo, textos }: Opciones) {
  const [estado, setEstado] = useState<TrialTarjetaEstado | null>(null)
  const [consultado, setConsultado] = useState(false)
  const [errorVerificacion, setErrorVerificacion] = useState(false)
  const [pago, setPago] = useState<PagoTrial | null>(null)
  const [iniciando, setIniciando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [sinConfirmar, setSinConfirmar] = useState(false)
  const [simulada, setSimulada] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const vivo = useRef(true)
  const { errorGenerico, errorIniciar } = textos

  useEffect(() => {
    vivo.current = true
    return () => { vivo.current = false }
  }, [])

  const cargar = useCallback(async (): Promise<TrialTarjetaEstado | null> => {
    try {
      const { data } = await billingService.getTrialTarjeta()
      if (!vivo.current) return null
      setEstado(data)
      setErrorVerificacion(false)
      return data
    } catch (e) {
      if (!vivo.current) return null
      // 403: no es el propietario → sin tarjeta que mostrar. Cualquier otro fallo: no se afirma nada.
      if (estadoHttp(e) === 403) {
        setEstado(null)
        setErrorVerificacion(false)
      } else {
        setEstado(null)
        setErrorVerificacion(true)
      }
      return null
    }
  }, [])

  useEffect(() => {
    if (!activo) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- consulta inicial al backend; setState ocurre al resolver la promesa
    void cargar().finally(() => { if (vivo.current) setConsultado(true) })
  }, [activo, cargar])
  // Mientras el plan permite la tarjeta y la primera consulta no volvió, se considera «cargando».
  const cargando = activo && !consultado

  const agregarTarjeta = useCallback(async () => {
    setIniciando(true)
    setError(null)
    setSinConfirmar(false)
    try {
      const { data } = await billingService.iniciarTrialTarjeta()
      if (!vivo.current) return
      if (data.status === 'requiere_tarjeta' && data.subscriptionId) {
        setPago({ subscriptionId: data.subscriptionId, customerId: data.customerId, publishableKey: data.publishableKey })
      } else if (data.status === 'tarjeta_guardada') {
        await cargar()
      } else if (data.status === 'mock') {
        setSimulada(true) // solo dev/test sin llave de ONVO: no hay tarjeta real
      } else {
        setError(errorIniciar)
      }
    } catch (e) {
      if (vivo.current) setError(mensajeErrorTarjeta(e, errorIniciar))
    } finally {
      if (vivo.current) setIniciando(false)
    }
  }, [cargar, errorIniciar])

  /** El SDK confirmó la tarjeta: se verifica en el servidor (fuente de verdad) con unos reintentos cortos. */
  const alConfirmarTarjeta = useCallback(async () => {
    setPago(null)
    setConfirmando(true)
    setSinConfirmar(false)
    let guardada = false
    for (let i = 0; i < REINTENTOS_CONFIRMACION && !guardada; i++) {
      if (i > 0) await esperar(ESPERA_CONFIRMACION_MS)
      if (!vivo.current) return
      const e = await cargar()
      guardada = !!e?.tarjetaGuardada
    }
    if (!vivo.current) return
    setConfirmando(false)
    setSinConfirmar(!guardada)
  }, [cargar])

  const alFallarSdk = useCallback((mensaje: string) => {
    setError(mensaje || errorGenerico)
  }, [errorGenerico])

  const cancelar = useCallback(() => { setPago(null); setError(null) }, [])

  return {
    estado, cargando, errorVerificacion, pago, iniciando, confirmando, sinConfirmar, simulada, error,
    agregarTarjeta, alConfirmarTarjeta, alFallarSdk, cancelar, recargar: cargar,
  }
}
