import useTenantStore from '@/store/tenantStore'
import UpgradePrompt from './UpgradePrompt'

/**
 * Renderiza `children` solo si el plan activo incluye la feature indicada.
 * Si no, muestra <UpgradePrompt> con el plan requerido.
 *
 * Props:
 *   feature       string   — 'pos' | 'crm' | 'compras' | 'reportes' | 'ai' | 'api'
 *   planRequerido string   — 'PYME' | 'NEGOCIO_PLUS' (para el mensaje del prompt)
 *   fallback      node     — override del fallback (si no se pasa usa UpgradePrompt)
 *   silent        bool     — si true, renderiza null en vez de UpgradePrompt
 *
 * Ejemplo:
 *   <PlanGate feature="pos" planRequerido="PYME">
 *     <AdminPOS />
 *   </PlanGate>
 */
export default function PlanGate({ feature, planRequerido = 'PYME', fallback, silent = false, children }) {
  const hasFeature = useTenantStore(s => s.hasFeature)
  const loaded     = useTenantStore(s => s.loaded)

  // Mientras carga, no renderiza nada para evitar flash
  if (!loaded) return null

  if (hasFeature(feature)) return children

  if (silent) return null
  if (fallback) return fallback
  return <UpgradePrompt feature={feature} planRequerido={planRequerido} />
}
