import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { billingService, type CambiarPlanResultado } from '@/services/billingService'
import useTenantStore from '@/store/tenantStore'
import type { Id } from '@/types/api'

function mensajeErrorPlan(err: unknown, fallback: string): string {
  if (typeof err !== 'object' || err === null || !('response' in err)) return fallback
  const error = (err as { response?: { data?: { error?: unknown } } }).response?.data?.error
  return typeof error === 'string' && error ? error : fallback
}

type Options = {
  /** Ruta absoluta o relativa a la pantalla de éxito tras activar. */
  rutaExito: string
}

/**
 * Orquesta POST /billing/cambiar-plan. Un plan de pago sin pasarela conectada vuelve 409 con un
 * mensaje claro, que queda en `error`.
 */
export function useCambiarPlan({ rutaExito }: Options) {
  const navigate = useNavigate()
  const loadTenantInfo = useTenantStore((s) => s.loadTenantInfo)
  const [loadingPlan, setLoadingPlan] = useState<Id | null>(null)
  const [error, setError] = useState<string | null>(null)

  const irAExito = useCallback(async () => {
    await loadTenantInfo()
    setLoadingPlan(null)
    navigate(rutaExito)
  }, [loadTenantInfo, navigate, rutaExito])

  const seleccionarPlan = useCallback(async (planId: Id) => {
    setLoadingPlan(planId)
    setError(null)
    try {
      const { data } = await billingService.cambiarPlan(planId)
      const result = data as CambiarPlanResultado

      if (result.status === 'requiere_pago') {
        setError(result.mensaje || 'Los pagos en línea no están disponibles por ahora. Tu plan actual sigue igual.')
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
  }, [irAExito, loadTenantInfo])

  return {
    loadingPlan,
    error,
    setError,
    seleccionarPlan,
    irAExito,
  }
}
