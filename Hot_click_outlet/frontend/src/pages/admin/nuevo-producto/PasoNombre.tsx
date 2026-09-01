import { inp, inpStyle } from './productFormUi'
import Label from './Label'
import type { SetCampo, WizardForm } from './wizardHelpers'

export default function PasoNombre({ form, setCampo, trademarkWarning }: {
  form: WizardForm
  setCampo: SetCampo
  trademarkWarning: string
}) {
  return (
    <div className="space-y-5">
      {trademarkWarning && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <svg className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#8a5a00' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span className="text-xs" style={{ color: '#8a5a00' }}>{trademarkWarning}</span>
        </div>
      )}
      <div>
        <Label required>Nombre del producto</Label>
        <input className={inp} style={inpStyle} value={form.nombre} onChange={setCampo('nombre')}
          placeholder="Ej: Tenis Nike Air Max 90 Blanco" maxLength={80} />
        <p className="text-xs mt-1 text-right" style={{ color: form.nombre.length >= 72 ? '#8a5a00' : 'var(--hc-muted)' }}>
          {form.nombre.length}/80
        </p>
      </div>
      <div>
        <Label>Título para FB Marketplace</Label>
        <input className={inp} style={inpStyle} value={form.titulo} onChange={setCampo('titulo')}
          placeholder="Ej: Tenis Nike Air Max Blanco" maxLength={40} />
        <p className="text-xs mt-1 text-right" style={{ color: form.titulo.length >= 36 ? '#8a5a00' : 'var(--hc-muted)' }}>
          {form.titulo.length}/40
        </p>
      </div>
    </div>
  )
}
