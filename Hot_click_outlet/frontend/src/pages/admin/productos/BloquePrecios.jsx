import Input from '@/components/ui/Input'
import { margenForm } from './productosHelpers'
import { setCampo } from './productoFormCampos'

export default function BloquePrecios({ form, setForm }) {
  const margen = form.precioCompra && form.precioVenta ? margenForm(form.precioCompra, form.precioVenta) : null
  return (
    <div className="pt-4" style={{ borderTop: '1px solid var(--hc-border)' }}>
      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--hc-muted)' }}>Precios</p>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Precio compra (₡) *" type="number" step="1" min="0" value={form.precioCompra} onChange={setCampo(setForm, 'precioCompra')} required hint="Costo de adquisición" />
        <Input label="Precio venta (₡) *" type="number" step="1" min={form.precioCompra || 0} value={form.precioVenta} onChange={setCampo(setForm, 'precioVenta')} required hint="Debe ser ≥ precio de compra" />
      </div>
      {margen && (
        <div className="flex gap-2 mt-2 text-xs">
          <span style={{ color: 'var(--hc-muted)' }}>Margen:</span>
          <span className="font-medium" style={{ color: margen.positivo ? '#1E7F4F' : '#a8291f' }}>
            ₡{margen.monto.toLocaleString('es-CR')}
            {' '}({margen.pct ? `${margen.pct}%` : '—'})
          </span>
        </div>
      )}
    </div>
  )
}
