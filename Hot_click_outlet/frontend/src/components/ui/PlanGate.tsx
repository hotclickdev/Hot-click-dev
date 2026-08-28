import { useEffect, useRef, type ReactNode } from 'react'
import useTenantStore from '@/store/tenantStore'
import UpgradePrompt from './UpgradePrompt'

type PlanGateProps = {
  feature: string
  planRequerido?: string
  fallback?: ReactNode
  silent?: boolean
  children: ReactNode
}

/**
 * Renderiza `children` solo si el plan activo incluye la feature indicada.
 * Si no, muestra UpgradePrompt con el plan requerido.
 */
export default function PlanGate({
  feature,
  planRequerido = 'PYME',
  fallback,
  silent = false,
  children,
}: PlanGateProps) {
  const hasFeature = useTenantStore((s) => s.hasFeature)
  const loaded = useTenantStore((s) => s.loaded)
  const loading = useTenantStore((s) => s.loading)
  const loadTenantInfo = useTenantStore((s) => s.loadTenantInfo)
  const attempted = useRef(false)

  useEffect(() => {
    if (!loaded && !loading && !attempted.current) {
      attempted.current = true
      loadTenantInfo()
    }
  }, [loaded, loading, loadTenantInfo])

  if (!loaded) {
    if (loading || !attempted.current) {
      if (silent) return null
      return (
        <div className="flex items-center justify-center py-24">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2"
            style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }}
          />
        </div>
      )
    }
    return children
  }

  if (hasFeature(feature)) return children
  if (silent) return null
  if (fallback) return fallback
  return <UpgradePrompt feature={feature} planRequerido={planRequerido} />
}
