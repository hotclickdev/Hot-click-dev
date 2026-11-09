import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { billingService, type CambiarPlanResultado } from '@/services/billingService'
import useTenantStore from '@/store/tenantStore'
import type { Id } from '@/types/api'
import { trasPagoEmbed, type EstadoActivacion } from './activacionPago'
import { esRequiereSolicitud, requiereSolicitud } from './solicitudCambioPlan'

/** QA8: el negocio aún no está aprobado; no puede elegir ni pagar plan (409 del backend). */
export const MSG_EMPRESA_PENDIENTE_APROBACION = 'Tu negocio está en revisión; podrás elegir plan cuando lo aprobemos.'

/** QA3-022: checkout al plan que ya está activo (409 PLAN_YA_ACTIVO). */
export const MSG_PLAN_YA_ACTIVO = 'Ya tenés este plan activo. No hace falta volver a contratarlo.'

export function mensajeErrorPlan(err: unknown, fallback: string): string {
  if (typeof err !== 'object' || err === null || !('response' in err)) return fallback
  const data = (err as { response?: { data?: { error?: unknown; codigo?: unknown } } }).response?.data
  if (data?.codigo === 'EMPRESA_PENDIENTE_APROBACION') return MSG_EMPRESA_PENDIENTE_APROBACION
  if (data?.codigo === 'PLAN_YA_ACTIVO') return MSG_PLAN_YA_ACTIVO
  const error = data?.error
  return typeof error === 'string' && error ? error : fallback
}

/** Auditor 5 S-01: cobro de mensualidad por ONVO (suscripción incompleta creada en el servidor). */
export type PagoPlanOnvo = {
  proveedor: 'ONVO'
  subscriptionId: string
  customerId?: string
  publishableKey?: string
  planNombre?: string
  montoUsd?: number
}

export type PagoPlanPendiente = PagoPlanOnvo

/** Traduce la respuesta de /cambiar-plan a un cobro pendiente, o null si no requiere pago o faltan datos. */
export function pagoPendienteDe(result: CambiarPlanResultado): PagoPlanPendiente | null {
  if (result.status !== 'requiere_pago') return null
  if (result.subscriptionId) {
    const pago: PagoPlanPendiente = {
      proveedor: 'ONVO',
      subscriptionId: result.subscriptionId,
      customerId: result.customerId,
      publishableKey: result.publishableKey,
      planNombre: result.planNombre,
    }
    if (typeof result.montoUsd === 'number' && result.montoUsd > 0) pago.montoUsd = result.montoUsd
    return pago
  }
  return null
}

/** Dónde volver tras confirmar el cobro del plan. */
export const CLAVE_RUTA_EXITO_PLAN = 'hc_plan_ruta_exito'

type Options = {
  /** Ruta absoluta o relativa a la pantalla de éxito tras activar. */
  rutaExito: string
  /** Plan actual (nombre API); con él se decide si el cambio va por solicitud. */
  planActual?: string | null
}

/** Cambio que no se hace solo: se abre el formulario de solicitud para este plan. */
export type SolicitudPendiente = { planId: Id; planNombre?: string | null }

/** Plan base sin mensualidad: bajar a él es cancelar, no cambiar de plan (precio 0 da 409 en /cambiar-plan). */
export const PLAN_BASE = 'EMPRENDEDOR'

/**
 * Decide el endpoint: bajar al plan base va por POST /billing/cancelar (al vencer el período);
 * cualquier otro plan, por POST /billing/cambiar-plan. Ojo: /cancelar solo admite rol EMPRENDEDOR (no ADMIN).
 */
export function rutaCambioPlan(nombrePlanDestino?: string | null): 'cancelar' | 'cambiar-plan' {
  return nombrePlanDestino?.toUpperCase() === PLAN_BASE ? 'cancelar' : 'cambiar-plan'
}

/**
 * Orquesta POST /billing/cambiar-plan y el cobro ONVO si hace falta; la baja a Emprendedor va por /billing/cancelar.
 */
export function useCambiarPlan({ rutaExito, planActual }: Options) {
  const navigate = useNavigate()
  const loadTenantInfo = useTenantStore((s) => s.loadTenantInfo)
  const [loadingPlan, setLoadingPlan] = useState<Id | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pagoPendiente, setPagoPendiente] = useState<PagoPlanPendiente | null>(null)
  const [solicitud, setSolicitud] = useState<SolicitudPendiente | null>(null)
  const [activacion, setActivacion] = useState<EstadoActivacion | null>(null)

  const irAExito = useCallback(async () => {
    await loadTenantInfo()
    setPagoPendiente(null)
    setLoadingPlan(null)
    setActivacion(null)
    navigate(rutaExito)
  }, [loadTenantInfo, navigate, rutaExito])

  /** El SDK avisó éxito: se confirma con ONVO. Pendiente no navega ni se trata como activo. */
  const confirmarPagoEmbed = useCallback(async () => {
    setActivacion('confirmando')
    const r = await trasPagoEmbed(() => billingService.reconciliarPago(), irAExito)
    if (r === 'pendiente') setActivacion('pendiente')
  }, [irAExito])

  const seleccionarPlan = useCallback(async (planId: Id, nombrePlanDestino?: string | null) => {
    setLoadingPlan(planId)
    setError(null)
    setSolicitud(null)
    if (requiereSolicitud(planActual, nombrePlanDestino)) {
      // Bajar sobre un plan cobrado: sin botón directo, la pyme manda una solicitud.
      setSolicitud({ planId, planNombre: nombrePlanDestino })
      setLoadingPlan(null)
      return
    }
    try {
      if (rutaCambioPlan(nombrePlanDestino) === 'cancelar') {
        await billingService.cancelar(false)
        setError('Listo: al vencer tu período pasás a Emprendedor. Hasta entonces seguís con tu plan actual.')
        setLoadingPlan(null)
        await loadTenantInfo()
        return
      }
      const { data } = await billingService.cambiarPlan(planId)
      const result = data as CambiarPlanResultado

      const pago = pagoPendienteDe(result)
      if (pago) {
        sessionStorage.setItem(CLAVE_RUTA_EXITO_PLAN, rutaExito)
        setPagoPendiente(pago)
        setLoadingPlan(null)
        return
      }

      if (result.status === 'activado' || result.status === 'actualizando') {
        await irAExito()
        return
      }

      if (result.status === 'pendiente_ciclo') {
        setError(result.mensaje || 'El cambio aplica al vencer el período actual')
        setLoadingPlan(null)
        await loadTenantInfo()
        return
      }

      setError('Respuesta inesperada al cambiar de plan')
      setLoadingPlan(null)
    } catch (e: unknown) {
      if (esRequiereSolicitud(e)) setSolicitud({ planId, planNombre: nombrePlanDestino })
      setError(mensajeErrorPlan(e, 'Error al cambiar el plan'))
      setLoadingPlan(null)
    }
  }, [irAExito, loadTenantInfo, rutaExito, planActual])

  const cancelarPago = useCallback(() => {
    setPagoPendiente(null)
    setActivacion(null)
  }, [])

  return {
    loadingPlan,
    error,
    setError,
    pagoPendiente,
    activacion,
    seleccionarPlan,
    irAExito,
    confirmarPagoEmbed,
    cancelarPago,
    solicitud,
    cerrarSolicitud: () => setSolicitud(null),
  }
}
