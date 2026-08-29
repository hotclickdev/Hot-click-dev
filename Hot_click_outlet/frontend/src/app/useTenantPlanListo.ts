import { useEffect } from 'react'
import useAuthStore from '@/store/authStore'
import useTenantStore from '@/store/tenantStore'

/**
 * Carga el plan del tenant para gates de ruta. Sin empresa, no espera.
 */
export function useTenantPlanListo() {
  const empresaId = useAuthStore((s) => s.empresaId)
  const loaded = useTenantStore((s) => s.loaded)
  const planNombre = useTenantStore((s) => s.planNombre)
  const loadTenantInfo = useTenantStore((s) => s.loadTenantInfo)

  useEffect(() => {
    if (empresaId) loadTenantInfo()
  }, [empresaId, loadTenantInfo])

  const esperando = Boolean(empresaId && !loaded)
  return { planNombre, esperando }
}
