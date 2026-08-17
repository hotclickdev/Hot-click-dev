import { useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import { gastoService } from '@/services/gastoService'
import { CATEGORIAS, EMPTY_GASTO } from './finanzasHelpers'

const estiloCampo = {
  backgroundColor: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'var(--hc-text)',
}

export default function GastoModal({ editing, onClose, onSaved }) {
  const { showToast } = useToast()
  const [form, setForm] = useState(editing ?? EMPTY_GASTO)
  const [saving, setSaving] = useState(false)

  const setCampo = (campo) => (valor) => setForm((prev) => ({ ...prev, [campo]: valor }))

  const handleSave = async () => {
    if (!form.concepto.trim()) {
      showToast('El concepto es requerido', 'error')
      return
    }
    if (!form.monto || Number.parseInt(form.monto) <= 0) {
      showToast('El monto debe ser mayor a 0', 'error')
      return
    }
    setSaving(true)
    try {
      const dto = { ...form, monto: Number.parseInt(form.monto) }
      if (editing?.id) await gastoService.actualizar(editing.id, dto)
      else await gastoService.crear(dto)
      showToast(editing?.id ? 'Gasto actualizado' : 'Gasto registrado', 'success')
      onSaved()
    } catch {
      showToast('Error al guardar gasto', 'error')
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full px-3 py-2 rounded-xl text-sm outline-none'
  const montoInvalido = !form.monto || Number.parseInt(form.monto) <= 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold" style={{ color: 'var(--hc-text)' }}>
            {editing?.id ? 'Editar gasto' : 'Nuevo gasto'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>✕</button>
        </div>

        <div>
          <label htmlFor="fin-concepto" className="block text-xs font-medium mb-1" style={{ color: 'var(--hc-muted)' }}>Concepto *</label>
          <input id="fin-concepto" type="text" value={form.concepto} onChange={(e) => setCampo('concepto')(e.target.value)}
            placeholder="Ej: Pago de alquiler" className={inp} style={estiloCampo} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="fin-monto" className="block text-xs font-medium mb-1" style={{ color: 'var(--hc-muted)' }}>Monto (₡) *</label>
            <input id="fin-monto" type="number" min={1} value={form.monto} onChange={(e) => setCampo('monto')(e.target.value)}
              placeholder="0" className={inp} style={estiloCampo} />
          </div>
          <div>
            <label htmlFor="fin-fecha" className="block text-xs font-medium mb-1" style={{ color: 'var(--hc-muted)' }}>Fecha</label>
            <input id="fin-fecha" type="date" value={form.fecha} onChange={(e) => setCampo('fecha')(e.target.value)}
              className={inp} style={estiloCampo} />
          </div>
        </div>

        <div>
          <label htmlFor="fin-categoria" className="block text-xs font-medium mb-1" style={{ color: 'var(--hc-muted)' }}>Categoría</label>
          <select id="fin-categoria" value={form.categoria} onChange={(e) => setCampo('categoria')(e.target.value)}
            className={inp} style={estiloCampo}>
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="fin-notas" className="block text-xs font-medium mb-1" style={{ color: 'var(--hc-muted)' }}>Notas</label>
          <textarea id="fin-notas" value={form.notas} onChange={(e) => setCampo('notas')(e.target.value)} rows={2}
            placeholder="Observaciones opcionales…"
            className={`${inp} resize-none`} style={estiloCampo} />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving || !form.concepto.trim() || montoInvalido}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
