import type { Frecuencia } from './frecuenciaApi'

export const OPCIONES_FRECUENCIA: { valor: Frecuencia; titulo: string; detalle: string; extra?: string }[] = [
  { valor: 'QUINCENAL', titulo: 'Quincenal', detalle: 'ONVO te deposita cada 15 días. US$3 por cada depósito (2 por mes).' },
  { valor: 'MENSUAL', titulo: 'Mensual', detalle: 'ONVO te deposita una vez al mes. US$3 por depósito.', extra: 'Ahorrás un cargo de US$3 al mes.' },
]

/**
 * S2-28: «¿Cada cuánto querés recibir tu plata?» (lámina frecuencia-390/1440). Radio obligatorio, reutilizable
 * en el registro (paso Cobros) y en el perfil. Solo los US$3 por liquidación están decididos.
 */
export default function SelectorFrecuencia({ valor, onCambiar, deshabilitado = false }: {
  valor: Frecuencia | null
  onCambiar: (f: Frecuencia) => void
  deshabilitado?: boolean
}) {
  return (
    <fieldset className="flex flex-col gap-2" disabled={deshabilitado}>
      <legend className="mb-2 text-[14px] font-semibold text-hc-text">
        ¿Cada cuánto querés recibir tu plata? <span className="text-hc-danger" aria-hidden="true">*</span>
      </legend>
      {OPCIONES_FRECUENCIA.map((o) => {
        const activo = valor === o.valor
        return (
          <label key={o.valor} className={`flex cursor-pointer items-start gap-3 rounded-[12px] p-3.5 ${activo ? 'border-2 border-hc-blue-600 bg-hc-blue-50' : 'border border-hc-border bg-hc-surface'}`}>
            <input
              type="radio"
              name="frecuencia-liquidacion"
              value={o.valor}
              checked={activo}
              required
              onChange={() => onCambiar(o.valor)}
              className="mt-0.5 size-[20px] shrink-0 appearance-none rounded-full border-[1.5px] border-hc-n-400 bg-hc-n-0 checked:border-[6px] checked:border-hc-blue-600"
            />
            <span className="flex flex-col gap-0.5">
              <span className="text-[14px] font-semibold">{o.titulo}</span>
              <span className="text-[12px] text-hc-muted">{o.detalle}</span>
              {o.extra && <span className="text-[12px] font-semibold text-hc-success-text">{o.extra}</span>}
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}
