import { Link } from 'react-router-dom'
import { rutaLoginConRetorno } from '@/utils/authRedirect'
import { RUTA_REGISTRAR_NEGOCIO } from '@/utils/destinoVender'
import { PLANES_ALTA, TEXTO_CAMBIO_PLAN, TEXTO_MONTOS, TEXTO_SUBTITULO_PLANES } from './altaVendedorPlanes'
import type { PlanQueryId } from './planQueryParam'
import { AltaTitulo, BotonPrimario, BotonSecundario, IconoBeneficio, Nota, PillPendiente } from './AltaVendedorUI'

const VENTAJAS = [
  { id: 'panel', titulo: 'Panel de ventas', desc: 'Pedidos, ingresos y estadísticas al día' },
  { id: 'cobro', titulo: 'Cobrás con tarjeta y SINPE', desc: 'HotClick verifica cada pago por vos' },
  { id: 'envios', titulo: 'Envíos a todo Costa Rica', desc: 'Coordinás la entrega desde tu panel' },
  { id: 'soporte', titulo: 'Soporte de HotClick', desc: 'Te ayudamos a publicar y vender' },
]

/** Paso 1 · Plan: tarjetas radio (Figma 29:1344) con lo diferencial primero y los montos en [PENDIENTE]. */
export default function PasoPlan({ plan, onPlan, onElegir }: {
  plan: PlanQueryId
  onPlan: (id: PlanQueryId) => void
  onElegir: (id: PlanQueryId) => void
}) {
  return (
    <div className="flex flex-col gap-5">
      <AltaTitulo antes="Empezá a" acento="vender" despues="en HotClick" sub={`Elegí tu plan. ${TEXTO_SUBTITULO_PLANES}`} />

      <ul className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {VENTAJAS.map((v) => (
          <li key={v.id} className="rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-3">
            <p className="text-[13px] font-semibold text-hc-n-900">{v.titulo}</p>
            <p className="mt-0.5 text-[12px] leading-4 text-hc-n-600">{v.desc}</p>
          </li>
        ))}
      </ul>

      <div role="radiogroup" aria-label="Planes" className="grid gap-3 lg:grid-cols-3">
        {PLANES_ALTA.map((p) => {
          const elegido = p.id === plan
          return (
            <div
              key={p.id}
              data-testid={`plan-${p.id}`}
              className={`flex flex-col rounded-[14px] border bg-hc-n-0 p-4 ${elegido ? 'border-hc-blue-600 bg-hc-blue-50 shadow-[0_1px_3px_rgba(20,23,28,.12)] [outline:0.5px_solid_var(--hc-blue-600)]' : 'border-hc-n-200'}`}
            >
              <label className="flex cursor-pointer flex-col gap-1">
                <input
                  type="radio"
                  name="plan-alta"
                  value={p.id}
                  checked={elegido}
                  onChange={() => onPlan(p.id)}
                  className="h-[18px] w-[18px] cursor-pointer accent-[var(--hc-blue-600)]"
                />
                <span className="mt-2 font-[family-name:var(--hc-font-display)] text-[17px] font-bold text-hc-n-900">{p.nombre}</span>
                <span className="text-[13px] leading-[19px] text-hc-n-600">{p.tagline}</span>
              </label>
              <ul className="mt-3 flex flex-1 flex-col gap-2">
                {p.beneficios.map((b) => (
                  <li key={b.id} className="flex items-start gap-2 text-[14px] font-semibold leading-5 text-hc-n-900">
                    <IconoBeneficio icono={b.icono} />{b.texto}
                  </li>
                ))}
                <li className="flex flex-wrap items-center gap-2 text-[13px] text-hc-n-600">
                  <IconoBeneficio icono="etiqueta" />Mensualidad y comisión: <PillPendiente />
                </li>
              </ul>
              {elegido
                ? <BotonPrimario className="mt-4 w-full" onClick={() => onElegir(p.id)}>Elegir este plan</BotonPrimario>
                : <BotonSecundario className="mt-4 w-full" onClick={() => onElegir(p.id)}>Elegir este plan</BotonSecundario>}
            </div>
          )
        })}
      </div>

      <p className="text-center text-[13px] text-hc-n-600">{TEXTO_CAMBIO_PLAN} {TEXTO_MONTOS}</p>

      <Nota titulo="¿Qué es la comisión?">
        Es el porcentaje que HotClick retiene de cada venta que hacés en la plataforma. Si no vendés, no pagás comisión. Monto por plan: <PillPendiente />
      </Nota>

      <p className="text-center text-[12px] text-hc-n-600">
        ¿Ya comprás en HotClick?{' '}
        <Link to={rutaLoginConRetorno(RUTA_REGISTRAR_NEGOCIO)} className="font-semibold text-hc-blue-600">Ingresá</Link>{' '}
        y registrá tu negocio con la misma cuenta.
      </p>
    </div>
  )
}
