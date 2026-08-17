import Field from './Field'
import SectionCard from './SectionCard'
import { inputCls, inputStyle } from './nuevaCotizacionUi'

/**
 * Fechas, estado y moneda de la cotización.
 */
export default function SeccionDetalles({ form, setF }) {
  return (
    <SectionCard title="Detalles de la cotización">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Field label="Fecha de emisión">
          <input type="date" className={inputCls} style={inputStyle}
            value={form.fechaEmision}
            onChange={e => setF('fechaEmision', e.target.value)} />
        </Field>
        <Field label="Fecha de vencimiento">
          <input type="date" className={inputCls} style={inputStyle}
            value={form.fechaVencimiento}
            onChange={e => setF('fechaVencimiento', e.target.value)} />
        </Field>
        <Field label="Estado">
          <select className={inputCls} style={inputStyle}
            value={form.estadoCotizacion}
            onChange={e => setF('estadoCotizacion', e.target.value)}>
            {['BORRADOR', 'ENVIADA', 'APROBADA', 'RECHAZADA'].map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Moneda">
          <select className={inputCls} style={inputStyle}
            value={form.moneda}
            onChange={e => setF('moneda', e.target.value)}>
            <option value="CRC">₡ Colones (CRC)</option>
            <option value="USD">$ Dólares (USD)</option>
          </select>
        </Field>
      </div>
    </SectionCard>
  )
}
