import Input from '@/components/ui/Input'
import { setCampo } from './productoFormCampos'

export default function BloqueInventario({ form, setForm }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Input label="Stock *" type="number" min="0" value={form.stock} onChange={setCampo(setForm, 'stock')} required />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>Condición</label>
        <select value={form.condicion} onChange={setCampo(setForm, 'condicion')} className="h-11 px-3 rounded-xl text-sm focus:outline-none" style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
          <option value="NUEVO">Nuevo</option>
          <option value="COMO_NUEVO">Como nuevo</option>
          <option value="USADO">Usado</option>
        </select>
      </div>
    </div>
  )
}
