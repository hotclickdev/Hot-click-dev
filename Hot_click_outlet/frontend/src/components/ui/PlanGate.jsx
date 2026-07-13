import { useEffect, useRef } from 'react'
import useTenantStore from '@/store/tenantStore'
import UpgradePrompt from './UpgradePrompt'

/**
 * Renderiza `children` solo si el plan activo incluye la feature indicada.
 * Si no, muestra <UpgradePrompt> con el plan requerido.
 *
 * Es autosuficiente: si el tenant no está cargado (p. ej. en rutas fuera de
 * AdminLayout, cuyo unmount limpia el store), dispara loadTenantInfo() y
 * muestra un spinner. Nunca renderiza null de forma permanente — eso dejaba
 * la pantalla en blanco sin salida. Si la carga falla, deja pasar: el
 * backend hace el gate real por plan en cada endpoint.
 *
 * Props:
 *   feature       string   — 'pos' | 'crm' | 'compras' | 'reportes' | 'ai' | 'api'
 *   planRequerido string   — 'PYME' | 'NEGOCIO_PLUS' (para el mensaje del prompt)
 *   fallback      node     — override del fallback (si no se pasa usa UpgradePrompt)
 *   silent        bool     — si true, renderiza null en vez de UpgradePrompt
 *
 * Ejemplo:
 *   <PlanGate feature="reportes" planRequerido="PYME">
 *     <AdminExecutive />
 *   </PlanGate>
 */
export default function PlanGate({ feature, planRequerido = 'PYME', fallback, silent = false, children }) {
  const hasFeature     = useTenantStore(s => s.hasFeature)
  const loaded         = useTenantStore(s => s.loaded)
  const loading        = useTenantStore(s => s.loading)
  const loadTenantInfo = useTenantStore(s => s.loadTenantInfo)
  const attempted      = useRef(false)

  useEffect(() => {
    if (!loaded && !loading && !attempted.current) {
      attempted.current = true
      loadTenantInfo()
    }
  }, [loaded, loading, loadTenantInfo])

  if (!loaded) {
    // Carga en curso (o por dispararse en el próximo efecto)
    if (loading || !attempted.current) {
      if (silent) return null
      return (
        <div className="flex items-center justify-center py-24">
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }}
          />
        </div>
      )
    }
    // La carga falló: no bloquear la UI — el backend valida el plan igual
    return children
  }

  if (hasFeature(feature)) return children

  if (silent) return null
  if (fallback) return fallback
  return <UpgradePrompt feature={feature} planRequerido={planRequerido} />
}
