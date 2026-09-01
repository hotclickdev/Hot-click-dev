import { inp, inpStyle } from './productFormUi'
import Label from './Label'
import type { Dispatch, SetStateAction } from 'react'
import type { SetCampo, WizardForm } from './wizardHelpers'

function margenDePrecios(precioCompra: string, precioVenta: string) {
  const compra = Number(precioCompra)
  const venta = Number(precioVenta)
  const margen = venta - compra
  const margenPct = compra > 0 ? ((margen / compra) * 100).toFixed(1) : null
  return { compra, venta, margen, margenPct }
}

export default function PasoPrecios({ form, setCampo, priceWarning, setPriceWarning, setForm }: {
  form: WizardForm
  setCampo: SetCampo
  priceWarning: boolean
  setPriceWarning: Dispatch<SetStateAction<boolean>>
  setForm: Dispatch<SetStateAction<WizardForm>>
}) {
  const { compra, venta, margen, margenPct } = margenDePrecios(form.precioCompra, form.precioVenta)
  const mostrarPrecioFijo = !form.esPersonalizado || form.modoPrecioPersonalizado === 'FIJO'

  return (
    <div className="space-y-5">
      <SeccionPersonalizado form={form} setForm={setForm} />

      {mostrarPrecioFijo && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label required>Precio de compra (₡)</Label>
            <input className={inp} style={inpStyle} type="number" value={form.precioCompra}
              onChange={e => { setCampo('precioCompra')(e); setPriceWarning(false) }}
              placeholder="0" min="0" />
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
      )}

      {form.esPersonalizado && form.modoPrecioPersonalizado === 'RANGO' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label required>Precio mínimo (₡)</Label>
            <input className={inp} style={inpStyle} type="number" value={form.precioPersonalizadoMin}
              onChange={e => setForm(f => ({ ...f, precioPersonalizadoMin: e.target.value, precioVenta: e.target.value || f.precioVenta }))}
              placeholder="5000" min="0" />
          </div>
          <div>
            <Label required>Precio máximo (₡)</Label>
            <input className={inp} style={inpStyle} type="number" value={form.precioPersonalizadoMax}
              onChange={e => setForm(f => ({ ...f, precioPersonalizadoMax: e.target.value }))}
              placeholder="25000" min="0" />
          </div>
        </div>
      )}

      {form.esPersonalizado && form.modoPrecioPersonalizado === 'COTIZACION' && (
        <p className="text-xs rounded-xl px-3 py-2" style={{ background: 'rgba(23,71,168,0.06)', color: 'var(--hc-muted)' }}>
          El cliente enviará imágenes y notas. Vos definís el precio al aprobar el encargo.
          Se usará ₡1 como precio placeholder en catálogo hasta cotizar.
        </p>
      )}

      {mostrarPrecioFijo && compra > 0 && venta > 0 && (
        <div className="px-4 py-3 rounded-xl text-xs"
          style={margen < 0
            ? { backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', color: '#a8291f' }
            : { backgroundColor: 'rgba(23,71,168,0.08)', border: '1px solid rgba(23,71,168,0.2)', color: 'var(--hc-accent)' }}>
          {textoMargenPaso(margen, margenPct)}
        </div>
      )}
      <div className="w-36">
        <Label>Stock inicial</Label>
        <input className={inp} style={inpStyle} type="number" value={form.stock} onChange={setCampo('stock')} placeholder="1" min="0" />
      </div>
    </div>
  )
}

function SeccionPersonalizado({ form, setForm }: {
  form: WizardForm
  setForm: Dispatch<SetStateAction<WizardForm>>
}) {
  return (
    <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: 'var(--hc-border)' }}>
      <label className="flex items-start gap-3 cursor-pointer" aria-label="Producto personalizado / por encargo">
        <input
          type="checkbox"
          className="mt-1"
          checked={form.esPersonalizado}
          onChange={e => setForm(f => ({
            ...f,
            esPersonalizado: e.target.checked,
            modoPrecioPersonalizado: e.target.checked ? f.modoPrecioPersonalizado : 'FIJO',
          }))}
        />
        <span>
          <span className="block text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
            Producto personalizado / por encargo
          </span>
          <span className="block text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
            Ideal para sublimado, cuadros, arte o manualidades. El cliente sube hasta 3 imágenes de referencia y notas.
          </span>
        </span>
      </label>

      {form.esPersonalizado && (
        <>
          <div>
            <p className="text-xs block mb-1.5" style={{ color: 'var(--hc-muted)' }} id="modo-precio-wizard">
              Cómo se define el precio
            </p>
            <div className="grid gap-2 mt-1" role="radiogroup" aria-labelledby="modo-precio-wizard">
              {([
                ['FIJO', 'Precio fijo', 'El cliente paga de una vez (ej. camisa sublimada ₡8.000).'],
                ['RANGO', 'Rango de precio', 'Mostrás “desde–hasta” y aprobás un monto dentro del rango.'],
                ['COTIZACION', 'Cotización', 'Sin precio público: revisás las fotos y cotizás después.'],
              ] as const).map(([valor, titulo, ayuda]) => (
                <label
                  key={valor}
                  className="flex gap-2 items-start rounded-xl px-3 py-2 cursor-pointer"
                  style={{ background: form.modoPrecioPersonalizado === valor ? 'rgba(231,59,51,0.06)' : 'transparent', border: '1px solid var(--hc-border)' }}
                  aria-label={titulo}
                >
                  <input
                    type="radio"
                    name="modoPrecioPersonalizado"
                    checked={form.modoPrecioPersonalizado === valor}
                    onChange={() => setForm(f => ({
                      ...f,
                      modoPrecioPersonalizado: valor,
                      precioVenta: valor === 'COTIZACION' ? (f.precioVenta || '1') : f.precioVenta,
                    }))}
                  />
                  <span>
                    <span className="block text-sm font-medium" style={{ color: 'var(--hc-text)' }}>{titulo}</span>
                    <span className="block text-xs" style={{ color: 'var(--hc-muted)' }}>{ayuda}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="instrucciones-personalizacion-wizard">Instrucciones para el cliente</Label>
            <textarea
              id="instrucciones-personalizacion-wizard"
              className={inp}
              style={{ ...inpStyle, minHeight: 88 }}
              value={form.instruccionesPersonalizacion}
              onChange={e => setForm(f => ({ ...f, instruccionesPersonalizacion: e.target.value }))}
              placeholder="Ej: Subí foto de la cara o del diseño. Indicá talla de camisa. Para cuadros, decime el tamaño preferido."
              maxLength={3000}
            />
          </div>
        </>
      )}
    </div>
  )
}

function textoMargenPaso(margen: number, margenPct: string | null) {
  if (margen < 0) return 'Estás vendiendo a pérdida — el precio de compra supera al de venta.'
  const pct = margenPct ? ` (${margenPct}%)` : ''
  return `Margen: ₡${margen.toLocaleString('es-CR')}${pct}`
}
