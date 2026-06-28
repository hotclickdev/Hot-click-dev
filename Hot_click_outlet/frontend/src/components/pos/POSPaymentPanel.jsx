import { useState, useRef } from 'react'
import { crmService } from '@/services/crmService'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)

const METODOS = [
  { id: 'EFECTIVO',      label: 'Efectivo',              icon: '💵', desc: 'Calcula vuelto' },
  { id: 'TARJETA',      label: 'Tarjeta (manual)',       icon: '💳', desc: 'Sin datafono' },
  { id: 'SINPE',        label: 'SINPE',                  icon: '📱', desc: 'Transferencia móvil' },
  { id: 'TRANSFERENCIA',label: 'Transferencia',          icon: '🏦', desc: 'Banco' },
  { id: 'DATAFONO',     label: 'Datafono integrado',     icon: '🔌', desc: 'Próximamente', disabled: true },
]

const SEG_COLOR = { NUEVO: '#6490EA', FRECUENTE: '#34d399', VIP: '#fbbf24', INACTIVO: '#A7B0BC' }

export default function POSPaymentPanel({ total, onConfirm, onClose, loading }) {
  const [metodoPago, setMetodoPago]       = useState('EFECTIVO')
  const [montoRecibido, setMontoRecibido] = useState('')
  const [confirmSinpe, setConfirmSinpe]   = useState('')
  const [clienteQuery, setClienteQuery]   = useState('')
  const [sugerencias, setSugerencias]     = useState([])
  const [clienteId, setClienteId]         = useState(null)
  const [clienteInfo, setClienteInfo]     = useState(null)
  const [buscando, setBuscando]           = useState(false)
  const timerRef = useRef(null)

  const montoRecibidoNum = Number.parseInt(montoRecibido.replace(/\D/g, '') || '0')
  const vuelto = metodoPago === 'EFECTIVO' && montoRecibidoNum > 0
    ? montoRecibidoNum - total
    : null
  const puedeConfirmar = metodoPago !== 'EFECTIVO' ||
    (montoRecibidoNum > 0 && montoRecibidoNum >= total)

  const handleConfirmar = () => {
    onConfirm({
      clienteId: clienteId ?? null,
      metodoPago,
      montoRecibido: metodoPago === 'EFECTIVO'
        ? Number.parseInt(montoRecibido.replace(/\D/g, '') || '0') : null,
      confirmacionSinpe: metodoPago === 'SINPE' ? confirmSinpe : null,
    })
  }

  const buscarCliente = (q) => {
    clearTimeout(timerRef.current)
    setClienteQuery(q)
    if (!q.trim() || q.trim().length < 2) { setSugerencias([]); return }
    setBuscando(true)
    timerRef.current = setTimeout(() => {
      crmService.buscarClientes(q.trim())
        .then(setSugerencias)
        .catch(() => setSugerencias([]))
        .finally(() => setBuscando(false))
    }, 300)
  }

  const seleccionarCliente = (c) => {
    setClienteId(c.id)
    setClienteInfo(c)
    setClienteQuery(`${c.nombre} ${c.apellidoPaterno}`.trim())
    setSugerencias([])
  }

  const limpiarCliente = () => {
    setClienteId(null)
    setClienteInfo(null)
    setClienteQuery('')
    setSugerencias([])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-5"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: 'var(--hc-text)' }}>Cobrar venta</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>✕</button>
        </div>

        {/* Total */}
        <div className="rounded-xl p-4 text-center"
          style={{ backgroundColor: 'rgba(23,71,168,0.1)', border: '1px solid rgba(23,71,168,0.2)' }}>
          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Total a cobrar</p>
          <p className="text-3xl font-black mt-1" style={{ color: 'var(--hc-accent)' }}>₡{fmt(total)}</p>
        </div>

        {/* Método de pago */}
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--hc-muted)' }}>Método de pago</p>
          <div className="grid grid-cols-2 gap-2">
            {METODOS.map(m => (
              <button key={m.id} onClick={() => !m.disabled && setMetodoPago(m.id)}
                disabled={m.disabled}
                title={m.disabled ? 'Próximamente' : m.desc}
                className="flex flex-col items-start px-3 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={(() => {
                  const borderColor = metodoPago === m.id ? 'var(--hc-accent)' : m.disabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)'
                  return {
                    backgroundColor: metodoPago === m.id ? 'var(--hc-accent)' : 'rgba(255,255,255,0.05)',
                    color: metodoPago === m.id ? '#fff' : 'var(--hc-muted)',
                    border: `1px solid ${borderColor}`,
                  }
                })()}>
                <span className="flex items-center gap-1.5">{m.icon} {m.label}</span>
                {m.desc && (
                  <span className="text-[10px] mt-0.5 opacity-60">{m.desc}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Campo específico por método */}
        {metodoPago === 'EFECTIVO' && (
          <div>
            <label htmlFor="pos-monto" className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>Monto recibido (₡)</label>
            <input id="pos-monto" type="text" autoFocus value={montoRecibido}
              onChange={e => setMontoRecibido(e.target.value)} placeholder="0"
              className="w-full mt-1.5 px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--hc-text)' }}/>
            {vuelto !== null && (
              <p className="text-sm font-bold mt-2"
                style={{ color: vuelto >= 0 ? '#34d399' : '#f87171' }}>
                {vuelto >= 0 ? `Vuelto: ₡${fmt(vuelto)}` : `Faltan ₡${fmt(Math.abs(vuelto))}`}
              </p>
            )}
          </div>
        )}

        {metodoPago === 'SINPE' && (
          <div>
            <label htmlFor="pos-sinpe-confirm" className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>Confirmación SINPE (opcional)</label>
            <input id="pos-sinpe-confirm" type="text" value={confirmSinpe} onChange={e => setConfirmSinpe(e.target.value)}
              placeholder="Número de confirmación"
              className="w-full mt-1.5 px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--hc-text)' }}/>
          </div>
        )}

        {/* Búsqueda de cliente con puntos */}
        <div>
          <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--hc-muted)' }}>
            Cliente
            {clienteInfo && (
              <span className="ml-2 font-normal" style={{ color: 'var(--hc-muted)' }}>
                — <span style={{ color: SEG_COLOR[clienteInfo.segmento] ?? '#A7B0BC' }}>
                  {clienteInfo.segmento ?? 'NUEVO'}
                </span>
                {' · '}
                <span style={{ color: '#fbbf24' }}>{clienteInfo.puntosFidelidad ?? 0} pts</span>
              </span>
            )}
          </p>
          <div className="relative">
            <input type="text" value={clienteQuery}
              onChange={e => buscarCliente(e.target.value)}
              placeholder="Buscar por nombre, correo o teléfono…"
              className="w-full px-3 py-2 rounded-xl text-xs outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--hc-text)' }}/>
            {clienteId && (
              <button onClick={limpiarCliente}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                style={{ color: '#f87171' }}>✕</button>
            )}
          </div>

          {/* Sugerencias */}
          {sugerencias.length > 0 && (
            <div className="mt-1 rounded-xl overflow-hidden border"
              style={{ backgroundColor: 'var(--hc-bg)', borderColor: 'rgba(255,255,255,0.08)' }}>
              {sugerencias.slice(0, 5).map(c => (
                <button key={c.id} onClick={() => seleccionarCliente(c)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-left transition-colors hover:bg-white/[0.04] border-b last:border-0"
                  style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--hc-text)' }}>
                      {c.nombre} {c.apellidoPaterno}
                    </p>
                    <p style={{ color: 'var(--hc-muted)' }}>{c.correo}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p style={{ color: '#fbbf24' }}>{c.puntosFidelidad ?? 0} pts</p>
                    <p style={{ color: SEG_COLOR[c.segmento] ?? '#A7B0BC', fontSize: '10px' }}>
                      {c.segmento ?? 'NUEVO'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {buscando && (
            <p className="text-[10px] mt-1" style={{ color: 'var(--hc-muted)' }}>Buscando…</p>
          )}

          {!clienteId && (
            <p className="text-[10px] mt-1" style={{ color: 'var(--hc-muted)' }}>
              Sin cliente identificado → se registra como "Mostrador"
            </p>
          )}
        </div>

        {/* Confirmar */}
        <button onClick={handleConfirmar} disabled={!puedeConfirmar || loading}
          className="w-full py-3.5 rounded-xl font-bold text-base transition-all disabled:opacity-40"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
          {loading ? 'Procesando…' : `Confirmar — ₡${fmt(total)}`}
        </button>
      </div>
    </div>
  )
}
