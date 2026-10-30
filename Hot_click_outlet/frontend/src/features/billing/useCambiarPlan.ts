import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { billingService, type CambiarPlanResultado } from '@/services/billingService'
import useTenantStore from '@/store/tenantStore'
import type { Id } from '@/types/api'

/** QA8: el negocio aún no está aprobado; no puede elegir ni pagar plan (409 del backend). */
export const MSG_EMPRESA_PENDIENTE_APROBACION = 'Tu negocio está en revisión; podrás elegir plan cuando lo aprobemos.'

export function mensajeErrorPlan(err: unknown, fallback: string): string {
  if (typeof err !== 'object' || err === null || !('response' in err)) return fallback
  const data = (err as { response?: { data?: { error?: unknown; codigo?: unknown } } }).response?.data
  if (data?.codigo === 'EMPRESA_PENDIENTE_APROBACION') return MSG_EMPRESA_PENDIENTE_APROBACION
  const error = data?.error
  return typeof error === 'string' && error ? error : fallback
}

/** Cobro Tilopay (legado; ya no lo devuelve /cambiar-plan desde Auditor 5 S-01). */
export type PagoPlanTilopay = {
  proveedor?: 'TILOPAY'
  orderNumber: string
  montoCrc: number
  sdkToken: string
  planNombre?: string
}

/** Auditor 5 S-01: cobro de mensualidad por ONVO (suscripción incompleta creada en el servidor). */
export type PagoPlanOnvo = {
  proveedor: 'ONVO'
  subscriptionId: string
  customerId?: string
  publishableKey?: string
  planNombre?: string
}

export type PagoPlanPendiente = PagoPlanTilopay | PagoPlanOnvo

/** Traduce la respuesta de /cambiar-plan a un cobro pendiente, o null si no requiere pago o faltan datos. */
export function pagoPendienteDe(result: CambiarPlanResultado): PagoPlanPendiente | null {
  if (result.status !== 'requiere_pago') return null
  if (result.subscriptionId && result.proveedor !== 'TILOPAY') {
    return {
      proveedor: 'ONVO',
      subscriptionId: result.subscriptionId,
      customerId: result.customerId,
      publishableKey: result.publishableKey,
      planNombre: result.planNombre,
    }
  }
  if (result.orderNumber && result.sdkToken && result.montoCrc) {
    return {
      proveedor: 'TILOPAY',
      orderNumber: result.orderNumber,
      montoCrc: result.montoCrc,
      sdkToken: result.sdkToken,
      planNombre: result.planNombre,
    }
  }
  return null
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
 * Orquesta POST /billing/cambiar-plan y el cobro Tilopay si hace falta; la baja a Emprendedor va por /billing/cancelar.
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
