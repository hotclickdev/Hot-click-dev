import { inp, inpStyle } from './productFormUi'
import Label from './Label'

function margenDePrecios(precioCompra, precioVenta) {
  const compra = Number(precioCompra)
  const venta = Number(precioVenta)
  const margen = venta - compra
  const margenPct = compra > 0 ? ((margen / compra) * 100).toFixed(1) : null
  return { compra, venta, margen, margenPct }
}

export default function PasoPrecios({ form, setCampo, priceWarning, setPriceWarning }) {
  const { compra, venta, margen, margenPct } = margenDePrecios(form.precioCompra, form.precioVenta)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label required>Precio de compra (₡)</Label>
          <input className={inp} style={inpStyle} type="number" value={form.precioCompra}
            onChange={e => { setCampo('precioCompra')(e); setPriceWarning(false) }}
            placeholder="0" min="0" autoFocus />
          <p className="text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>Lo que pagaste</p>
        </div>
        <div>
          <Label required>Precio de venta (₡)</Label>
          <input className={inp} type="number" value={form.precioVenta}
            style={priceWarning ? { ...inpStyle, borderColor: '#f59e0b' } : inpStyle}
            onChange={e => { setCampo('precioVenta')(e); setPriceWarning(false) }}
            placeholder="0" min="0" />
          <p className="text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>Lo que paga el cliente</p>
        </div>
      </div>
      {compra > 0 && venta > 0 && (
        <div className="px-4 py-3 rounded-xl text-xs"
          style={margen < 0
            ? { backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', color: '#a8291f' }
            : { backgroundColor: 'rgba(23,71,168,0.08)', border: '1px solid rgba(23,71,168,0.2)', color: 'var(--hc-accent)' }}>
          {margen < 0
            ? 'Estás vendiendo a pérdida — el precio de compra supera al de venta.'
            : `Margen: ₡${margen.toLocaleString('es-CR')}${margenPct ? ` (${margenPct}%)` : ''}`
          }
        </div>
      )}
      <div className="w-36">
        <Label>Stock inicial</Label>
        <input className={inp} style={inpStyle} type="number" value={form.stock} onChange={setCampo('stock')} placeholder="1" min="0" />
      </div>
    </div>
  )
}
