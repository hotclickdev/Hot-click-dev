import type { ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'
import MentalModelCoach from '@/components/ui/mentalModel/MentalModelCoach'

/**
 * Envoltorio de `/admin/pos/*`. Sigue html.dark vía `.hc-seller-theme`
 * (no fuerza blanco ni crema de `.hc-sistema-theme`).
 */
export default function POSShell({ children }: { children?: ReactNode }) {
  return (
    <div className="hc-seller-theme min-h-screen bg-hc-bg text-hc-text">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      {children}
      <MentalModelCoach />
    </div>
  )
}
