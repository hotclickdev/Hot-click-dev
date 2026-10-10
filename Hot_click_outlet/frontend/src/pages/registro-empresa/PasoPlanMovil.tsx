import { useState } from 'react'
import HojaInferior from '@/components/comprador/HojaInferior'
import { MONTO_PENDIENTE, PLANES_ALTA, type PlanAlta } from './altaVendedorPlanes'
import type { PlanQueryId } from './planQueryParam'

type Props = Readonly<{
  plan: PlanQueryId
  onPlan: (id: PlanQueryId) => void
  onElegir: (id: PlanQueryId) => void
}>

const CHIPS = ['Panel de ventas', 'Cobrás con tarjeta y SINPE', 'Envíos a todo Costa Rica', 'Soporte de HotClick']

function limites(p: PlanAlta) {
  return ['productos', 'bodegas', 'pos', 'equipo']
    .map((id) => p.beneficios.find((b) => b.id === id)?.texto)
    .filter((texto): texto is string => Boolean(texto))
}

/** Paso 1 del alta en celular: tarjeta-radio, hoja de beneficios y una CTA fija. */
export default function PasoPlanMovil({ plan, onPlan, onElegir }: Props) {
  const [hoja, setHoja] = useState<PlanAlta | null>(null)
  const elegido = PLANES_ALTA.find((p) => p.id === plan) ?? PLANES_ALTA[0]

  return (
    <div className="flex flex-col gap-4 pb-28">
      <h1 className="font-[family-name:var(--hc-font-display)] text-[22px] font-bold">Elegí tu plan</h1>
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {CHIPS.map((c) => (
          <li key={c} className="shrink-0 rounded-full border border-[var(--hc-b-100)] px-3 py-1.5 text-[12px] font-semibold text-[var(--hc-b-600)]">{c}</li>
        ))}
      </ul>
      <div role="radiogroup" aria-label="Planes" className="flex flex-col gap-3">
        {PLANES_ALTA.map((p) => {
          const activo = p.id === plan
          return (
              <div key={p.id} className={`rounded-[14px] border p-3 ${activo ? 'border-hc-blue-600 bg-hc-blue-50' : 'border-hc-n-200 bg-hc-n-0'}`}>
              <button
                type="button"
                role="radio"
                aria-checked={activo}
                onClick={() => onPlan(p.id)}
                className="flex w-full flex-col gap-2 text-left"
              >
                <span className="font-[family-name:var(--hc-font-display)] text-[17px] font-bold">{p.nombre}</span>
                <span className="text-[13px] text-hc-n-600">{p.tagline}</span>
                <span className="grid grid-cols-4 gap-1 text-[11px] leading-4 text-hc-n-900">
                  {limites(p).map((t) => <span key={t}>{t}</span>)}
                </span>
              </button>
              <button type="button" onClick={() => setHoja(p)} className="mt-2 min-h-11 text-[13px] font-semibold text-hc-blue-600">
                Ver todo lo que incluye
              </button>
            </div>
          )
        })}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hc-n-200 bg-hc-n-0 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <p className="mb-2 text-[13px] text-hc-n-900">{elegido.nombre} · {MONTO_PENDIENTE}</p>
        <button
          type="button"
          onClick={() => onElegir(elegido.id)}
          className="flex min-h-12 w-full items-center justify-center rounded-[12px] bg-hc-red-500 text-[15px] font-semibold text-white"
        >
          Continuar con {elegido.nombre}
        </button>
      </div>
      <HojaInferior
        abierta={hoja != null}
        onCerrar={() => setHoja(null)}
        titulo={<h2 className="font-[family-name:var(--hc-font-display)] text-lg font-bold">{hoja?.nombre}</h2>}
      >
        <ul className="flex flex-col gap-2">
          {hoja?.beneficios.map((b) => <li key={b.id} className="text-sm">{b.texto}</li>)}
        </ul>
      </HojaInferior>
    </div>
  )
}
