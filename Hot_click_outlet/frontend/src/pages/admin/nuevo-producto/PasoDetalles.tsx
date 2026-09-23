import { inp, inpStyle } from './productFormUi'
import Label from './Label'
import type { ChangeEvent, Dispatch, SetStateAction } from 'react'
import type { SetCampo, TallaCantidad, WizardForm } from './wizardHelpers'

const TALLAS = ['XS','S','M','L','XL','XXL','XXXL','35','36','37','38','39','40','41','42','43','44','45']
const DIAS_GARANTIA = [0, 30, 90, 180, 365]

function etiquetaGarantia(dias: number) {
  if (dias === 0) return 'Sin'
  if (dias === 365) return '1 año'
  return `${dias}d`
}

function alternarTalla(tallasCantidad: TallaCantidad[] | undefined, talla: string) {
  const actuales = tallasCantidad || []
  const yaEsta = actuales.some(x => x.talla === talla)
  return yaEsta
    ? actuales.filter(x => x.talla !== talla)
    : [...actuales, { talla, cantidad: 1 }]
}

function cambiarCantidadTalla(tallasCantidad: TallaCantidad[] | undefined, talla: string, cantidad: string) {
  return (tallasCantidad || []).map(x => x.talla === talla ? { ...x, cantidad } : x)
}

function BotonTalla({ talla, par, onToggle, onCantidad }: {
  talla: string
  par: TallaCantidad | undefined
  onToggle: () => void
  onCantidad: (e: ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={onToggle}
        className="px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all min-h-[44px] min-w-[44px]"
        style={par
          ? { backgroundColor: 'rgba(23,71,168,0.12)', borderColor: 'rgba(23,71,168,0.4)', color: 'var(--hc-accent)' }
          : { backgroundColor: 'var(--hc-surface-2)', borderColor: 'var(--hc-border)', color: 'var(--hc-muted)' }}>{talla}</button>
      {par && (
        <input type="number" min="0" value={par.cantidad} onChange={onCantidad}
          className={`${inp} w-16 text-center`} style={inpStyle} title={`Cantidad en talla ${talla}`} />
      )}
    </div>
  )
}

export default function PasoDetalles({ form, setCampo, setForm }: {
  form: WizardForm
  setCampo: SetCampo
  setForm: Dispatch<SetStateAction<WizardForm>>
}) {
  const paresTalla = form.tallasCantidad || []

  return (
    <div className="space-y-5">
      <div>
        <Label>Talla <span className="font-normal" style={{ color: 'var(--hc-muted)' }}>(marcá las que tengas en stock y cuántas — dejá todo vacío si no aplica)</span></Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {TALLAS.map(talla => {
            const par = paresTalla.find(x => x.talla === talla)
            return (
              <BotonTalla
                key={talla}
                talla={talla}
                par={par}
                onToggle={() => setForm(p => ({ ...p, tallasCantidad: alternarTalla(p.tallasCantidad, talla) }))}
                onCantidad={e => setForm(p => ({ ...p, tallasCantidad: cambiarCantidadTalla(p.tallasCantidad, talla, e.target.value) }))}
              />
            )
          })}
        </div>
        <input className={`${inp} w-28`} style={inpStyle} value={form.talla} onChange={setCampo('talla')} placeholder="Otra talla (una sola)…"
          maxLength={20} disabled={paresTalla.length > 0} />
        {paresTalla.length > 1 && (
          <p className="text-xs mt-2" style={{ color: 'var(--hc-muted)' }}>
            Se van a crear {paresTalla.length} productos (mismo nombre, foto y precio), uno por cada talla marcada.
          </p>
        )}
      </div>
      <div>
        <Label>Días de garantía <span className="font-normal" style={{ color: 'var(--hc-muted)' }}>(0 = sin garantía)</span></Label>
        <div className="flex items-center gap-3 flex-wrap">
          <input className={`${inp} w-36`} style={inpStyle} type="number" value={form.garantiaDias} onChange={setCampo('garantiaDias')} placeholder="0" min="0" />
          <div className="flex gap-2 flex-wrap">
            {DIAS_GARANTIA.map(d => (
              <button key={d} type="button" onClick={() => setForm(p => ({ ...p, garantiaDias: String(d) }))}
                className="px-3 py-2 rounded-xl border text-xs font-semibold transition-all min-h-[36px]"
                style={String(form.garantiaDias) === String(d)
                  ? { backgroundColor: 'rgba(23,71,168,0.12)', borderColor: 'rgba(23,71,168,0.4)', color: 'var(--hc-accent)' }
                  : { backgroundColor: 'var(--hc-surface-2)', borderColor: 'var(--hc-border)', color: 'var(--hc-muted)' }}>
                {etiquetaGarantia(d)}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>SKU <span className="font-normal" style={{ color: 'var(--hc-muted)' }}>(código interno)</span></Label>
          <input className={inp} style={inpStyle} type="text" value={form.sku ?? ''} onChange={setCampo('sku')} placeholder="Ej: HC-001" />
        </div>
        <div>
          <Label>Barcode <span className="font-normal" style={{ color: 'var(--hc-muted)' }}>(EAN / UPC)</span></Label>
          <input className={inp} style={inpStyle} type="text" value={form.barcode ?? ''} onChange={setCampo('barcode')} placeholder="Ej: 7501234567890" />
        </div>
      </div>
    </div>
  )
}
