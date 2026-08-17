import { useState, useEffect } from 'react'
import { giftCardService } from '@/services/giftCardService'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)

const ESTADO_STYLE = {
  ACTIVA:    'text-green-400 bg-green-400/10',
  AGOTADA:   'text-gray-400 bg-gray-400/10',
  VENCIDA:   'text-amber-400 bg-amber-400/10',
  CANCELADA: 'text-red-400 bg-red-400/10',
}

export default function AdminGiftCards() {
  const [cards, setCards]         = useState([])
  const [cargando, setCargando]   = useState(true)
  const [error, setError]         = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [creando, setCreando]     = useState(false)
  const [form, setForm]           = useState({ monto: '', fechaVencimiento: '', codigo: '' })

  async function cargar() {
    setCargando(true)
    try {
      const { data } = await giftCardService.listar()
      setCards(Array.isArray(data) ? data : [])
    } catch { setError('No se pudieron cargar las gift cards') }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  async function crear(e) {
    e.preventDefault()
    setCreando(true); setError(null)
    try {
      await giftCardService.crear({
        monto:            Number.parseInt(form.monto, 10),
        fechaVencimiento: form.fechaVencimiento || null,
        codigo:           form.codigo.trim().toUpperCase() || null,
      })
      setForm({ monto: '', fechaVencimiento: '', codigo: '' })
      setMostrarForm(false)
      await cargar()
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al crear la gift card')
    } finally { setCreando(false) }
  }

  async function cancelar(id) {
    if (!confirm('¿Cancelar esta gift card? No podrá usarse ni revertirse.')) return
    try {
      await giftCardService.cancelar(id)
      await cargar()
    } catch { setError('Error al cancelar') }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>Gift Cards</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
            Emite tarjetas de regalo canjeables en el checkout
          </p>
        </div>
        <button type="button" onClick={() => setMostrarForm(v => !v)}
          className="px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
          + Nueva gift card
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {/* Formulario */}
      {mostrarForm && (
        <form onSubmit={crear} className="rounded-2xl p-5 space-y-4"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <p className="font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>Nueva gift card</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label htmlFor="gc-monto" className="text-xs" style={{ color: 'var(--hc-muted)' }}>Monto (₡) *</label>
              <input id="gc-monto" required type="number" min="1000" placeholder="ej: 10000"
                value={form.monto}
                onChange={e => setForm(p => ({ ...p, monto: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
            </div>
            <div className="space-y-1">
              <label htmlFor="gc-codigo" className="text-xs" style={{ color: 'var(--hc-muted)' }}>Código (dejar vacío = auto)</label>
              <input id="gc-codigo" type="text" placeholder="GC-XXXX (opcional)"
                value={form.codigo} maxLength={30}
                onChange={e => setForm(p => ({ ...p, codigo: e.target.value.toUpperCase() }))}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
            </div>
            <div className="space-y-1">
              <label className="text-xs" style={{ color: 'var(--hc-muted)' }}>Vencimiento (opcional)</label>
              <input type="date"
                value={form.fechaVencimiento}
                onChange={e => setForm(p => ({ ...p, fechaVencimiento: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={creando}
              className="px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-80"
              style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
              {creando ? 'Creando…' : 'Crear gift card'}
            </button>
            <button type="button" onClick={() => setMostrarForm(false)}
              className="px-4 py-2 rounded-xl text-sm" style={{ color: 'var(--hc-muted)' }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Tabla */}
      {cargando ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--hc-muted)' }}>
          <div className="text-4xl mb-3">🎁</div>
          <p className="font-medium">No hay gift cards emitidas</p>
          <p className="text-sm mt-1">Crea una gift card para que tus clientes la usen en el checkout</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--hc-border)' }}>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--hc-surface)', borderBottom: '1px solid var(--hc-border)' }}>
                {['Código', 'Saldo inicial', 'Saldo actual', 'Estado', 'Vencimiento', 'Creada', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium"
                    style={{ color: 'var(--hc-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ divideColor: 'var(--hc-border)' }}>
              {cards.map(gc => (
                <tr key={gc.id} style={{ backgroundColor: 'var(--hc-surface)' }}
                  className="hover:brightness-110 transition-all">
                  <td className="px-4 py-3 font-mono font-bold text-xs" style={{ color: 'var(--hc-accent)' }}>
                    {gc.codigo}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--hc-muted)' }}>₡{fmt(gc.saldoInicial)}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: 'var(--hc-text)' }}>
                    ₡{fmt(gc.saldoActual)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ESTADO_STYLE[gc.estado] ?? ''}`}>
                      {gc.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>
                    {gc.fechaVencimiento || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>
                    {gc.fechaCreacion ? gc.fechaCreacion.slice(0, 10) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {gc.estado === 'ACTIVA' && (
                      <button type="button" onClick={() => cancelar(gc.id)}
                        className="text-xs px-2 py-1 rounded-lg hover:opacity-80"
                        style={{ border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}>
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
