import PhoneField from '@/components/ui/PhoneField'
import ProveedorField from './ProveedorField'

export default function ProveedorFormModal({
  editing,
  form,
  saving,
  onClose,
  onSave,
  onSetField,
}) {
  const set = (field) => (val) => onSetField(field, val)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold" style={{ color: 'var(--hc-text)' }}>
            {editing ? 'Editar proveedor' : 'Nuevo proveedor'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>✕</button>
        </div>

        <ProveedorField label="Nombre *"   value={form.nombre}   onChange={set('nombre')}   placeholder="Ej: Distribuidora ABC" />
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--hc-muted)' }}>Tipo de proveedor</label>
          <select value={form.tipo} onChange={e => set('tipo')(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--hc-text)' }}>
            <option value="PRODUCTO_TERMINADO">Producto terminado</option>
            <option value="MATERIA_PRIMA">Materia prima</option>
          </select>
        </div>
        <ProveedorField label="Contacto"   value={form.contacto} onChange={set('contacto')} placeholder="Nombre del contacto" />
        <PhoneField
          label="Teléfono"
          value={form.telefono}
          onChange={set('telefono')}
        />
        <ProveedorField label="Correo" value={form.correo} onChange={set('correo')} type="email" placeholder="proveedor@mail.com" />
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--hc-muted)' }}>Notas</label>
          <textarea value={form.notas} onChange={e => set('notas')(e.target.value)} rows={2}
            placeholder="Condiciones de pago, observaciones…"
            className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--hc-text)' }}/>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>
            Cancelar
          </button>
          <button onClick={onSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
