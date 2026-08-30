import type { ReactNode, CSSProperties } from 'react'
import { Helmet } from 'react-helmet-async'
import MentalModelCoach from '@/components/ui/mentalModel/MentalModelCoach'
import { posUi } from '@/pages/admin/pos/posApariencia'

/**
 * Envoltorio de `/admin/pos/*`. Blanco Figma (no crema `--hc-bg` de Sistema).
 */
export default function POSShell({ children }: { children?: ReactNode }) {
  const estilo: CSSProperties = {
    backgroundColor: posUi.fondo,
    color: posUi.texto,
    // Evita que hc-sistema-theme pinte crema (#ede5da) en la caja
    ['--hc-bg' as string]: posUi.fondo,
    ['--hc-surface' as string]: posUi.barra,
    ['--hc-surface-2' as string]: posUi.panel,
    ['--hc-border' as string]: posUi.borde,
    ['--hc-muted' as string]: posUi.muted,
    ['--hc-text' as string]: posUi.texto,
  }

  return (
    <div className="hc-sistema-theme min-h-screen" style={estilo}>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      {children}
      <MentalModelCoach />
    </div>
  )
}
