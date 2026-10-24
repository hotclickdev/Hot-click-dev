import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { billingService, type CambiarPlanResultado } from '@/services/billingService'
import useTenantStore from '@/store/tenantStore'
import type { Id } from '@/types/api'

/** Códigos 409 del backend cuando el cobro de planes no está disponible: nunca se activa el plan. */
const CODIGOS_PLAN_NO_DISPONIBLE = ['COBRO_PLAN_NO_DISPONIBLE', 'PLAN_SIN_PRECIO', 'PLAN_NO_DISPONIBLE'] as const

export const MENSAJE_COBRO_PLAN_NO_DISPONIBLE =
  'Por ahora no podés activar este plan en línea: el cobro de planes todavía no está habilitado. Tu plan actual sigue igual y no se te cobró nada. Escribinos a soporte si querés que te avisemos cuando esté listo.'

/** Traduce el error del API a un texto para la persona; los 409 de plan no disponible nunca se muestran crudos. */
export function mensajeErrorPlan(err: unknown, fallback: string): string {
  if (typeof err !== 'object' || err === null || !('response' in err)) return fallback
  const resp = (err as { response?: { status?: number; data?: { error?: unknown; codigo?: unknown } } }).response
  const codigo = typeof resp?.data?.codigo === 'string' ? resp.data.codigo : ''
  const error = resp?.data?.error
  const texto = typeof error === 'string' ? error : ''
  if (CODIGOS_PLAN_NO_DISPONIBLE.some((c) => c === codigo || texto.includes(c))) return MENSAJE_COBRO_PLAN_NO_DISPONIBLE
  if (resp?.status === 409) return MENSAJE_COBRO_PLAN_NO_DISPONIBLE
  return texto || fallback
}

export type PagoPlanPendiente = {
  orderNumber: string
  montoCrc: number
  sdkToken: string
  planNombre?: string
}

/** Dónde volver tras confirmar el cobro en /billing/tilopay/respuesta. */
export const CLAVE_RUTA_EXITO_PLAN = 'hc_plan_ruta_exito'

type Options = {
  /** Ruta absoluta o relativa a la pantalla de éxito tras activar. */
  rutaExito: string
}

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
 * Orquesta POST /billing/cambiar-plan y el cobro si hace falta; la baja a Emprendedor va por /billing/cancelar.
 */
export function useCambiarPlan({ rutaExito }: Options) {
  const navigate = useNavigate()
  const loadTenantInfo = useTenantStore((s) => s.loadTenantInfo)
  const [loadingPlan, setLoadingPlan] = useState<Id | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pagoPendiente, setPagoPendiente] = useState<PagoPlanPendiente | null>(null)

  const irAExito = useCallback(async () => {
    await loadTenantInfo()
    setPagoPendiente(null)
    setLoadingPlan(null)
    navigate(rutaExito)
  }, [loadTenantInfo, navigate, rutaExito])

  const seleccionarPlan = useCallback(async (planId: Id, nombrePlanDestino?: string | null) => {
    setLoadingPlan(planId)
    setError(null)
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

      if (result.status === 'requiere_pago' && result.orderNumber && result.sdkToken && result.montoCrc) {
        sessionStorage.setItem(CLAVE_RUTA_EXITO_PLAN, rutaExito)
        setPagoPendiente({
          orderNumber: result.orderNumber,
          montoCrc: result.montoCrc,
          sdkToken: result.sdkToken,
          planNombre: result.planNombre,
        })
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
      setError(mensajeErrorPlan(e, 'Error al cambiar el plan'))
      setLoadingPlan(null)
    }
  }, [irAExito, loadTenantInfo, rutaExito])

  const cancelarPago = useCallback(() => {
    setPagoPendiente(null)
  }, [])

  return {
    loadingPlan,
    error,
    setError,
    pagoPendiente,
    seleccionarPlan,
    irAExito,
    cancelarPago,
  }
}
