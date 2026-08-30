import Field from './Field'
import SectionCard from './SectionCard'
import { inputCls, inputStyle } from './nuevaCotizacionUi'
import type { FormCotizacion, SetFormCotizacion } from './CotizacionForm'

/**
 * Observaciones y términos de la cotización.
 */
export default function SeccionNotas({ form, setF }: {
  form: FormCotizacion
  setF: SetFormCotizacion
}) {
  return (
    <SectionCard title="Notas y condiciones">
      <Field label="Observaciones">
        <textarea rows={3} className={inputCls} style={inputStyle}
          value={form.observaciones}
          onChange={e => setF('observaciones', e.target.value)}
          placeholder="Notas adicionales para el cliente..." />
      </Field>
      <Field label="Términos y condiciones">
        <textarea rows={4} className={inputCls} style={inputStyle}
          value={form.terminos}
          onChange={e => setF('terminos', e.target.value)} />
      </Field>
    </SectionCard>
  )
}
