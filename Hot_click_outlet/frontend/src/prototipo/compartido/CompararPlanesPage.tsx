import { formatoColon } from '@/theme/formatoColon'
import { Boton, EncabezadoPagina } from './ui'
import { useSellerPlan, useSellerRuta } from './SellerPlanContext'
import type { PlanId } from './plan'

const PLANES = [
  {
    id: 'emprendedor' as const,
    nombre: 'Emprendimiento',
    precio: 'Gratis',
    puntos: ['Hasta 20 productos publicados', 'Reportes básicos', '1 bodega', 'Caja (POS)'],
  },
  {
    id: 'pyme' as const,
    nombre: 'PYME',
    precio: `${formatoColon(9900)}/mes`,
    puntos: ['Productos ilimitados', 'Gestión de equipo (varios usuarios)', 'Múltiples bodegas', 'Reportes avanzados'],
  },
  {
    id: 'negocioPlus' as const,
    nombre: 'Negocio Plus',
    precio: `${formatoColon(24900)}/mes`,
    puntos: ['Todo lo de PYME', 'Multi-sucursal', 'Gestión de pedidos por sucursal', 'Soporte prioritario'],
  },
]

/**
 * Comparar planes (Figma 158:331 / 158:538). El plan actual no tiene CTA de mejora.
 */
export default function CompararPlanesPage() {
  const plan = useSellerPlan()
  const ruta = useSellerRuta()
  return (
    <main className="px-5 pb-8 pt-[60px]">
      <EncabezadoPagina titulo="Tu Plan" subtitulo="Elegí el plan que mejor se ajuste a tu negocio" volverA={ruta('opciones')} />
      <ul className="space-y-4">
        {PLANES.map((item) => (
          <li key={item.id} className="rounded-xl border border-hc-border p-4">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="font-display text-lg font-bold">{item.nombre}</p>
                <p className="text-sm text-hc-muted">{item.precio}</p>
              </div>
              {esActual(plan.id, item.id) ? (
                <span className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: 'var(--hc-blue-50)', color: 'var(--hc-blue-700)' }}>
                  TU PLAN ACTUAL
                </span>
              ) : null}
            </div>
            <ul className="space-y-2 text-sm">
              {item.puntos.map((punto) => (
                <li key={punto} className="flex gap-2">
                  <span className="text-hc-success" aria-hidden>✓</span>
                  {punto}
                </li>
              ))}
            </ul>
            {esActual(plan.id, item.id) ? null : (
              <div className="mt-4">
                <Boton to={ruta('plan/actualizado')}>Mejorar a {item.nombre}</Boton>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  )
}

function esActual(actual: PlanId, tarjeta: string): boolean {
  return actual === tarjeta
}
