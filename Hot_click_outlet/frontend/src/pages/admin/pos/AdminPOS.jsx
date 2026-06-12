import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'react-qr-code'
import POSProductSearch from '@/components/pos/POSProductSearch'
import { posService } from '@/services/posService'
import { useToast } from '@/components/ui/Toast'
import useAuthStore from '@/store/authStore'

const fmt = n => new Intl.NumberFormat('es-CR').format(Math.round(n ?? 0))

/* ── Denominaciones CR ─────────────────────────────── */
const DENOM = [
  { v: 50000, label: '₡50.000', color: '#c0392b', bg: 'rgba(192,57,43,0.15)' },
  { v: 20000, label: '₡20.000', color: '#27ae60', bg: 'rgba(39,174,96,0.15)'  },
  { v: 10000, label: '₡10.000', color: '#e67e22', bg: 'rgba(230,126,34,0.15)' },
  { v:  5000, label: '₡5.000',  color: '#2980b9', bg: 'rgba(41,128,185,0.15)' },
  { v:  2000, label: '₡2.000',  color: '#8e44ad', bg: 'rgba(142,68,173,0.15)' },
  { v:  1000, label: '₡1.000',  color: '#795548', bg: 'rgba(121,85,72,0.15)'  },
  { v:   500, label: '₡500',    color: '#9e9e9e', bg: 'rgba(158,158,158,0.15)'},
  { v:   100, label: '₡100',    color: '#ffc107', bg: 'rgba(255,193,7,0.15)'  },
  { v:    50, label: '₡50',     color: '#ffc107', bg: 'rgba(255,193,7,0.12)'  },
]

/* ── Métodos de pago ───────────────────────────────── */
const METODOS = [
  { id: 'EFECTIVO',      label: 'Efectivo',      icon: '💵', color: '#34d399', desc: 'Pago en mano' },
  { id: 'SINPE',         label: 'SINPE Móvil',   icon: '📱', color: '#6490EA', desc: 'SINPE Móvil' },
  { id: 'TARJETA',       label: 'Tarjeta',       icon: '💳', color: '#7aa3ff', desc: 'Crédito / Débito' },
  { id: 'TRANSFERENCIA', label: 'Transferencia', icon: '🏦', color: '#fbbf24', desc: 'Bancaria' },
]

function sugerirMontos(total) {
  const bases = [1000, 2000, 5000, 10000, 20000, 50000]
  const out = []
  for (const b of bases) {
    const s = Math.ceil(total / b) * b
    if (s >= total && !out.includes(s) && out.length < 4) out.push(s)
  }
  return out
}

function descomponer(monto) {
  const r = []; let rest = Math.round(monto)
  for (const d of DENOM) {
    if (rest >= d.v) { const q = Math.floor(rest / d.v); r.push({ ...d, q }); rest -= q * d.v }
  }
  return r
}

