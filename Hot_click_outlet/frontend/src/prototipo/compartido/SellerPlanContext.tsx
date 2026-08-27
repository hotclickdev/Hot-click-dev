import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { rutaSeller, type PlanConfig } from './plan'

const SellerPlanContext = createContext<PlanConfig | null>(null)

export function SellerPlanProvider({ plan, children }: { plan: PlanConfig; children: ReactNode }) {
  return <SellerPlanContext.Provider value={plan}>{children}</SellerPlanContext.Provider>
}

export function useSellerPlan(): PlanConfig {
  const plan = useContext(SellerPlanContext)
  if (!plan) {
    throw new Error('useSellerPlan requiere SellerPlanProvider')
  }
  return plan
}

export function useSellerRuta(): (segmento?: string) => string {
  const { basePath } = useSellerPlan()
  return (segmento = '') => rutaSeller(basePath, segmento)
}
