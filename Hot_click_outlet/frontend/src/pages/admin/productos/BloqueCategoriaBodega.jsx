import CategoriaSelect from '@/components/admin/CategoriaSelect'
import { setCampo, setField } from './productoFormCampos'

export default function BloqueCategoriaBodega({ form, setForm, categories, bodegas }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>Categoría *</label>
        <CategoriaSelect
          categories={categories}
          value={form.categoriaId}
          onChange={(id) => setField(setForm, 'categoriaId', id)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>Bodega *</label>
        <select value={form.bodegaId} onChange={setCampo(setForm, 'bodegaId')} className="h-11 px-3 rounded-xl text-sm focus:outline-none" style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} required={bodegas.length > 0}>
          <option value="">{bodegas.length === 0 ? '— Sin bodegas —' : 'Selecciona bodega'}</option>
          {bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombreBodega ?? b.nombre}</option>)}
        </select>
      </div>
    </div>
  )
}
