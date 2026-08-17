import { useState, useEffect, useRef } from 'react'
import { METODOS, formatMontoPos, sugerirMontos, descomponer } from './posHelpers'
import { MetodoPagoIcon } from './posIcons'

export default function StepCobro({ total, cartItems, descuento, onBack, onConfirmar, loading }) {
  const [metodo, setMetodo] = useState('EFECTIVO')
  const [recibido, setRecibido] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100) }, [metodo])

  const recibidoNum = Number.parseInt(String(recibido).replace(/\D/g, '') || '0')
  const vuelto = metodo === 'EFECTIVO' && recibidoNum > total ? recibidoNum - total : 0
  const faltante = metodo === 'EFECTIVO' && recibidoNum > 0 && recibidoNum < total
  const puedeConfirmar = metodo !== 'EFECTIVO' || (recibidoNum >= total && recibidoNum > 0)
  const montosSugeridos = sugerirMontos(total)
  const billetesSugeridos = descomponer(vuelto)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* Volver */}
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack}
            className="px-3 py-2 rounded-xl text-sm font-semibold transition-all hover:brightness-125"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
            ← Volver al pedido
          </button>
        </div>

        {/* Resumen del pedido */}
        <div className="rounded-2xl p-4 space-y-2"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Resumen del pedido
          </p>
          {cartItems.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span style={{ color: 'rgba(255,255,255,0.65)' }}>
                {item.nombre} <span style={{ color: 'rgba(255,255,255,0.35)' }}>×{item.cantidad}</span>
              </span>
              <span className="font-semibold tabular-nums" style={{ color: '#fff' }}>₡{formatMontoPos(item.precio * item.cantidad)}</span>
            </div>
          ))}
          {descuento > 0 && (
            <div className="flex justify-between text-sm border-t pt-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <span style={{ color: '#f87171' }}>Descuento</span>
              <span style={{ color: '#f87171' }}>-₡{formatMontoPos(descuento)}</span>
            </div>
          )}
          <div className="flex justify-between font-black text-lg border-t pt-2"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <span style={{ color: '#fff' }}>Total a cobrar</span>
            <span style={{ color: 'var(--hc-accent)' }}>₡{formatMontoPos(total)}</span>
          </div>
        </div>

        {/* Método de pago */}
        <div className="space-y-3">
          <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>¿Cómo paga el cliente?</p>
          <div className="grid grid-cols-2 gap-2">
            {METODOS.map(m => (
              <button type="button" key={m.id} onClick={() => setMetodo(m.id)}
                className="flex items-center gap-3 px-4 py-4 rounded-2xl text-left transition-all"
                style={{
                  backgroundColor: metodo === m.id ? `${m.color}15` : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${metodo === m.id ? m.color : 'rgba(255,255,255,0.08)'}`,
                  transform: metodo === m.id ? 'scale(1.02)' : 'scale(1)',
                }}>
                <span style={{ color: metodo === m.id ? m.color : 'rgba(255,255,255,0.65)' }}>
                  <MetodoPagoIcon iconId={m.iconId} />
                </span>
                <div>
                  <p className="text-sm font-bold" style={{ color: metodo === m.id ? m.color : 'rgba(255,255,255,0.65)' }}>
                    {m.label}
                  </p>
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{m.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Efectivo: calculadora de vuelto */}
        {metodo === 'EFECTIVO' && (
          <div className="rounded-2xl p-4 space-y-3"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>Monto recibido</p>

            <div className="flex flex-wrap gap-2">
              {montosSugeridos.map(m => (
                <button type="button" key={m} onClick={() => setRecibido(String(m))}
                  className="px-3 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
                  style={{
                    backgroundColor: recibidoNum === m ? 'rgba(23,71,168,0.25)' : 'rgba(23,71,168,0.08)',
                    border: `1px solid ${recibidoNum === m ? 'var(--hc-accent)' : 'rgba(23,71,168,0.2)'}`,
                    color: '#7aa3ff',
                  }}>
                  ₡{formatMontoPos(m)}
                </button>
              ))}
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>₡</span>
              <input
                ref={inputRef}
                type="number" min={0} value={recibido} placeholder="0"
                onChange={e => setRecibido(e.target.value)}
                className="w-full pl-9 pr-4 py-4 rounded-xl text-2xl font-black outline-none tabular-nums"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  border: `2px solid ${puedeConfirmar && recibidoNum > 0 ? 'rgba(52,211,153,0.4)' : faltante ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  color: '#fff',
                }}/>
            </div>

            {recibidoNum > 0 && (
              <div className="rounded-xl p-3"
                style={{
                  backgroundColor: vuelto >= 0 && !faltante ? 'rgba(52,211,153,0.06)' : 'rgba(239,68,68,0.06)',
                  border: `1px solid ${vuelto > 0 || (!faltante && recibidoNum === total) ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)'}`,
                }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {faltante ? 'Faltante' : 'Vuelto'}
                  </span>
                  <span className="text-2xl font-black tabular-nums"
                    style={{ color: faltante ? '#f87171' : '#34d399' }}>
                    ₡{formatMontoPos(Math.abs(recibidoNum - total))}
                  </span>
                </div>
                {vuelto > 0 && billetesSugeridos.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {billetesSugeridos.map((b, i) => (
                      <span key={i} className="px-2 py-1 rounded-lg text-xs font-bold"
                        style={{ backgroundColor: b.bg, color: b.color }}>
                        {b.q}× {b.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SINPE / Tarjeta */}
        {(metodo === 'SINPE' || metodo === 'TARJETA') && (
          <div className="rounded-2xl p-4 text-center space-y-1"
            style={{ backgroundColor: 'rgba(23,71,168,0.06)', border: '1px solid rgba(23,71,168,0.2)' }}>
            <p className="font-semibold text-sm flex items-center justify-center gap-2" style={{ color: '#7aa3ff' }}>
              <MetodoPagoIcon iconId={metodo === 'SINPE' ? 'sinpe' : 'tarjeta'} className="w-4 h-4" />
              {metodo === 'SINPE' ? 'Se genera un QR de SINPE Móvil' : 'Se genera un QR para pago con tarjeta'}
            </p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              El cliente escanea el QR con su celular y paga en línea
            </p>
          </div>
        )}

        {metodo === 'TRANSFERENCIA' && (
          <div className="rounded-2xl p-4 text-center space-y-1"
            style={{ backgroundColor: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
            <p className="font-semibold text-sm flex items-center justify-center gap-2" style={{ color: '#fbbf24' }}>
              <MetodoPagoIcon iconId="transferencia" className="w-4 h-4" />
              Revisá el comprobante antes de confirmar
            </p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Verificá que la transferencia ya llegó a la cuenta
            </p>
          </div>
        )}

        {/* Confirmar */}
        <button type="button"
          onClick={() => onConfirmar({ metodoPago: metodo, montoRecibido: metodo === 'EFECTIVO' ? recibidoNum : null })}
          disabled={!puedeConfirmar || loading}
          className="w-full py-4 rounded-2xl font-black text-base transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: puedeConfirmar ? 'var(--hc-accent)' : 'rgba(255,255,255,0.06)',
            color: '#fff',
            boxShadow: puedeConfirmar ? '0 8px 24px rgba(23,71,168,0.35)' : 'none',
          }}>
          {loading
            ? '⏳ Procesando…'
            : (metodo === 'SINPE' || metodo === 'TARJETA')
              ? '📲 Generar QR de pago'
              : '✓  Confirmar cobro'}
        </button>
      </div>
    </div>
  )
}
