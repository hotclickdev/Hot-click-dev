import type { ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'
import ImpersonacionBanner from '@/components/ImpersonacionBanner'
import MentalModelCoach from '@/components/ui/mentalModel/MentalModelCoach'
import { useCabeceraPanelEnPos } from '@/pages/admin/pos/useCabeceraPanelEnPos'
import PanelCabeceraMovil from '@/prototipo/compartido/PanelCabeceraMovil'
import { normalizarPlanApi } from '@/prototipo/compartido/planesPageHelpers'
import useTenantStore from '@/store/tenantStore'
import { prefijoPorPlan } from '@/utils/planPaths'

/**
 * Envoltorio de `/admin/pos/*`. Sigue html.dark vía `.hc-seller-theme`
 * (no fuerza blanco ni crema de `.hc-sistema-theme`).
 * En celular, el vendedor ve la misma cabecera del panel (con flecha de volver).
 */
export default function POSShell({ children }: { children?: ReactNode }) {
  const conCabeceraPanel = useCabeceraPanelEnPos()
  const planNombre = useTenantStore((s) => s.planNombre)
  return (
    <div
      className="hc-seller-theme min-h-screen bg-hc-bg text-hc-text"
      style={{ backgroundColor: 'var(--hc-bg)' }}
    >
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <ImpersonacionBanner />
      {conCabeceraPanel ? (
        <PanelCabeceraMovil base={prefijoPorPlan(planNombre)} planApi={normalizarPlanApi(planNombre)} interna />
      ) : null}
      {children}
      <MentalModelCoach />
    </div>
  )
}
