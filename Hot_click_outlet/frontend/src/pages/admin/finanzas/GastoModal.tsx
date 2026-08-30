import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/components/ui/Toast'
import { gastoService } from '@/services/gastoService'
import type { JsonBody } from '@/types/api'
import { CATEGORIAS, EMPTY_GASTO, type GastoForm } from './finanzasHelpers'
import CloseIcon from '@/components/ui/CloseIcon'

const estiloCampo = {
  backgroundColor: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'var(--hc-text)',
}

type GastoModalProps = {
  editing: GastoForm
  onClose: () => void
  onSaved: () => void
}

export default function GastoModal({ editing, onClose, onSaved }: GastoModalProps) {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [form, setForm] = useState<GastoForm>(editing ?? EMPTY_GASTO)
  const [saving, setSaving] = useState(false)

  const setCampo = (campo: keyof GastoForm) => (valor: string) => setForm((prev) => ({ ...prev, [campo]: valor }))

  const handleSave = async () => {
    if (!form.concepto.trim()) {
      showToast(t('adminFinanzas.conceptRequired'), 'error')
      return
    }
    if (!form.monto || Number.parseInt(String(form.monto)) <= 0) {
      showToast(t('adminFinanzas.amountPositive'), 'error')
      return
    }
    setSaving(true)
    try {
      const dto = { ...form, monto: Number.parseInt(String(form.monto)) } as JsonBody
      if (editing?.id) await gastoService.actualizar(editing.id, dto)
      else await gastoService.crear(dto)
      showToast(editing?.id ? t('adminFinanzas.expenseUpdated') : t('adminFinanzas.expenseCreated'), 'success')
      onSaved()
    } catch {
      showToast(t('adminFinanzas.errorSaveExpense'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full px-3 py-2 rounded-xl text-sm outline-none'
  const montoInvalido = !form.monto || Number.parseInt(String(form.monto)) <= 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold" style={{ color: 'var(--hc-text)' }}>
            {editing?.id ? t('adminFinanzas.editExpense') : t('adminFinanzas.newExpense')}
          </h2>
          <button type="button" onClick={onClose} aria-label={t('adminFinanzas.close')} className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>
            <CloseIcon />
          </button>
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
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>
            Cancelar
          </button>
          <button type="button" onClick={handleSave} disabled={saving || !form.concepto.trim() || montoInvalido}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
            {saving ? t('adminFinanzas.saving') : t('adminFinanzas.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
