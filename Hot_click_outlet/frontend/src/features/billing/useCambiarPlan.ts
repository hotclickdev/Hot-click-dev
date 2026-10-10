import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { billingService, type CambiarPlanResultado } from '@/services/billingService'
import useTenantStore from '@/store/tenantStore'
import type { Id } from '@/types/api'
import { esBajada, excesosAlBajar, excesosDeRespuesta, type ExcesoPlan, type LimitesPlan } from './bajarPlanHelpers'
import { usoDelTenant } from './usoDelTenant'

function mensajeErrorPlan(err: unknown, fallback: string): string {
  if (typeof err !== 'object' || err === null || !('response' in err)) return fallback
  const error = (err as { response?: { data?: { error?: unknown } } }).response?.data?.error
  return typeof error === 'string' && error ? error : fallback
}

/** Excesos que manda el backend cuando rechaza una bajada (HTTP 409). */
function excesosDeError(err: unknown): ExcesoPlan[] {
  if (typeof err !== 'object' || err === null || !('response' in err)) return []
  return excesosDeRespuesta((err as { response?: { data?: unknown } }).response?.data)
}

/** Plan de destino con sus límites, para revisar una bajada antes de llamar al backend. */
export type DestinoPlan = LimitesPlan & { nombre: string }

export type BajadaBloqueada = { plan: string; excesos: ExcesoPlan[] }

/** Bajar con más uso del permitido: no se borra nada, se bloquea y se avisa qué ajustar. */
async function revisarBajada(destino: DestinoPlan, etiqueta: string): Promise<BajadaBloqueada | null> {
  if (!esBajada(useTenantStore.getState().planNombre, destino.nombre)) return null
  await useTenantStore.getState().loadTenantUso()
  const excesos = excesosAlBajar(destino, usoDelTenant(useTenantStore.getState()))
  return excesos.length > 0 ? { plan: etiqueta, excesos } : null
}

export type PagoOnvoPendiente = {
  subscriptionId: string
  customerId?: string
  publishableKey?: string
  planNombre?: string
}

type Options = {
  /** Ruta absoluta o relativa a la pantalla de éxito tras activar. */
  rutaExito: string
}

/**
 * Orquesta POST /billing/cambiar-plan y el cobro ONVO si hace falta.
 */
export function useCambiarPlan({ rutaExito }: Options) {
  const navigate = useNavigate()
  const loadTenantInfo = useTenantStore((s) => s.loadTenantInfo)
  const [loadingPlan, setLoadingPlan] = useState<Id | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pagoPendiente, setPagoPendiente] = useState<PagoOnvoPendiente | null>(null)
  const [bajadaBloqueada, setBajadaBloqueada] = useState<BajadaBloqueada | null>(null)

  const irAExito = useCallback(async () => {
    await loadTenantInfo()
    setPagoPendiente(null)
    setLoadingPlan(null)
    navigate(rutaExito)
  }, [loadTenantInfo, navigate, rutaExito])

  const seleccionarPlan = useCallback(async (planId: Id, destino?: DestinoPlan, etiquetaDestino?: string) => {
    setLoadingPlan(planId)
    setError(null)
    setBajadaBloqueada(null)
    try {
      const bloqueo = destino ? await revisarBajada(destino, etiquetaDestino ?? destino.nombre) : null
      if (bloqueo) {
        setBajadaBloqueada(bloqueo)
        setLoadingPlan(null)
        return
      }
      const { data } = await billingService.cambiarPlan(planId)
      const result = data as CambiarPlanResultado

      if (result.status === 'requiere_pago' && result.subscriptionId) {
        setPagoPendiente({
          subscriptionId: result.subscriptionId,
          customerId: result.customerId,
          publishableKey: result.publishableKey,
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
      const excesosServidor = excesosDeError(e)
      if (excesosServidor.length > 0) {
        setBajadaBloqueada({ plan: etiquetaDestino ?? destino?.nombre ?? '', excesos: excesosServidor })
      } else {
        setError(mensajeErrorPlan(e, 'Error al cambiar el plan'))
      }
      setLoadingPlan(null)
    }
  }, [irAExito, loadTenantInfo])

  const cancelarPago = useCallback(() => {
    setPagoPendiente(null)
  }, [])

  return {
    loadingPlan,
    error,
    setError,
    pagoPendiente,
    bajadaBloqueada,
    seleccionarPlan,
    irAExito,
    cancelarPago,
  }
}
