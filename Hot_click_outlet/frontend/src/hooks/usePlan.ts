import useTenantStore from '@/store/tenantStore'

/**
 * Hook de conveniencia para consultar el plan activo del tenant.
 *
 * Uso:
 *   const { plan, hasFeature, isAtLimit, trialDias } = usePlan()
 *
 *   hasFeature('pos')       → true/false según el plan
 *   isAtLimit('productos')  → true si el uso alcanzó el máximo
 *   trialDias               → días restantes de trial (-1 si no es trial)
 */
export function usePlan() {
  const planNombre   = useTenantStore((s) => s.planNombre)
  const estadoPlan   = useTenantStore((s) => s.estadoPlan)
  const trialDias    = useTenantStore((s) => s.trialDias)
  const hasFeature   = useTenantStore((s) => s.hasFeature)
  const isAtLimit    = useTenantStore((s) => s.isAtLimit)
  const usoPorcentaje = useTenantStore((s) => s.usoPorcentaje)
  const features     = useTenantStore((s) => s.features)

  const isPro        = planNombre === 'PRO' || planNombre === 'ENTERPRISE'
  const isEnterprise = planNombre === 'ENTERPRISE'
  const isTrial      = estadoPlan === 'TRIAL'
  const isVencido    = estadoPlan === 'VENCIDO'

  return {
    plan: planNombre,
    estadoPlan,
    trialDias,
    features,
    isPro,
    isEnterprise,
    isTrial,
    isVencido,
    hasFeature,
    isAtLimit,
    usoPorcentaje,
  }
}

export default usePlan
