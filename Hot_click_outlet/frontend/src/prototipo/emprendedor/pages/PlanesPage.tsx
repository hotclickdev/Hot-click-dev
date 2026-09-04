import { useMemo, type ReactNode } from 'react'
import CabeceraAtras from '../ui/CabeceraAtras'
import { RUTA_EMPRENDEDOR } from '../constants'
import useTenantStore from '@/store/tenantStore'
import CompararPlanesVista from '@/prototipo/compartido/CompararPlanesVista'
import EntradaPagina from '@/prototipo/compartido/motion/EntradaPagina'

/**
 * Comparar planes — chrome Emp + vista compartida.
 */
export default function PlanesPage() {
  const planNombre = useTenantStore((s) => s.planNombre)
  const actual = useMemo(
    () => (planNombre || 'EMPRENDEDOR').toUpperCase(),
    [planNombre],
  )

  return (
    <CompararPlanesVista
      planActualApi={actual}
      rutaExito={`${RUTA_EMPRENDEDOR}/opciones/plan/actualizado`}
      variante="emp"
      renderShell={({ children, error }) => (
        <ShellPlanes error={error}>{children}</ShellPlanes>
      )}
    />
  )
}

function ShellPlanes({ children, error }: { children: ReactNode; error: string | null }) {
  return (
    <main className="px-5 pb-10 pt-8 md:px-16 md:py-12">
      <EntradaPagina className="flex flex-col gap-[18px] md:gap-6">
        <div className="md:hidden">
          <CabeceraAtras titulo="Tu Plan" to={`${RUTA_EMPRENDEDOR}/opciones`} />
          <p className="text-xs text-hc-muted">Elegí el plan que mejor se ajuste a tu negocio</p>
        </div>
        <header className="hidden md:block">
          <h1 className="font-display text-[28px] font-bold">Tu Plan</h1>
          <p className="mt-1 text-sm text-hc-muted">Elegí el plan que mejor se ajuste a tu negocio</p>
        </header>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        {children}
      </EntradaPagina>
    </main>
  )
}
