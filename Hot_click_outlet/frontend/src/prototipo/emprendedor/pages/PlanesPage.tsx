import { formatoColon } from '@/theme/formatoColon'
import CabeceraAtras from '../ui/CabeceraAtras'
import EnlacePrimario from '../ui/EnlacePrimario'
import { RUTA_EMPRENDEDOR } from '../constants'

type PlanCard = {
  id: 'emprendedor' | 'pyme' | 'negocioPlus'
  nombre: string
  precio: string
  beneficios: readonly string[]
  actual: boolean
  cta: string | null
}

/** Solo 3 planes SaaS: Emprendedor, PYME, Negocio Plus (Figma 352:12179). */
const PLANES: readonly PlanCard[] = [
  {
    id: 'emprendedor',
    nombre: 'Emprendedor',
    precio: 'Gratis',
    actual: true,
    cta: null,
    beneficios: ['Hasta 20 productos publicados', 'Reportes básicos', '1 bodega', 'Caja (POS)'],
  },
  {
    id: 'pyme',
    nombre: 'PYME',
    precio: `${formatoColon(9900)}/mes`,
    actual: false,
    cta: 'Mejorar a PYME',
    beneficios: [
      'Productos ilimitados',
      'Gestión de equipo (varios usuarios)',
      'Múltiples bodegas',
      'Reportes avanzados',
    ],
  },
  {
    id: 'negocioPlus',
    nombre: 'Negocio Plus',
    precio: `${formatoColon(24900)}/mes`,
    actual: false,
    cta: 'Mejorar a Negocio Plus',
    beneficios: [
      'Todo lo de PYME',
      'Multi-sucursal',
      'Gestión de pedidos por sucursal',
      'Soporte prioritario',
    ],
  },
]

/**
 * Comparar planes — solo Emprendedor / PYME / Negocio Plus.
 */
export default function PlanesPage() {
  return (
    <main className="flex flex-col gap-[18px] px-5 pb-10 pt-8 md:gap-6 md:px-16 md:py-12">
      <div className="md:hidden">
        <CabeceraAtras titulo="Tu Plan" to={`${RUTA_EMPRENDEDOR}/opciones`} />
        <p className="text-xs text-hc-muted">Elegí el plan que mejor se ajuste a tu negocio</p>
      </div>
      <header className="hidden md:block">
        <h1 className="font-display text-[28px] font-bold">Tu Plan</h1>
      </header>
      <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:gap-5">
        {PLANES.map((plan) => (
          <TarjetaPlan key={plan.id} plan={plan} />
        ))}
      </div>
    </main>
  )
}

function TarjetaPlan({ plan }: { plan: PlanCard }) {
  return (
    <article
      className={`flex flex-1 flex-col gap-3 rounded-xl p-5 md:px-5 md:py-6 ${
        plan.actual ? 'border-2 border-hc-primary bg-hc-surface' : 'border border-hc-border bg-hc-surface'
      }`}
    >
      <p className="font-display text-base font-bold md:text-lg">{plan.nombre}</p>
      <p className="font-display text-lg font-bold text-hc-primary md:text-[22px]">{plan.precio}</p>
      <ul className="flex flex-col gap-2">
        {plan.beneficios.map((b) => (
          <li key={b} className="text-[11px] text-hc-muted md:text-[13px]">
            ✓ {b}
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-2">
        {plan.actual ? (
          <span className="flex min-h-11 w-full items-center justify-center rounded-[10px] border border-hc-border text-[15px] font-bold text-hc-text">
            TU PLAN ACTUAL
          </span>
        ) : (
          <EnlacePrimario to="/opciones/plan/actualizado">{plan.cta ?? ''}</EnlacePrimario>
        )}
      </div>
    </article>
  )
}
