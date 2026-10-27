import { esperandoCupo } from '@/services/emprendeCupoService'
import type { TrialTarjetaEstado } from '@/services/billingService'

/**
 * Lógica pura (sin React) de la tarjeta del trial Emprendedor: qué ve el dueño y con qué texto.
 * El backend decide la elegibilidad; acá solo se traduce su respuesta a una vista. Ante la duda no se muestra
 * ningún botón (fail-closed): un error de verificación nunca se presenta como «tarjeta guardada» ni como «sin tarjeta».
 */
export type VistaTarjetaTrial =
  | { tipo: 'oculta' }
  | { tipo: 'cargando' }
  | { tipo: 'espera_cupo' }
  | { tipo: 'agregar'; dias: number }
  | { tipo: 'guardada'; dias: number }
  | { tipo: 'no_verificable'; dias: number }

export type EntradaVista = {
  estadoPlan: string | null | undefined
  /** trialDias de /tenant/info (−1 si no hay trial). */
  trialDias: number
  /** Respuesta de GET /billing/trial/tarjeta; null si aún no llegó o no aplica. */
  estado: TrialTarjetaEstado | null
  cargando: boolean
  /** El backend no pudo verificar la tarjeta (503/red): no se afirma nada. */
  errorVerificacion: boolean
}

export const PLAN_TRIAL = 'TRIAL'

/** ¿Hay que consultar el estado de la tarjeta? Solo en TRIAL (PENDIENTE_CUPO aún no tiene suscripción ni días). */
export function debeConsultarTarjeta(estadoPlan: string | null | undefined): boolean {
  return estadoPlan === PLAN_TRIAL
}

function diasSeguros(...candidatos: Array<number | null | undefined>): number {
  for (const d of candidatos) {
    if (typeof d === 'number' && Number.isFinite(d) && d >= 0) return Math.floor(d)
  }
  return 0
}

export function vistaTarjetaTrial(e: EntradaVista): VistaTarjetaTrial {
  if (esperandoCupo(e.estadoPlan)) return { tipo: 'espera_cupo' }
  if (e.estadoPlan !== PLAN_TRIAL) return { tipo: 'oculta' }
  if (e.cargando) return { tipo: 'cargando' }
  const dias = diasSeguros(e.estado?.trialDias, e.trialDias)
  if (e.errorVerificacion) return { tipo: 'no_verificable', dias }
  if (!e.estado || !e.estado.elegible) return { tipo: 'oculta' }
  return e.estado.tarjetaGuardada ? { tipo: 'guardada', dias } : { tipo: 'agregar', dias }
}

/** El botón «Agregar tarjeta» solo existe en la vista `agregar`. */
export function mostrarBotonAgregarTarjeta(v: VistaTarjetaTrial): boolean {
  return v.tipo === 'agregar'
}

/** Mensaje del servidor si es un texto, si no el de respaldo. Nunca expone detalles técnicos. */
export function mensajeErrorTarjeta(err: unknown, respaldo: string): string {
  const data = (err as { response?: { data?: { error?: unknown } } } | null)?.response?.data
  return typeof data?.error === 'string' && data.error.trim() ? data.error : respaldo
}

/** Código HTTP del error de axios, o null. */
export function estadoHttp(err: unknown): number | null {
  const st = (err as { response?: { status?: unknown } } | null)?.response?.status
  return typeof st === 'number' ? st : null
}

/** US$ con símbolo de la moneda; null si el backend no fijó el monto (no se inventa un precio). */
export function formatoUsd(monto: number | null | undefined): string | null {
  if (typeof monto !== 'number' || !Number.isFinite(monto) || monto <= 0) return null
  const hayDecimales = Math.round(monto * 100) % 100 !== 0
  return `US$${monto.toLocaleString('en-US', { minimumFractionDigits: hayDecimales ? 2 : 0, maximumFractionDigits: 2 })}`
}

/** Intentos para ver reflejada la tarjeta en ONVO tras confirmar en el SDK (ms entre intentos). */
export const REINTENTOS_CONFIRMACION = 4
export const ESPERA_CONFIRMACION_MS = 1500
