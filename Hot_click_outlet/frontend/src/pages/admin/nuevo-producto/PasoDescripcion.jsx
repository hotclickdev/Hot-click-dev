import { ta, inpStyle } from './productFormUi'
import Label from './Label'

export default function PasoDescripcion({ form, setCampo }) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Descripción corta</Label>
        <textarea className={ta} style={inpStyle} rows={4} value={form.descripcion} onChange={setCampo('descripcion')}
          placeholder="Ej: Tenis running con suela de aire, talla 42, color blanco." maxLength={200} autoFocus />
        <p className="text-xs mt-1 text-right" style={{ color: form.descripcion.length >= 180 ? '#8a5a00' : 'var(--hc-muted)' }}>
          {form.descripcion.length}/200
        </p>
      </div>
      <div>
        <Label>Descripción larga <span className="font-normal" style={{ color: 'var(--hc-muted)' }}>(opcional)</span></Label>
        <textarea className={ta} style={inpStyle} rows={5} value={form.descripcionLarga} onChange={setCampo('descripcionLarga')}
          placeholder="Descripción completa del producto…" maxLength={2000} />
      </div>
    </div>
  )
}
