import { formatMonto } from '@/services/cotizacionService'
import { inputCls, inputStyle } from './nuevaCotizacionUi'

export default function ItemRow({ item, index, productos, onChange, onRemove }) {
  const subtotal = Math.round(
    (item.precioUnitario || 0) * (item.cantidad || 1) *
    (1 - (item.descuentoPorcentaje || 0) / 100)
  )

  return (
    <tr style={{ borderBottom: '1px solid var(--hc-border)' }}>
      {/* Tipo / Producto */}
      <td className="px-3 py-2 w-64">
        {item.tipo === 'CATALOGO' ? (
          <select className={inputCls} style={{ ...inputStyle, fontSize: '0.75rem' }}
            value={item.productoId ?? ''}
            onChange={e => {
              const p = productos.find(x => x.id === Number(e.target.value))
              if (!p) return
              onChange(index, {
                productoId:    p.id,
                nombre:        p.nombreProducto,
                codigo:        p.sku ?? '',
                descripcion:   p.descripcionCorta ?? '',
                imagenUrl:     p.imagenPrincipalUrl ?? '',
                precioUnitario: p.precioVenta,
              })
            }}>
            <option value="">— Seleccionar producto —</option>
            {productos.map(p => (
              <option key={p.id} value={p.id}>{p.nombreProducto}</option>
            ))}
          </select>
        ) : (
          <input className={inputCls} style={{ ...inputStyle, fontSize: '0.75rem' }}
            placeholder="Nombre del ítem"
            value={item.nombre || ''}
            onChange={e => onChange(index, { nombre: e.target.value })} />
        )}
        <div className="flex gap-1 mt-1">
          {['CATALOGO', 'TEMPORAL'].map(t => (
            <button key={t}
              onClick={() => onChange(index, { tipo: t, productoId: null, nombre: '', codigo: '', imagenUrl: '', descripcion: '' })}
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                background: item.tipo === t ? 'var(--hc-accent)' : 'var(--hc-border)',
                color: item.tipo === t ? '#fff' : 'var(--hc-muted)',
              }}>
              {t === 'CATALOGO' ? 'Catálogo' : 'Temporal'}
            </button>
          ))}
        </div>
      </td>
      {/* Imagen */}
      <td className="px-3 py-2 w-12">
        {item.imagenUrl
          ? <img src={item.imagenUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
          : <div className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--hc-border)' }}>
              <svg className="w-5 h-5" style={{ color: 'var(--hc-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909"/>
              </svg>
            </div>
        }
      </td>
      {/* Código */}
      <td className="px-3 py-2 w-28">
        <input className={inputCls} style={{ ...inputStyle, fontSize: '0.75rem' }}
          placeholder="SKU"
          value={item.codigo || ''}
          onChange={e => onChange(index, { codigo: e.target.value })} />
      </td>
      {/* Cantidad */}
      <td className="px-3 py-2 w-20">
        <input type="number" min={1} className={inputCls} style={{ ...inputStyle, fontSize: '0.75rem' }}
          value={item.cantidad || 1}
          onChange={e => onChange(index, { cantidad: Number(e.target.value) })} />
      </td>
      {/* Unidad */}
      <td className="px-3 py-2 w-24">
        <select className={inputCls} style={{ ...inputStyle, fontSize: '0.75rem' }}
          value={item.unidadMedida || 'UNIDAD'}
          onChange={e => onChange(index, { unidadMedida: e.target.value })}>
          {['UNIDAD', 'KG', 'LITRO', 'METRO', 'CAJA', 'HORA', 'SERVICIO'].map(u => (
            <option key={u}>{u}</option>
          ))}
        </select>
      </td>
      {/* Precio unitario */}
      <td className="px-3 py-2 w-32">
        <input type="number" min={0} className={inputCls} style={{ ...inputStyle, fontSize: '0.75rem' }}
          value={item.precioUnitario || 0}
          onChange={e => onChange(index, { precioUnitario: Number(e.target.value) })} />
      </td>
      {/* Descuento */}
      <td className="px-3 py-2 w-20">
        <input type="number" min={0} max={100} className={inputCls} style={{ ...inputStyle, fontSize: '0.75rem' }}
          value={item.descuentoPorcentaje || 0}
          onChange={e => onChange(index, { descuentoPorcentaje: Number(e.target.value) })} />
      </td>
      {/* Subtotal */}
      <td className="px-3 py-2 w-32 text-right font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>
        {formatMonto(subtotal)}
      </td>
      {/* Borrar */}
      <td className="px-2 py-2 w-8">
        <button onClick={() => onRemove(index)} className="p-1 rounded-lg transition-colors hover:bg-red-500/10" style={{ color: '#ef4444' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </td>
    </tr>
  )
}
