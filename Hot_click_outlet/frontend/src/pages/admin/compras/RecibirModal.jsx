import { useState } from 'react'
import { compraService } from '@/services/compraService'
import { useToast } from '@/components/ui/Toast'

/** Modal recibir mercancía — bit-idéntico al original. */
export default function RecibirModal({ orden, onClose, onDone }) {
  const { showToast } = useToast()
  const [cantidades, setCantidades] = useState(
    (orden.items ?? []).reduce((acc, it) => ({ ...acc, [it.id]: it.cantidad - it.cantidadRecibida }), {}),
  )
  const [saving, setSaving] = useState(false)

  const handleConfirmar = async () => {
    const items = Object.entries(cantidades)
      .map(([itemId, cantidadRecibida]) => ({ itemId: Number(itemId), cantidadRecibida: Number.parseInt(cantidadRecibida) || 0 }))
      .filter((it) => it.cantidadRecibida > 0)

    if (items.length === 0) { showToast('Ingresá al menos una cantidad', 'error'); return }

    setSaving(true)
    try {
      await compraService.recibir(orden.id, { items })
      showToast('Recepción registrada y stock actualizado', 'success')
      onDone()
    } catch (err) {
      showToast(err?.response?.data?.message ?? 'Error al recibir', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-lg rounded-2xl p-6 space-y-5"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold" style={{ color: 'var(--hc-text)' }}>
            Recibir mercancía — {orden.numeroOrden}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>✕</button>
        </div>

        <div className="space-y-3">
          {(orden.items ?? []).map((item) => {
            const pendiente = item.cantidad - item.cantidadRecibida
            return (
              <div key={item.id} className="flex items-center gap-3 rounded-xl p-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--hc-text)' }}>
                    {item.producto?.nombreProducto ?? 'Producto'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                    Ordenado: {item.cantidad} · Recibido: {item.cantidadRecibida} · Pendiente: {pendiente}
                  </p>
                </div>
                <div className="w-24">
                  <input
                    type="number" min={0} max={pendiente}
                    value={cantidades[item.id] ?? 0}
                    onChange={(e) => {
                      const v = Math.max(0, Math.min(pendiente, Number.parseInt(e.target.value) || 0))
                      setCantidades((c) => ({ ...c, [item.id]: v }))
                    }}
                    disabled={pendiente <= 0}
                    className="w-full px-2 py-1.5 rounded-lg text-sm text-center outline-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--hc-text)' }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
          Cada cantidad recibida incrementará el stock del producto automáticamente.
        </p>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>
            Cancelar
          </button>
          <button onClick={handleConfirmar} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ backgroundColor: '#34d399', color: '#000' }}>
            {saving ? 'Registrando…' : 'Confirmar recepción'}
          </button>
        </div>
      </div>
    </div>
  )
}
