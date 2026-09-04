import type { ReactNode } from 'react'
import { EncabezadoPagina } from './ui'
import { useSellerPlan, useSellerRuta } from './SellerPlanContext'
import { mapSellerPlanIdToApi } from './planesPageHelpers'
import CompararPlanesVista from './CompararPlanesVista'
import EntradaPagina from './motion/EntradaPagina'

/**
 * Comparar planes — chrome Seller + vista compartida.
 */
export default function CompararPlanesPage() {
  const plan = useSellerPlan()
  const ruta = useSellerRuta()

  return (
    <CompararPlanesVista
      planActualApi={mapSellerPlanIdToApi(plan.id)}
      rutaExito={ruta('plan/actualizado')}
      variante="seller"
      renderShell={({ children, error }) => (
        <ShellPlanes ruta={ruta} error={error}>{children}</ShellPlanes>
      )}
    />
  )
}

function ShellPlanes({
  children,
  error,
  ruta,
}: {
  children: ReactNode
  error: string | null
  ruta: (segmento?: string) => string
}) {
  return (
    <main className="px-5 pb-8 pt-[60px] md:px-12 md:py-12 md:pt-12">
      <EntradaPagina>
        <div className="md:hidden">
          <EncabezadoPagina
            titulo="Tu Plan"
            subtitulo="Elegí el plan que mejor se ajuste a tu negocio"
            volverA={ruta('opciones')}
          />
        </div>
        <header className="mb-5 hidden md:block">
          <h1 className="font-display text-[28px] font-bold">Tu Plan</h1>
          <p className="mt-1 text-sm text-hc-muted">Elegí el plan que mejor se ajuste a tu negocio</p>
        </header>
        {error ? <p className="mb-4 text-sm text-red-500">{error}</p> : null}
        {children}
      </EntradaPagina>
    </main>
  )
}
