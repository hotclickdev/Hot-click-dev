import { formatMonto } from '@/services/cotizacionService'
import Field from './Field'
import { inputCls, inputStyle } from './nuevaCotizacionUi'

/**
 * IVA, resumen y acciones de guardar/cancelar.
 */
export default function SeccionTotales({ form, setF, subtotal, montoIva, total, loading, esEdicion, onGuardar, onCancelar }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border p-5 space-y-4"
        style={{ background: 'var(--hc-card)', borderColor: 'var(--hc-border)' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>Impuesto</h2>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>Aplicar IVA</span>
          <button type="button"
            onClick={() => setF('aplicaIva', !form.aplicaIva)}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{ background: form.aplicaIva ? 'var(--hc-accent)' : 'var(--hc-border)' }}>
            <span className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform"
              style={{ transform: form.aplicaIva ? 'translateX(20px)' : 'translateX(0)' }} />
          </button>
        </div>

        {form.aplicaIva && (
          <Field label="Porcentaje IVA (%)">
            <input type="number" min={0} max={100} className={inputCls} style={inputStyle}
              value={form.porcentajeIva}
              onChange={e => setF('porcentajeIva', Number(e.target.value))} />
          </Field>
        )}
      </div>

      <div className="rounded-2xl border p-5 space-y-3 sticky top-6"
        style={{ background: 'var(--hc-card)', borderColor: 'var(--hc-border)' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>Resumen</h2>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between" style={{ color: 'var(--hc-text)' }}>
            <span>Subtotal</span>
            <span className="font-medium">{formatMonto(subtotal, form.moneda)}</span>
          </div>

          {form.aplicaIva && (
            <div className="flex justify-between" style={{ color: 'var(--hc-muted)' }}>
              <span>IVA ({form.porcentajeIva}%)</span>
              <span>{formatMonto(montoIva, form.moneda)}</span>
            </div>
          )}

          <div className="pt-2 mt-2 flex justify-between text-base font-bold border-t"
            style={{ borderColor: 'var(--hc-border)', color: 'var(--hc-text)' }}>
            <span>Total</span>
            <span style={{ color: 'var(--hc-accent)' }}>{formatMonto(total, form.moneda)}</span>
          </div>
        </div>

        <div className="pt-2 space-y-2">
          <button type="button" onClick={onGuardar} disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--hc-accent)', color: '#fff' }}>
            {loading ? 'Guardando...' : esEdicion ? 'Actualizar cotización' : 'Crear cotización'}
          </button>
          <button type="button" onClick={onCancelar}
            className="w-full py-2.5 rounded-xl text-sm font-medium border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: 'var(--hc-muted)', borderColor: 'var(--hc-border)' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
