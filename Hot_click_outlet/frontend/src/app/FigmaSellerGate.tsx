import { useEffect } from 'react'
import useTenantStore from '@/store/tenantStore'
import useAuthStore from '@/store/authStore'
import EmprendedorRoutes from '@/prototipo/emprendedor/EmprendedorRoutes'
import PymeRoutes from '@/prototipo/pyme/PymeRoutes'
import NegocioPlusRoutes from '@/prototipo/negocio-plus/NegocioPlusRoutes'

/**
 * Elige shell Figma Emprendedor / PYME / Negocio Plus según el plan del tenant.
 */
export default function FigmaSellerGate() {
  const empresaId = useAuthStore((s) => s.empresaId)
  const planNombre = useTenantStore((s) => s.planNombre)
  const loaded = useTenantStore((s) => s.loaded)
  const loading = useTenantStore((s) => s.loading)
  const loadTenantInfo = useTenantStore((s) => s.loadTenantInfo)

  useEffect(() => {
    if (empresaId) loadTenantInfo()
  }, [empresaId, loadTenantInfo])

  if (empresaId && !loaded && loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-hc-bg">
        <div
          className="size-8 animate-spin rounded-full border-2"
          style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }}
        />
      </div>
    )
  }

  if (planNombre === 'PYME') return <PymeRoutes />
  if (planNombre === 'NEGOCIO_PLUS') return <NegocioPlusRoutes />
  return <EmprendedorRoutes />
}
