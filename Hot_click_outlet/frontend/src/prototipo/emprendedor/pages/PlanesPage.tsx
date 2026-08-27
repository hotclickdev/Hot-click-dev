import { CheckIcon } from '@heroicons/react/24/outline'
import { formatoColon } from '@/theme/formatoColon'
import CabeceraAtras from '../ui/CabeceraAtras'
import EnlacePrimario from '../ui/EnlacePrimario'
import { RUTA_EMPRENDEDOR } from '../constants'

const PLANES = [
  {
    nombre: 'Emprendimiento',
    precio: 'Gratis',
    actual: true,
    beneficios: ['Hasta 20 productos publicados', 'Reportes básicos', '1 bodega', 'Caja (POS)'],
    cta: null,
  },
  {
    nombre: 'PYME',
    precio: `${formatoColon(9900)}/mes`,
    actual: false,
    beneficios: ['Productos ilimitados', 'Gestión de equipo (varios usuarios)', 'Múltiples bodegas', 'Reportes avanzados'],
    cta: 'Mejorar a PYME',
  },
  {
    nombre: 'Negocio Plus',
    precio: `${formatoColon(24900)}/mes`,
    actual: false,
    beneficios: ['Todo lo de PYME', 'Multi-sucursal', 'Gestión de pedidos por sucursal', 'Soporte prioritario'],
    cta: 'Mejorar a Negocio Plus',
  },
] as const

/**
 * Comparar planes (Figma 158:128).
 */
export default function PlanesPage() {
  return (
    <main className="flex flex-col gap-[18px] px-5 pb-10 pt-8">
      <CabeceraAtras titulo="Tu Plan" to={`${RUTA_EMPRENDEDOR}/opciones`} />
      <p className="text-xs text-hc-muted">Elegí el plan que mejor se ajuste a tu negocio</p>
      {PLANES.map((plan) => (
        <article
          key={plan.nombre}
          className={`flex flex-col gap-3 rounded-[18px] p-[18px] ${
            plan.actual ? 'border-[1.5px] border-hc-primary' : 'border border-hc-border'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-base font-bold">{plan.nombre}</p>
              <p className="text-sm font-bold text-hc-primary">{plan.precio}</p>
            </div>
            {plan.actual ? (
              <span className="rounded-full bg-[var(--hc-n-100)] px-2.5 py-1 text-[8px] font-bold text-hc-muted">
                TU PLAN ACTUAL
              </span>
            ) : null}
          </div>
          {plan.beneficios.map((b) => (
            <p key={b} className="flex items-center gap-2 text-[11px] text-hc-muted">
              <CheckIcon className="size-4 shrink-0 text-hc-success" />
              {b}
            </p>
          ))}
          {plan.cta ? <EnlacePrimario to="/opciones/plan/actualizado">{plan.cta}</EnlacePrimario> : null}
        </article>
      ))}
    </main>
  )
}