/* ── Conteo de efectivo ────────────────────────────── */
function ConteoEfectivo({ label, onTotal }) {
  const [qtys, setQtys] = useState(() => Object.fromEntries(DENOM.map(d => [d.v, ''])))

  const setQty = (v, val) => {
    const next = { ...qtys, [v]: val }
    setQtys(next)
    onTotal(DENOM.reduce((s, d) => s + (parseInt(next[d.v]) || 0) * d.v, 0))
  }

  const total = DENOM.reduce((s, d) => s + (parseInt(qtys[d.v]) || 0) * d.v, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>{label}</p>
        <span className="text-xl font-black" style={{ color: '#34d399' }}>₡{fmt(total)}</span>
      </div>
      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
        {DENOM.map(d => {
          const qty = qtys[d.v]
          const sub = (parseInt(qty) || 0) * d.v
          return (
            <div key={d.v} className="flex items-center gap-2 sm:gap-3 px-3 py-2 border-b last:border-0"
              style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              <span className="w-20 shrink-0 text-center py-1 rounded-lg text-xs font-bold"
                style={{ backgroundColor: d.bg, color: d.color, border: `1px solid ${d.color}40` }}>
                {d.label}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setQty(d.v, Math.max(0, (parseInt(qty) || 0) - 1))}
                  className="w-7 h-7 rounded-lg font-bold text-base flex items-center justify-center transition-colors hover:bg-white/10"
                  style={{ color: 'var(--hc-muted)' }}>−</button>
                <input
                  type="number" min={0} value={qty}
                  onChange={e => setQty(d.v, Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-14 text-center text-sm font-bold rounded-lg outline-none py-1.5"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--hc-text)' }}
                />
                <button onClick={() => setQty(d.v, (parseInt(qty) || 0) + 1)}
                  className="w-7 h-7 rounded-lg font-bold text-base flex items-center justify-center transition-colors hover:bg-white/10"
                  style={{ color: 'var(--hc-muted)' }}>+</button>
              </div>
              <span className="ml-auto text-xs font-semibold tabular-nums" style={{ color: sub > 0 ? 'var(--hc-text)' : 'var(--hc-muted)' }}>
                {sub > 0 ? `₡${fmt(sub)}` : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Header ────────────────────────────────────────── */
function POSHeader({ userName, turno, step }) {
  const labels = { apertura: 'Paso 1 — Abrir turno', venta: 'Paso 2 — Pedido', cobro: 'Paso 3 — Cobrar', qr: 'Esperando pago', recibo: 'Venta lista' }
  return (
    <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 shrink-0 border-b border-white/5"
      style={{ backgroundColor: '#0c0c12' }}>
      <div className="flex items-center gap-2 mr-1">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
          style={{ background: 'var(--hc-accent)', color: '#fff' }}>HC</div>
        <span className="text-sm font-bold tracking-wider hidden sm:block" style={{ color: '#fff' }}>POS</span>
      </div>

      {labels[step] && (
        <span className="text-xs px-2.5 py-1 rounded-full font-medium"
          style={{ backgroundColor: 'rgba(23,71,168,0.12)', color: '#7aa3ff', border: '1px solid rgba(23,71,168,0.2)' }}>
          {labels[step]}
        </span>
      )}

      {turno && (
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
          style={{ backgroundColor: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-bold" style={{ color: '#34d399' }}>TURNO ACTIVO</span>
        </div>
      )}

      <div className="flex-1" />

      <Link to="/admin/pos/caja"
        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:brightness-125"
        style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
        Cuadre
      </Link>
      <Link to="/admin/pos/historial"
        className="hidden sm:block px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:brightness-125"
        style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
        Historial
      </Link>

      <div className="flex items-center gap-2 pl-2 border-l border-white/8">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff' }}>
          {userName?.[0]?.toUpperCase() ?? 'C'}
        </div>
        <span className="text-xs hidden lg:block" style={{ color: 'rgba(255,255,255,0.5)' }}>{userName}</span>
      </div>
    </div>
  )
}

/* ── PASO 1: Apertura ──────────────────────────────── */
function StepApertura({ onAbrir, loading }) {
  const [monto, setMonto] = useState(0)

  return (
    <div className="flex-1 overflow-y-auto flex items-start justify-center p-4 sm:p-8">
      <div className="w-full max-w-lg space-y-6 pt-2">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold"
            style={{ backgroundColor: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black"
              style={{ backgroundColor: 'rgba(52,211,153,0.2)' }}>1</span>
            Paso 1 de 3
          </div>
          <h1 className="text-2xl sm:text-3xl font-black" style={{ color: '#fff' }}>Abrí el turno</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Contá el efectivo inicial de la caja antes de empezar a vender
          </p>
        </div>

        <div className="rounded-2xl p-5"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <ConteoEfectivo label="Efectivo en caja al inicio" onTotal={setMonto} />
        </div>

        <button
          onClick={() => onAbrir(monto)}
          disabled={loading}
          className="w-full py-4 rounded-2xl font-black text-base transition-all hover:brightness-110 disabled:opacity-40"
          style={{ background: 'var(--hc-accent)', color: '#fff', boxShadow: '0 8px 24px rgba(23,71,168,0.4)' }}>
          {loading ? 'Abriendo turno…' : `✓  Abrir turno${monto > 0 ? ` — ₡${fmt(monto)}` : ''}`}
        </button>

        <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
          El monto inicial queda registrado en el cuadre de caja
        </p>
      </div>
    </div>
  )
}

/* ── Item del carrito ──────────────────────────────── */
function CartItem({ item, onSetCantidad, onSetPrecio, onRemove }) {
  return (
    <div className="rounded-xl p-3 flex gap-3 group"
      style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
        style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
        {item.imagen
          ? <img src={item.imagen} alt="" className="w-full h-full object-cover" />
          : <span className="text-lg">📦</span>}
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start justify-between gap-1">
          <p className="text-xs font-semibold line-clamp-2 leading-tight" style={{ color: '#F4F6F9' }}>
            {item.nombre}
          </p>
          <button onClick={() => onRemove(item.id)}
            className="w-5 h-5 rounded-lg flex items-center justify-center text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171' }}>✕</button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button onClick={() => onSetCantidad(item.id, item.cantidad - 1)} disabled={item.cantidad <= 1}
              className="w-6 h-6 rounded-md font-bold text-sm flex items-center justify-center disabled:opacity-30"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff' }}>−</button>
            <input type="number" min={1} value={item.cantidad}
              onChange={e => onSetCantidad(item.id, e.target.value)}
              className="w-10 text-center text-xs font-bold rounded-md outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '3px 0' }}/>
            <button onClick={() => onSetCantidad(item.id, item.cantidad + 1)} disabled={item.cantidad >= item.stockActual}
              className="w-6 h-6 rounded-md font-bold text-sm flex items-center justify-center disabled:opacity-30"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff' }}>+</button>
          </div>

          <div className="flex-1 relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: 'rgba(23,71,168,0.7)' }}>₡</span>
            <input type="text" value={fmt(item.precio)}
              onChange={e => onSetPrecio(item.id, e.target.value)}
              className="w-full pl-5 pr-2 text-xs font-bold text-right rounded-md outline-none"
              style={{
                backgroundColor: item.precio !== item.precioOriginal ? 'rgba(251,191,36,0.08)' : 'rgba(23,71,168,0.06)',
                border: `1px solid ${item.precio !== item.precioOriginal ? 'rgba(251,191,36,0.3)' : 'rgba(23,71,168,0.2)'}`,
                color: item.precio !== item.precioOriginal ? '#fbbf24' : '#7aa3ff',
                padding: '4px 8px 4px 18px',
              }}/>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-bold tabular-nums" style={{ color: 'rgba(255,255,255,0.5)' }}>
            = ₡{fmt(item.precio * item.cantidad)}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ── PASO 2: Venta ─────────────────────────────────── */
function StepVenta({ cartItems, onAdd, onSetCantidad, onSetPrecio, onRemove, descuento, onSetDescuento, subtotal, total, onNueva, onCobrar }) {
  const [mobileTab, setMobileTab] = useState('productos')
  const numItems = cartItems.reduce((s, i) => s + i.cantidad, 0)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tabs — solo móvil */}
      <div className="flex sm:hidden border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#0c0c12' }}>
        {[
          { id: 'productos', label: 'Productos' },
          { id: 'carrito', label: `Carrito${numItems > 0 ? ` (${numItems})` : ''}` },
        ].map(t => (
          <button key={t.id} onClick={() => setMobileTab(t.id)}
            className="flex-1 py-3 text-sm font-semibold transition-colors"
            style={{
              color: mobileTab === t.id ? 'var(--hc-accent)' : 'rgba(255,255,255,0.4)',
              borderBottom: `2px solid ${mobileTab === t.id ? 'var(--hc-accent)' : 'transparent'}`,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Panel productos */}
        <div className={`${mobileTab === 'carrito' ? 'hidden' : 'flex'} sm:flex flex-1 flex-col overflow-hidden border-r border-white/5`}>
          <div className="px-4 pt-2 pb-1 shrink-0">
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Buscá por nombre, SKU o escaneá el código de barras
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 pt-2">
            <POSProductSearch onAdd={onAdd} />
          </div>
        </div>

        {/* Panel carrito */}
        <div className={`${mobileTab === 'productos' ? 'hidden' : 'flex'} sm:flex flex-col w-full sm:w-80 lg:w-96 shrink-0 overflow-hidden`}
          style={{ backgroundColor: '#0a0a0e' }}>

          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: '#fff' }}>PEDIDO</span>
              {numItems > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ backgroundColor: 'rgba(23,71,168,0.2)', color: '#7aa3ff' }}>{numItems}</span>
              )}
            </div>
            {cartItems.length > 0 && (
              <button onClick={onNueva}
                className="text-xs px-2.5 py-1 rounded-lg"
                style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                Limpiar
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 opacity-30">
                <div className="text-5xl">🛒</div>
                <p className="text-xs font-semibold text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Buscá un producto y tocalo para agregarlo
                </p>
              </div>
            ) : (
              cartItems.map(item => (
                <CartItem key={item.id} item={item}
                  onSetCantidad={onSetCantidad} onSetPrecio={onSetPrecio} onRemove={onRemove} />
              ))
            )}
          </div>

          {/* Totales */}
          <div className="shrink-0 border-t border-white/5 p-4 space-y-3" style={{ backgroundColor: '#0c0c12' }}>
            <div className="flex items-center gap-3">
              <span className="text-xs shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>Descuento ₡</span>
              <input type="number" min={0} value={descuento || ''} placeholder="0"
                onChange={e => onSetDescuento(Math.max(0, parseInt(e.target.value || '0')))}
                className="flex-1 text-right px-3 py-2 rounded-xl text-sm font-bold outline-none"
                style={{
                  backgroundColor: descuento > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${descuento > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  color: descuento > 0 ? '#f87171' : 'rgba(255,255,255,0.5)',
                }}/>
            </div>

            {descuento > 0 && (
              <div className="space-y-0.5">
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'rgba(255,255,255,0.35)' }}>Subtotal</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>₡{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: '#f87171' }}>Descuento</span>
                  <span style={{ color: '#f87171' }}>-₡{fmt(descuento)}</span>
                </div>
              </div>
            )}

            <div className="rounded-xl px-4 py-3 flex items-center justify-between"
              style={{
                background: cartItems.length > 0 ? 'linear-gradient(135deg,rgba(23,71,168,0.2),rgba(23,71,168,0.1))' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${cartItems.length > 0 ? 'rgba(23,71,168,0.3)' : 'rgba(255,255,255,0.06)'}`,
              }}>
              <span className="text-xs font-bold tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>TOTAL</span>
              <span className="text-2xl font-black tabular-nums"
                style={{ color: cartItems.length > 0 ? '#fff' : 'rgba(255,255,255,0.2)', letterSpacing: '-0.5px' }}>
                ₡{fmt(total)}
              </span>
            </div>

            <button onClick={onCobrar} disabled={cartItems.length === 0}
              className="w-full py-4 rounded-2xl font-black text-base transition-all disabled:opacity-20 disabled:cursor-not-allowed"
              style={{
                background: cartItems.length > 0 ? 'var(--hc-accent)' : 'rgba(255,255,255,0.06)',
                color: '#fff',
                boxShadow: cartItems.length > 0 ? '0 6px 24px rgba(23,71,168,0.4)' : 'none',
                letterSpacing: '0.05em',
              }}>
              {cartItems.length === 0 ? 'Agregá productos primero' : `COBRAR  ·  ₡${fmt(total)}  →`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── PASO 3: Cobro ─────────────────────────────────── */
function StepCobro({ total, cartItems, descuento, onBack, onConfirmar, loading }) {
  const [metodo, setMetodo] = useState('EFECTIVO')
  const [recibido, setRecibido] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100) }, [metodo])

  const recibidoNum = parseInt(String(recibido).replace(/\D/g, '') || '0')
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
          <button onClick={onBack}
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
              <span className="font-semibold tabular-nums" style={{ color: '#fff' }}>₡{fmt(item.precio * item.cantidad)}</span>
            </div>
          ))}
          {descuento > 0 && (
            <div className="flex justify-between text-sm border-t pt-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <span style={{ color: '#f87171' }}>Descuento</span>
              <span style={{ color: '#f87171' }}>-₡{fmt(descuento)}</span>
            </div>
          )}
          <div className="flex justify-between font-black text-lg border-t pt-2"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <span style={{ color: '#fff' }}>Total a cobrar</span>
            <span style={{ color: 'var(--hc-accent)' }}>₡{fmt(total)}</span>
          </div>
        </div>

        {/* Método de pago */}
        <div className="space-y-3">
          <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>¿Cómo paga el cliente?</p>
          <div className="grid grid-cols-2 gap-2">
            {METODOS.map(m => (
              <button key={m.id} onClick={() => setMetodo(m.id)}
                className="flex items-center gap-3 px-4 py-4 rounded-2xl text-left transition-all"
                style={{
                  backgroundColor: metodo === m.id ? `${m.color}15` : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${metodo === m.id ? m.color : 'rgba(255,255,255,0.08)'}`,
                  transform: metodo === m.id ? 'scale(1.02)' : 'scale(1)',
                }}>
                <span className="text-2xl">{m.icon}</span>
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
                <button key={m} onClick={() => setRecibido(String(m))}
                  className="px-3 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
                  style={{
                    backgroundColor: recibidoNum === m ? 'rgba(23,71,168,0.25)' : 'rgba(23,71,168,0.08)',
                    border: `1px solid ${recibidoNum === m ? 'var(--hc-accent)' : 'rgba(23,71,168,0.2)'}`,
                    color: '#7aa3ff',
                  }}>
                  ₡{fmt(m)}
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
                    ₡{fmt(Math.abs(recibidoNum - total))}
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
            <p className="font-semibold text-sm" style={{ color: '#7aa3ff' }}>
              {metodo === 'SINPE' ? '📱 Se genera un QR de SINPE Móvil' : '💳 Se genera un QR para pago con tarjeta'}
            </p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              El cliente escanea el QR con su celular y paga en línea
            </p>
          </div>
        )}

        {metodo === 'TRANSFERENCIA' && (
          <div className="rounded-2xl p-4 text-center space-y-1"
            style={{ backgroundColor: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }}>
            <p className="font-semibold text-sm" style={{ color: '#fbbf24' }}>🏦 Revisá el comprobante antes de confirmar</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Verificá que la transferencia ya llegó a la cuenta
            </p>
          </div>
        )}

        {/* Confirmar */}
        <button
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

/* ── QR ────────────────────────────────────────────── */
function StepQR({ qrData, onConfirmSinpe, onCancelar, loadingConfirm }) {
  const { token, metodoPago, total, sinpeNumero } = qrData
  const qrUrl = `${window.location.origin}/pos/pago/${token}`
  const pollRef = useRef(null)
  const [paid, setPaid] = useState(false)

  useEffect(() => {
    if (metodoPago !== 'TARJETA') return
    pollRef.current = setInterval(async () => {
      try {
        const res = await posService.estadoQrSesion(token)
        if (res?.estado === 'PAGADO') { clearInterval(pollRef.current); setPaid(true) }
        else if (res?.estado === 'EXPIRADO' || res?.estado === 'CANCELADO') clearInterval(pollRef.current)
      } catch {}
    }, 3000)
    return () => clearInterval(pollRef.current)
  }, [token, metodoPago])

  useEffect(() => { if (paid) onConfirmSinpe(null, true) }, [paid]) // eslint-disable-line

  return (
    <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest mb-2"
            style={{ color: metodoPago === 'SINPE' ? '#6490EA' : '#7aa3ff' }}>
            {metodoPago === 'SINPE' ? '📱 Pago SINPE Móvil' : '💳 Pago con tarjeta'}
          </p>
          <p className="text-4xl font-black tabular-nums" style={{ color: '#fff', letterSpacing: '-1px' }}>
            ₡{fmt(total)}
          </p>
        </div>

        <div className="flex justify-center">
          <div className="p-4 rounded-2xl bg-white shadow-2xl">
            <QRCode value={qrUrl} size={200} />
          </div>
        </div>

        {metodoPago === 'SINPE' && (
          <div className="rounded-2xl p-4 space-y-2"
            style={{ backgroundColor: 'rgba(100,144,234,0.08)', border: '1px solid rgba(100,144,234,0.2)' }}>
            {[
              ['SINPE Móvil a:', sinpeNumero],
              ['Referencia:', (token ?? '').substring(0, 8).toUpperCase()],
              ['Monto exacto:', `₡${fmt(total)}`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span style={{ color: 'rgba(255,255,255,0.45)' }}>{k}</span>
                <span className="font-bold font-mono" style={{ color: k.includes('Monto') ? '#34d399' : '#6490EA' }}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {metodoPago === 'TARJETA' && !paid && (
          <p className="text-center text-xs animate-pulse" style={{ color: '#7aa3ff' }}>
            ⏳ Esperando confirmación de pago…
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button onClick={onCancelar}
            className="py-3 rounded-2xl text-sm font-semibold"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
            Cancelar
          </button>
          {metodoPago === 'SINPE' ? (
            <button onClick={() => onConfirmSinpe(token, false)} disabled={loadingConfirm}
              className="py-3 rounded-2xl text-sm font-black disabled:opacity-40"
              style={{ background: 'var(--hc-accent)', color: '#fff' }}>
              {loadingConfirm ? '⏳…' : '✓ SINPE recibido'}
            </button>
          ) : (
            <div className="py-3 rounded-2xl text-xs text-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)' }}>
              Auto-detecta el pago
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── PASO 4: Recibo ────────────────────────────────── */
function StepRecibo({ venta, userName, onNueva }) {
  const fecha = venta?.fechaPedido
    ? new Date(venta.fechaPedido).toLocaleString('es-CR')
    : new Date().toLocaleString('es-CR')

  function imprimir() {
    const s = document.createElement('style')
    s.id = '__pos-print'
    s.textContent = `@media print { body > * { display:none!important } #pos-ticket { display:block!important; width:80mm; background:#fff!important; color:#000!important } }`
    document.head.appendChild(s)
    window.print()
    setTimeout(() => document.getElementById('__pos-print')?.remove(), 800)
  }

  function whatsapp() {
    const items = (venta?.items ?? [])
      .map(i => `• ${i.producto?.nombreProducto ?? i.nombre ?? 'Producto'} ×${i.cantidad} = ₡${fmt(i.subtotalItem)}`)
      .join('\n')
    window.open(`https://wa.me/?text=${encodeURIComponent(`*Recibo HotClick*\nTicket: ${venta?.numeroPedido ?? '—'}\n\n${items}\n\n*Total: ₡${fmt(venta?.totalPedido)}*\n¡Gracias!`)}`, '_blank')
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-sm space-y-4">
        <div id="pos-ticket" className="rounded-3xl p-6 shadow-2xl"
          style={{ backgroundColor: '#0c0c10', border: '1px solid rgba(255,255,255,0.1)' }}>

          <div className="text-center mb-5">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center text-3xl"
              style={{ backgroundColor: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)' }}>
              ✓
            </div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#34d399' }}>Venta registrada</p>
            <p className="text-3xl font-black mt-1 tabular-nums" style={{ color: '#fff', letterSpacing: '-1px' }}>
              ₡{fmt(venta?.totalPedido)}
            </p>
          </div>

          <div className="space-y-1 text-xs mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>
            <div className="flex justify-between"><span>Ticket</span><span className="font-mono">{venta?.numeroPedido ?? '—'}</span></div>
            <div className="flex justify-between"><span>Fecha</span><span>{fecha}</span></div>
            <div className="flex justify-between"><span>Cajero</span><span>{userName}</span></div>
            <div className="flex justify-between"><span>Método</span><span>{venta?.metodoPago}</span></div>
          </div>

          <div className="border-t pt-3 mb-3 space-y-1" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            {(venta?.items ?? []).map((item, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span style={{ color: 'rgba(255,255,255,0.65)' }}>
                  {item.producto?.nombreProducto ?? item.nombre ?? 'Producto'} ×{item.cantidad}
                </span>
                <span className="font-semibold tabular-nums" style={{ color: '#fff' }}>₡{fmt(item.subtotalItem)}</span>
              </div>
            ))}
          </div>

          <p className="text-center text-xs mt-4" style={{ color: 'rgba(255,255,255,0.2)' }}>
            ¡Gracias por su compra! · HotClick CR
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button onClick={imprimir}
            className="py-3 rounded-2xl text-xs font-semibold transition-all hover:brightness-125"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>
            🖨 Imprimir
          </button>
          <button onClick={whatsapp}
            className="py-3 rounded-2xl text-xs font-semibold transition-all hover:brightness-125"
            style={{ backgroundColor: 'rgba(37,211,102,0.12)', color: '#25d366' }}>
            📲 WhatsApp
          </button>
          <button onClick={onNueva}
            className="py-3 rounded-2xl text-xs font-semibold transition-all hover:brightness-125"
            style={{ background: 'var(--hc-accent)', color: '#fff' }}>
            + Nueva
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── COMPONENTE PRINCIPAL ──────────────────────────── */
export default function AdminPOS() {
  const { showToast } = useToast()
  const userName = useAuthStore(s => s.userName)

  const [step, setStep]   = useState('loading')
  const [turno, setTurno] = useState(null)
  const [saving, setSaving] = useState(false)

  const [cartItems, setCartItems]   = useState([])
  const [descuento, setDescuento]   = useState(0)
  const [receipt, setReceipt]       = useState(null)
  const [qrData, setQrData]         = useState(null)
  const [loadingVenta, setLoadingVenta]     = useState(false)
  const [loadingConfirm, setLoadingConfirm] = useState(false)

  useEffect(() => {
    posService.getCajaActiva()
      .then(res => {
        const t = res?.data ?? null
        setTurno(t)
        setStep(t ? 'venta' : 'apertura')
      })
      .catch(() => setStep('apertura'))
  }, [])

  const agregarProducto = useCallback((producto) => {
    setCartItems(prev => {
      const id = producto.id ?? producto.idProducto
      const ex = prev.find(i => i.id === id)
      if (ex) return prev.map(i => i.id === id ? { ...i, cantidad: i.cantidad + 1 } : i)
      return [...prev, {
        id,
        nombre:        producto.nombreProducto ?? producto.nombre,
        imagen:        producto.imagenPrincipalUrl ?? null,
        precio:        producto.precioEfectivo ?? producto.precioVenta,
        precioOriginal: producto.precioEfectivo ?? producto.precioVenta,
        stockActual:   producto.stockActual ?? 0,
        cantidad:      1,
      }]
    })
  }, [])

  const setCantidad = (id, val) => {
    const n = Math.max(1, parseInt(val) || 1)
    setCartItems(prev => prev.map(i => i.id === id ? { ...i, cantidad: n } : i))
  }

  const setPrecio = (id, val) => {
    const n = parseInt(String(val).replace(/\D/g, ''))
    if (!isNaN(n)) setCartItems(prev => prev.map(i => i.id === id ? { ...i, precio: n } : i))
  }

  const quitarItem = (id) => setCartItems(prev => prev.filter(i => i.id !== id))

  const nuevaVenta = () => {
    setCartItems([])
    setDescuento(0)
    setReceipt(null)
    setQrData(null)
    setStep('venta')
  }

  const subtotal = cartItems.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const total    = Math.max(0, subtotal - descuento)

  const handleAbrir = async (montoInicial) => {
    setSaving(true)
    try {
      const res = await posService.abrirCaja({ montoInicial })
      setTurno(res.data)
      setStep('venta')
      showToast('Turno abierto — ¡a vender!', 'success')
    } catch (err) {
      showToast(err?.response?.data?.message ?? 'Error al abrir turno', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmarPago = async (payload) => {
    if (payload.metodoPago === 'SINPE' || payload.metodoPago === 'TARJETA') {
      setLoadingVenta(true)
      try {
        const res = await posService.crearQrSesion({
          metodoPago: payload.metodoPago,
          items: cartItems.map(i => ({ productoId: i.id, cantidad: i.cantidad, precioUnitario: i.precio, nombre: i.nombre })),
        })
        const data = res.data ?? res
        setQrData({
          token:       data.token,
          metodoPago:  data.metodoPago,
          total:       data.total ?? total,
          sinpeNumero: data.sinpeNumero ?? '50689745370',
        })
        setStep('qr')
      } catch (err) {
        showToast(err?.response?.data?.message ?? 'Error al generar QR', 'error')
      } finally {
        setLoadingVenta(false)
      }
      return
    }

    setLoadingVenta(true)
    try {
      const res = await posService.crearVenta({
        ...payload,
        descuentoGlobal: descuento,
        items: cartItems.map(i => ({ productoId: i.id, cantidad: i.cantidad, precioUnitario: i.precio })),
      })
      setReceipt(res.data ?? res)
      setCartItems([])
      setDescuento(0)
      setStep('recibo')
      showToast('✓ Venta registrada', 'success')
    } catch (err) {
      showToast(err?.response?.data?.message ?? 'Error al procesar la venta', 'error')
    } finally {
      setLoadingVenta(false)
    }
  }

  const handleQrConfirmSinpe = async (token, autoConfirmed) => {
    const receiptBase = {
      totalPedido:  qrData?.total,
      metodoPago:   autoConfirmed ? qrData?.metodoPago : 'SINPE',
      numeroPedido: '—',
      items: cartItems.map(i => ({
        producto: { nombreProducto: i.nombre },
        cantidad: i.cantidad,
        subtotalItem: i.precio * i.cantidad,
      })),
    }

    if (autoConfirmed) {
      setReceipt(receiptBase)
      setQrData(null)
      setCartItems([])
      setDescuento(0)
      setStep('recibo')
      showToast('✓ Pago con tarjeta confirmado', 'success')
      return
    }

    setLoadingConfirm(true)
    try {
      await posService.confirmarSinpeQr(token, {})
      setReceipt(receiptBase)
      setQrData(null)
      setCartItems([])
      setDescuento(0)
      setStep('recibo')
      showToast('✓ SINPE confirmado', 'success')
    } catch (err) {
      showToast(err?.response?.data?.message ?? 'Error al confirmar SINPE', 'error')
    } finally {
      setLoadingConfirm(false)
    }
  }

  const handleQrCancelar = async () => {
    if (qrData?.token) {
      try { await posService.cancelarQrSesion(qrData.token) } catch {}
    }
    setQrData(null)
    setStep('cobro')
  }

  if (step === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: '#08080c' }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--hc-accent)', borderTopColor: 'transparent' }}/>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden"
      style={{ backgroundColor: '#08080c', fontFamily: "'JetBrains Mono','Fira Code','Consolas',monospace" }}>
      <POSHeader userName={userName} turno={turno} step={step} />

      {step === 'apertura' && <StepApertura onAbrir={handleAbrir} loading={saving} />}

      {step === 'venta' && (
        <StepVenta
          cartItems={cartItems}
          onAdd={agregarProducto}
          onSetCantidad={setCantidad}
          onSetPrecio={setPrecio}
          onRemove={quitarItem}
          descuento={descuento}
          onSetDescuento={setDescuento}
          subtotal={subtotal}
          total={total}
          onNueva={nuevaVenta}
          onCobrar={() => setStep('cobro')}
        />
      )}

      {step === 'cobro' && (
        <StepCobro
          total={total}
          cartItems={cartItems}
          descuento={descuento}
          onBack={() => setStep('venta')}
          onConfirmar={handleConfirmarPago}
          loading={loadingVenta}
        />
      )}

      {step === 'qr' && qrData && (
        <StepQR
          qrData={qrData}
          onConfirmSinpe={handleQrConfirmSinpe}
          onCancelar={handleQrCancelar}
          loadingConfirm={loadingConfirm}
        />
      )}

      {step === 'recibo' && receipt && (
        <StepRecibo venta={receipt} userName={userName} onNueva={nuevaVenta} />
      )}
    </div>
  )
}
