import { useState } from 'react'
import { cotizacionClienteService } from '@/services/cotizacionService'
import { useToast } from '@/components/ui/Toast'
import Field from './Field'
import { inputCls, inputStyle } from './nuevaCotizacionUi'

export default function ModalCliente({ onClose, onCreado }) {
  const { toast } = useToast()
  const [form, setForm] = useState({ nombreComercial: '', razonSocial: '', cedulaJuridica: '', correo: '', telefono: '', direccion: '', contactoPrincipal: '' })
  const [loading, setLoading] = useState(false)

  async function guardar() {
    if (!form.nombreComercial.trim()) { toast('El nombre comercial es obligatorio', 'error'); return }
    setLoading(true)
    try {
      const cliente = await cotizacionClienteService.crear(form)
      toast('Cliente creado', 'success')
      onCreado(cliente)
    } catch { toast('Error al crear cliente', 'error') }
    finally { setLoading(false) }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border p-6 space-y-4"
        style={{ background: 'var(--hc-card)', borderColor: 'var(--hc-border)' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg" style={{ color: 'var(--hc-text)' }}>Nuevo cliente B2B</h3>
          <button type="button" onClick={onClose} style={{ color: 'var(--hc-muted)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            ['Nombre comercial *', 'nombreComercial'],
            ['Razón social', 'razonSocial'],
            ['Cédula jurídica', 'cedulaJuridica'],
            ['Correo', 'correo'],
            ['Teléfono', 'telefono'],
            ['Contacto principal', 'contactoPrincipal'],
          ].map(([label, key]) => (
            <Field key={key} label={label}>
              <input className={inputCls} style={inputStyle}
                value={form[key]} onChange={e => set(key, e.target.value)} />
            </Field>
          ))}
          <div className="col-span-2">
            <Field label="Dirección">
              <input className={inputCls} style={inputStyle}
                value={form.direccion} onChange={e => set('direccion', e.target.value)} />
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium border"
            style={{ color: 'var(--hc-muted)', borderColor: 'var(--hc-border)' }}>
            Cancelar
          </button>
          <button type="button" onClick={guardar} disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--hc-accent)', color: '#fff' }}>
            {loading ? 'Guardando...' : 'Crear cliente'}
          </button>
        </div>
      </div>
    </div>
  )
}
