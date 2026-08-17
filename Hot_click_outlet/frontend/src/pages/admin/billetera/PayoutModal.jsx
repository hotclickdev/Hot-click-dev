import { useState } from 'react'
import { walletService } from '@/services/walletService'
import { useToast } from '@/components/ui/Toast'

/** Modal solicitud de retiro — bit-idéntico al original. */
export default function PayoutModal({ onClose, onSaved }) {
  const { showToast } = useToast()
  const [form, setForm] = useState({
    monto: '',
    metodo: 'SINPE',
    destinoSinpe: '',
    destinoIban: '',
    nombreTitular: '',
    bancoDestino: '',
    notas: '',
  })
  const [saving, setSaving] = useState(false)
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  const handleSave = async () => {
    if (!form.monto || Number(form.monto) <= 0) {
      showToast('Ingresa un monto válido', 'error'); return
    }
    if (form.metodo === 'SINPE' && !/^\d{8}$/.test(form.destinoSinpe)) {
      showToast('El número SINPE debe tener 8 dígitos', 'error'); return
    }
    if (form.metodo === 'TRANSFERENCIA' && (!form.destinoIban || !form.nombreTitular)) {
      showToast('IBAN y nombre del titular son requeridos', 'error'); return
    }
    setSaving(true)
    try {
      await walletService.solicitarPayout({ ...form, monto: Number(form.monto) })
      showToast('Solicitud de retiro enviada', 'success')
      onSaved()
    } catch (e) {
      showToast(e?.response?.data?.message ?? 'Error al solicitar retiro', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#16161a] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-lg font-semibold mb-5">Solicitar retiro</h2>

        <label htmlFor="bil-monto" className="block text-xs text-[#8e8e9a] mb-1">Monto (₡)</label>
        <input id="bil-monto"
          type="number" min="1" className="input-base w-full mb-4"
          placeholder="Ej: 50000"
          value={form.monto} onChange={set('monto')}
        />

        <label htmlFor="bil-metodo" className="block text-xs text-[#8e8e9a] mb-1">Método de pago</label>
        <select id="bil-metodo" className="input-base w-full mb-4" value={form.metodo} onChange={set('metodo')}>
          <option value="SINPE">SINPE Móvil</option>
          <option value="TRANSFERENCIA">Transferencia bancaria</option>
        </select>

        {form.metodo === 'SINPE' && (
          <>
            <label htmlFor="bil-sinpe" className="block text-xs text-[#8e8e9a] mb-1">Número SINPE (8 dígitos)</label>
            <input id="bil-sinpe"
              type="tel" maxLength={8} className="input-base w-full mb-4"
              placeholder="88001234"
              value={form.destinoSinpe} onChange={set('destinoSinpe')}
            />
          </>
        )}

        {form.metodo === 'TRANSFERENCIA' && (
          <>
            <label htmlFor="bil-iban" className="block text-xs text-[#8e8e9a] mb-1">IBAN</label>
            <input id="bil-iban" className="input-base w-full mb-3" placeholder="CR21 0152 0200 1026 2840 66"
              value={form.destinoIban} onChange={set('destinoIban')} />
            <label htmlFor="bil-titular" className="block text-xs text-[#8e8e9a] mb-1">Nombre del titular</label>
            <input id="bil-titular" className="input-base w-full mb-3"
              value={form.nombreTitular} onChange={set('nombreTitular')} />
            <label htmlFor="bil-banco" className="block text-xs text-[#8e8e9a] mb-1">Banco</label>
            <input id="bil-banco" className="input-base w-full mb-3"
              value={form.bancoDestino} onChange={set('bancoDestino')} />
          </>
        )}

        <label htmlFor="bil-notas" className="block text-xs text-[#8e8e9a] mb-1">Notas (opcional)</label>
        <textarea id="bil-notas" className="input-base w-full mb-5 resize-none" rows={2}
          value={form.notas} onChange={set('notas')} />

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm border border-white/10 hover:bg-white/5">
            Cancelar
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-xl text-sm bg-[var(--color-accent)] text-white font-medium disabled:opacity-50">
            {saving ? 'Enviando…' : 'Solicitar retiro'}
          </button>
        </div>
      </div>
    </div>
  )
}
