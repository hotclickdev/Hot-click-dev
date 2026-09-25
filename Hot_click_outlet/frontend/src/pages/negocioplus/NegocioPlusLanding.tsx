import type { CSSProperties } from 'react'
import NegocioPlusHero from './NegocioPlusHero'
import NegocioPlusTrustBar from './NegocioPlusTrustBar'
import NegocioPlusComparativa from './NegocioPlusComparativa'
import NegocioPlusComoFunciona from './NegocioPlusComoFunciona'
import NegocioPlusNegociosReales from './NegocioPlusNegociosReales'
import NegocioPlusQueIncluye from './NegocioPlusQueIncluye'
import NegocioPlusPanelPreview from './NegocioPlusPanelPreview'
import NegocioPlusPagos from './NegocioPlusPagos'
import NegocioPlusComoEntras from './NegocioPlusComoEntras'
import NegocioPlusPrecioDestacado from './NegocioPlusPrecioDestacado'
import NegocioPlusFaq from './NegocioPlusFaq'
import NegocioPlusCtaFinal from './NegocioPlusCtaFinal'

/** Paleta "ejecutiva" del plan Negocio Plus — misma que usa PlanLandingLayout para tono='ejecutivo'. */
const TONO_EJECUTIVO: CSSProperties = {
  '--hc-primary': 'var(--hc-blue-600)',
  '--hc-bg': '#F5F7FB',
  '--hc-surface': '#FFFFFF',
  '--hc-border': 'var(--hc-n-200)',
} as CSSProperties

/** Landing dedicada de /negocio-plus-plan, fiel al Figma "Landing — Negocio Plus". */
export default function NegocioPlusLanding() {
  return (
    <div style={TONO_EJECUTIVO}>
      <NegocioPlusHero />
      <NegocioPlusTrustBar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <NegocioPlusComparativa />
        <NegocioPlusComoFunciona />
        <NegocioPlusNegociosReales />
        <NegocioPlusQueIncluye />
        <NegocioPlusPanelPreview />
        <NegocioPlusPagos />
        <NegocioPlusComoEntras />
        <div className="py-10 sm:py-12 border-t" style={{ borderColor: 'var(--hc-border)' }}>
          <NegocioPlusPrecioDestacado />
        </div>
        <NegocioPlusFaq />
        <NegocioPlusCtaFinal />
      </div>
    </div>
  )
}
