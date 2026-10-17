import type { Frecuencia } from './frecuenciaApi'

export const OPCIONES_FRECUENCIA: { valor: Frecuencia; titulo: string; detalle: string; extra?: string }[] = [
  { valor: 'QUINCENAL', titulo: 'Quincenal', detalle: 'ONVO te deposita cada 15 días. US$3 por pago (2 por mes).' },
  { valor: 'MENSUAL', titulo: 'Mensual', detalle: 'ONVO te deposita una vez al mes. US$3 por pago.', extra: 'Ahorrás un cargo de US$3 al mes.' },
]

/** Mensaje cuando el negocio no eligió frecuencia (obligatorio en registro y al guardar). */
export const ERROR_FRECUENCIA_OBLIGATORIA = 'Elegí si querés liquidación quincenal o mensual.'

/**
 * S2-28: «¿Cada cuánto querés recibir tu plata?» (lámina frecuencia-390/1440). Radio obligatorio, reutilizable
 * en el registro (paso Cobros) y en el perfil. Sin preselección: el negocio elige. US$3 por pago (ONVO).
 */
export default function SelectorFrecuencia({ valor, onCambiar, deshabilitado = false, error = null }: {
  valor: Frecuencia | null
  onCambiar: (f: Frecuencia) => void
  deshabilitado?: boolean
  error?: string | null
}) {
  const idError = 'frecuencia-liquidacion-error'
  return (
    <fieldset className="flex flex-col gap-2" disabled={deshabilitado} aria-invalid={error ? true : undefined} aria-describedby={error ? idError : undefined}>
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
      {error && <p id={idError} role="alert" className="text-[12px] font-medium leading-4 text-hc-danger">{error}</p>}
    </fieldset>
  )
}
