import { ta, inpStyle } from './productFormUi'
import Label from './Label'
import TagSelector from './TagSelector'
import type { Dispatch, SetStateAction } from 'react'
import type { SetCampo, WizardForm } from './wizardHelpers'

export default function PasoContenido({ form, setCampo, setForm }: {
  form: WizardForm
  setCampo: SetCampo
  setForm: Dispatch<SetStateAction<WizardForm>>
}) {
  return (
    <div className="space-y-5">
      <div>
        <Label>Especificaciones técnicas</Label>
        <textarea className={ta} style={inpStyle} rows={5} value={form.especificaciones} onChange={setCampo('especificaciones')}
          placeholder={'Marca: \nModelo: \nMaterial: \nTalla: \nColor: '} maxLength={500} autoFocus />
        <p className="text-xs mt-1 text-right" style={{ color: form.especificaciones.length >= 450 ? '#8a5a00' : 'var(--hc-muted)' }}>
          {form.especificaciones.length}/500
        </p>
      </div>
      <div>
        <Label>Cómo usar / cuidados</Label>
        <textarea className={ta} style={inpStyle} rows={3} value={form.comoUsar} onChange={setCampo('comoUsar')}
          placeholder="Ej: Lavar a mano. No usar secadora." maxLength={150} />
        <p className="text-xs mt-1 text-right" style={{ color: form.comoUsar.length >= 135 ? '#8a5a00' : 'var(--hc-muted)' }}>
          {form.comoUsar.length}/150
        </p>
      </div>
      <TagSelector value={form.tags ?? ''} onChange={v => setForm(p => ({ ...p, tags: v }))} />
    </div>
  )
}
