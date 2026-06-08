import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import QRCode from 'react-qr-code'
import POSProductSearch from '@/components/pos/POSProductSearch'
import { posService } from '@/services/posService'
import { useToast } from '@/components/ui/Toast'
import useAuthStore from '@/store/authStore'

/* ── Utilidades ──────────────────────────────────────────────── */
const fmt = (n) => new Intl.NumberFormat('es-CR').format(Math.round(n ?? 0))

const BILLETES = [
  { v: 50000, label: '₡50K',  color: '#e74c3c', bg: 'rgba(231,76,60,0.18)'  },
  { v: 20000, label: '₡20K',  color: '#27ae60', bg: 'rgba(39,174,96,0.18)'  },
  { v: 10000, label: '₡10K',  color: '#e67e22', bg: 'rgba(230,126,34,0.18)' },
  { v:  5000, label: '₡5K',   color: '#2980b9', bg: 'rgba(41,128,185,0.18)' },
  { v:  2000, label: '₡2K',   color: '#8e44ad', bg: 'rgba(142,68,173,0.18)' },
  { v:  1000, label: '₡1K',   color: '#7f6000', bg: 'rgba(180,140,60,0.18)' },
  { v:   500, label: '₡500',  color: '#95a5a6', bg: 'rgba(149,165,166,0.18)'},
  { v:   100, label: '₡100',  color: '#f39c12', bg: 'rgba(243,156,18,0.18)' },
  { v:    50, label: '₡50',   color: '#f39c12', bg: 'rgba(243,156,18,0.14)' },
]

function descomponer(monto) {
  const r = []; let rest = Math.round(monto)
  for (const b of BILLETES) {
    if (rest >= b.v) { const q = Math.floor(rest / b.v); r.push({ ...b, q }); rest -= q * b.v }
  }
  return r
}

function sugerirRecibidos(total) {
  const out = []; const bases = [1000,2000,5000,10000,20000,50000]
  for (const b of bases) {
    const s = Math.ceil(total / b) * b
    if (s >= total && !out.includes(s) && out.length < 4) out.push(s)
  }
  return out
}

/* ── Método de pago ──────────────────────────────────────────── */
const METODOS = [
  { id: 'EFECTIVO',      label: 'Efectivo',     icon: '💵', color: '#34d399' },
  { id: 'SINPE',         label: 'SINPE',         icon: '📱', color: '#60a5fa' },
  { id: 'TARJETA',       label: 'Tarjeta',       icon: '💳', color: '#a78bfa' },
  { id: 'TRANSFERENCIA', label: 'Transferencia', icon: '🏦', color: '#fbbf24' },
]

/* ── Modal de cobro ──────────────────────────────────────────── */
function PayModal({ total, onConfirm, onClose, loading }) {
  const [metodo, setMetodo]     = useState('EFECTIVO')
  const [recibido, setRecibido] = useState('')
  const [sinpeRef, setSinpeRef] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100) }, [metodo])

  const recibidoNum = parseInt(String(recibido).replace(/\D/g, '') || '0')
  const vuelto      = metodo === 'EFECTIVO' && recibidoNum > total ? recibidoNum - total : 0
  const puedeConfirmar = metodo !== 'EFECTIVO' || (recibidoNum >= total && recibidoNum > 0)
  const billetesSugeridos = descomponer(vuelto)
  const montosSugeridos   = sugerirRecibidos(total)

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }} transition={{ type: 'spring', damping: 22, stiffness: 280 }}
        className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: '#0c0c10', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#4f7cff' }}>Cobrar venta</p>
            <p className="text-4xl font-black mt-1 tabular-nums" style={{ color: '#fff', letterSpacing: '-1px' }}>
              ₡{fmt(total)}
            </p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }}>✕</button>
        </div>

        <div className="px-6 space-y-5 pb-6">
          {/* Selector de método */}
          <div className="grid grid-cols-2 gap-2">
            {METODOS.map(m => (
              <button key={m.id} onClick={() => setMetodo(m.id)}
                className="flex items-center gap-2.5 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all"
                style={{
                  backgroundColor: metodo === m.id ? `${m.color}20` : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${metodo === m.id ? m.color : 'rgba(255,255,255,0.08)'}`,
                  color: metodo === m.id ? m.color : 'rgba(255,255,255,0.5)',
                  transform: metodo === m.id ? 'scale(1.02)' : 'scale(1)',
                }}>
                <span className="text-lg">{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
            <div className="flex items-center gap-2.5 px-4 py-3.5 rounded-2xl text-sm opacity-25 cursor-not-allowed col-span-2"
              style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1.5px dashed rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }}>
              <span className="text-lg">🔌</span>
              <span>Datafono integrado — próximamente</span>
            </div>
          </div>

          {/* Campo efectivo */}
          {metodo === 'EFECTIVO' && (
            <div className="space-y-3">
              {/* Sugerencias de monto */}
              <div className="flex gap-2 flex-wrap">
                {montosSugeridos.map(m => (
                  <button key={m} onClick={() => setRecibido(String(m))}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-105"
                    style={{
                      backgroundColor: recibidoNum === m ? 'rgba(79,124,255,0.25)' : 'rgba(79,124,255,0.08)',
                      border: `1px solid ${recibidoNum === m ? '#4f7cff' : 'rgba(79,124,255,0.25)'}`,
                      color: '#7aa3ff',
                    }}>
                    ₡{fmt(m)}
                  </button>
                ))}
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>₡</span>
                <input
                  ref={inputRef}
                  type="number" min={0} value={recibido}
                  onChange={e => setRecibido(e.target.value)}
                  placeholder="0"
                  className="w-full pl-9 pr-4 py-3.5 rounded-2xl text-xl font-bold outline-none tabular-nums"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    border: '1.5px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                  }}
                />
              </div>

              {/* Vuelto */}
              {recibidoNum > 0 && (
                <div className="rounded-2xl p-4"
                  style={{
                    backgroundColor: vuelto >= 0 ? 'rgba(52,211,153,0.08)' : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${vuelto >= 0 ? 'rgba(52,211,153,0.25)' : 'rgba(239,68,68,0.25)'}`,
                  }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {vuelto >= 0 ? 'Vuelto' : 'Faltante'}
                    </span>
                    <span className="text-2xl font-black tabular-nums"
                      style={{ color: vuelto >= 0 ? '#34d399' : '#f87171' }}>
                      ₡{fmt(Math.abs(recibidoNum - total))}
                    </span>
                  </div>
                  {vuelto > 0 && billetesSugeridos.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {billetesSugeridos.map((b, i) => (
                        <span key={i}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold"
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

          {/* Info QR para SINPE/TARJETA */}
          {(metodo === 'SINPE' || metodo === 'TARJETA') && (
            <div className="rounded-2xl p-4 text-center"
              style={{ backgroundColor: 'rgba(79,124,255,0.06)', border: '1px solid rgba(79,124,255,0.2)' }}>
              <p className="text-xs font-semibold" style={{ color: '#7aa3ff' }}>
                {metodo === 'SINPE'
                  ? '📱 Se generará un QR con instrucciones de SINPE'
                  : '💳 Se generará un QR para pago con tarjeta vía Stripe'}
              </p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                El cliente escanea el QR con su celular
              </p>
            </div>
          )}

          {/* Botón confirmar */}
          <button
            onClick={() => onConfirm({ metodoPago: metodo, montoRecibido: metodo === 'EFECTIVO' ? recibidoNum : null })}
            disabled={!puedeConfirmar || loading}
            className="w-full py-4 rounded-2xl font-black text-base transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: puedeConfirmar ? 'linear-gradient(135deg, #4f7cff 0%, #7c3aed 100%)' : 'rgba(255,255,255,0.08)',
              color: '#fff',
              boxShadow: puedeConfirmar ? '0 8px 24px rgba(79,124,255,0.35)' : 'none',
            }}>
            {loading
              ? '⏳ Generando…'
              : (metodo === 'SINPE' || metodo === 'TARJETA')
                ? '📲 Generar QR de pago'
                : '✓  Confirmar cobro'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Modal de recibo ─────────────────────────────────────────── */
function ReceiptModal({ venta, onNuevaVenta }) {
  const userName = useAuthStore(s => s.userName)
  const fecha    = venta?.fechaPedido
    ? new Date(venta.fechaPedido).toLocaleString('es-CR')
    : new Date().toLocaleString('es-CR')

  function imprimir() {
    const style = document.createElement('style')
    style.id = '__pos-print'
    style.textContent = `@media print { body > * { display:none!important } #pos-ticket { display:block!important; width:80mm; background:#fff!important; color:#000!important } }`
    document.head.appendChild(style)
    window.print()
    setTimeout(() => document.getElementById('__pos-print')?.remove(), 800)
  }

  function whatsapp() {
    const items = (venta?.items ?? [])
      .map(i => `• ${i.producto?.nombreProducto ?? 'Producto'} ×${i.cantidad} = ₡${fmt(i.subtotalItem)}`).join('\n')
    window.open(`https://wa.me/?text=${encodeURIComponent(`*Recibo HOTCLICK*\nTicket: ${venta.numeroPedido}\n\n${items}\n\n*Total: ₡${fmt(venta.totalPedido)}*\n¡Gracias!`)}`, '_blank')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 24 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-xs space-y-4"
      >
        {/* Ticket */}
        <div id="pos-ticket"
          className="rounded-3xl p-6 shadow-2xl"
          style={{ backgroundColor: '#0c0c10', border: '1px solid rgba(255,255,255,0.1)' }}>
          {/* Éxito */}
          <div className="text-center mb-5">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center text-3xl"
              style={{ backgroundColor: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)' }}>
              ✓
            </div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#34d399' }}>Venta registrada</p>
            <p className="text-2xl font-black mt-1 tabular-nums" style={{ color: '#fff' }}>
              ₡{fmt(venta?.totalPedido)}
            </p>
          </div>

          <div className="space-y-1 text-xs mb-4" style={{ color: 'rgba(255,255,255,0.45)' }}>
            <div className="flex justify-between"><span>Ticket</span><span className="font-mono">{venta?.numeroPedido}</span></div>
            <div className="flex justify-between"><span>Fecha</span><span>{fecha}</span></div>
            <div className="flex justify-between"><span>Cajero</span><span>{userName}</span></div>
            <div className="flex justify-between"><span>Método</span><span>{venta?.metodoPago}</span></div>
          </div>

          <div className="border-t border-white/8 pt-3 mb-3 space-y-1">
            {(venta?.items ?? []).map((item, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {item.producto?.nombreProducto ?? 'Prod.'} ×{item.cantidad}
                </span>
                <span className="font-semibold tabular-nums" style={{ color: '#fff' }}>₡{fmt(item.subtotalItem)}</span>
              </div>
            ))}
          </div>

          {venta?.descuentoTotal > 0 && (
            <div className="flex justify-between text-xs mb-2">
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Descuento</span>
              <span style={{ color: '#f87171' }}>-₡{fmt(venta.descuentoTotal)}</span>
            </div>
          )}

          <p className="text-center text-xs mt-4" style={{ color: 'rgba(255,255,255,0.25)' }}>
            ¡Gracias por su compra! · HOTCLICK CR
          </p>
        </div>

        {/* Acciones */}
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
          <button onClick={onNuevaVenta}
            className="py-3 rounded-2xl text-xs font-semibold transition-all hover:brightness-125"
            style={{ background: 'linear-gradient(135deg,#4f7cff,#7c3aed)', color: '#fff' }}>
            + Nueva
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── QR Payment Modal ────────────────────────────────────────── */
function QRModal({ qrData, onConfirmSinpe, onCancelar, loadingConfirm }) {
  const { token, metodoPago, total, sinpeNumero, sinpeRef } = qrData
  const qrUrl = `${window.location.origin}/pos/pago/${token}`
  const [polling, setPolling]   = useState(false)
  const [paid, setPaid]         = useState(false)
  const pollRef                 = useRef(null)

  useEffect(() => {
    if (metodoPago !== 'TARJETA') return
    setPolling(true)
    pollRef.current = setInterval(async () => {
      try {
        const res = await posService.estadoQrSesion(token)
        if (res?.estado === 'PAGADO') {
          clearInterval(pollRef.current)
          setPaid(true)
        } else if (res?.estado === 'EXPIRADO' || res?.estado === 'CANCELADO') {
          clearInterval(pollRef.current)
        }
      } catch {}
    }, 3000)
    return () => clearInterval(pollRef.current)
  }, [token, metodoPago])

  useEffect(() => {
    if (paid) onConfirmSinpe(null, true)
  }, [paid]) // eslint-disable-line

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }} transition={{ type: 'spring', damping: 22, stiffness: 280 }}
        className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: '#0c0c10', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="px-6 pt-6 pb-4">
          <p className="text-xs font-bold uppercase tracking-widest mb-1"
            style={{ color: metodoPago === 'SINPE' ? '#60a5fa' : '#a78bfa' }}>
            {metodoPago === 'SINPE' ? '📱 Pago SINPE' : '💳 Pago con tarjeta'}
          </p>
          <p className="text-3xl font-black tabular-nums" style={{ color: '#fff', letterSpacing: '-1px' }}>
            ₡{fmt(total)}
          </p>
        </div>

        {/* QR */}
        <div className="flex justify-center px-6 pb-4">
          <div className="p-4 rounded-2xl" style={{ backgroundColor: '#fff' }}>
            <QRCode value={qrUrl} size={180} />
          </div>
        </div>

        {/* SINPE details */}
        {metodoPago === 'SINPE' && (
          <div className="mx-6 mb-4 rounded-2xl p-4 space-y-2"
            style={{ backgroundColor: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}>
            <div className="flex justify-between text-sm">
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>SINPE Móvil a:</span>
              <span className="font-bold font-mono" style={{ color: '#60a5fa' }}>{sinpeNumero}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>Referencia:</span>
              <span className="font-bold font-mono" style={{ color: '#fff' }}>{sinpeRef}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>Monto exacto:</span>
              <span className="font-bold" style={{ color: '#34d399' }}>₡{fmt(total)}</span>
            </div>
          </div>
        )}

        {/* Tarjeta waiting */}
        {metodoPago === 'TARJETA' && !paid && polling && (
          <div className="mx-6 mb-4 text-center py-3 rounded-2xl"
            style={{ backgroundColor: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}>
            <span className="text-xs animate-pulse" style={{ color: '#a78bfa' }}>⏳ Esperando pago del cliente…</span>
          </div>
        )}

        <div className="px-6 pb-6 grid grid-cols-2 gap-3">
          <button onClick={onCancelar}
            className="py-3 rounded-2xl text-sm font-semibold transition-all hover:brightness-125"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
            Cancelar
          </button>
          {metodoPago === 'SINPE' && (
            <button
              onClick={() => onConfirmSinpe(token, false)}
              disabled={loadingConfirm}
              className="py-3 rounded-2xl text-sm font-black transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#4f7cff,#7c3aed)', color: '#fff' }}>
              {loadingConfirm ? '⏳…' : '✓ SINPE recibido'}
            </button>
          )}
          {metodoPago === 'TARJETA' && (
            <div className="py-3 rounded-2xl text-xs text-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)' }}>
              Auto-detecta el pago
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── POS principal ───────────────────────────────────────────── */
export default function AdminPOS() {
  const { showToast }  = useToast()
  const userName       = useAuthStore(s => s.userName)

  const [cartItems, setCartItems]     = useState([])
  const [descuento, setDescuento]     = useState(0)
  const [turnoActivo, setTurnoActivo] = useState(null)
  const [showPayment, setShowPayment] = useState(false)
  const [receipt, setReceipt]         = useState(null)
  const [loadingVenta, setLoadingVenta] = useState(false)
  const [ventasHoy, setVentasHoy]     = useState({ count: 0, total: 0 })
  const [qrData, setQrData]           = useState(null)
  const [loadingConfirm, setLoadingConfirm] = useState(false)

  const searchRef = useRef(null)

  useEffect(() => {
    posService.getCajaActiva()
      .then(res => {
        const t = res?.data ?? null
        setTurnoActivo(t)
        if (t) {
          const count = t.numTransacciones ?? 0
          const total = (t.totalEfectivo ?? 0) + (t.totalSinpe ?? 0) + (t.totalTarjeta ?? 0) + (t.totalTransferencia ?? 0)
          setVentasHoy({ count, total })
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.querySelector('input')?.focus() }
      if (e.key === 'F4' && cartItems.length > 0) { e.preventDefault(); setShowPayment(true) }
      if (e.key === 'F8') { e.preventDefault(); nuevaVenta() }
      if (e.key === 'Escape') { setShowPayment(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [cartItems.length]) // eslint-disable-line

  const agregarProducto = useCallback((producto) => {
    setCartItems(prev => {
      const id = producto.id ?? producto.idProducto
      const ex = prev.find(i => i.id === id)
      if (ex) return prev.map(i => i.id === id ? { ...i, cantidad: i.cantidad + 1 } : i)
      return [...prev, {
        id,
        nombre: producto.nombreProducto ?? producto.nombre,
        imagen: producto.imagenPrincipalUrl ?? null,
        precio: producto.precioEfectivo ?? producto.precioVenta,
        precioOriginal: producto.precioEfectivo ?? producto.precioVenta,
        stockActual: producto.stockActual ?? 0,
        cantidad: 1,
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
  const nuevaVenta = () => { setCartItems([]); setDescuento(0); setReceipt(null); setShowPayment(false) }

  const subtotal = cartItems.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const total    = Math.max(0, subtotal - descuento)

  const handleConfirmarPago = async (payload) => {
    if (payload.metodoPago === 'SINPE' || payload.metodoPago === 'TARJETA') {
      setLoadingVenta(true)
      try {
        const res = await posService.crearQrSesion({
          metodoPago: payload.metodoPago,
          items: cartItems.map(i => ({ productoId: i.id, cantidad: i.cantidad, precioUnitario: i.precio, nombre: i.nombre })),
        })
        const data = res.data ?? res
        setShowPayment(false)
        setQrData({
          token:       data.token,
          metodoPago:  data.metodoPago,
          total:       data.total ?? total,
          sinpeNumero: data.sinpeNumero ?? '50689745370',
          sinpeRef:    (data.token ?? '').substring(0, 8).toUpperCase(),
        })
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
      setShowPayment(false)
      setVentasHoy(v => ({ count: v.count + 1, total: v.total + total }))
      showToast('✓ Venta registrada', 'success')
    } catch (err) {
      showToast(err?.response?.data?.message ?? 'Error al procesar la venta', 'error')
    } finally {
      setLoadingVenta(false)
    }
  }

  const handleQrConfirmSinpe = async (token, autoConfirmed) => {
    if (autoConfirmed) {
      showToast('✓ Pago con tarjeta confirmado', 'success')
      setVentasHoy(v => ({ count: v.count + 1, total: v.total + (qrData?.total ?? 0) }))
      setQrData(null)
      setReceipt({ totalPedido: qrData?.total, metodoPago: qrData?.metodoPago, items: cartItems.map(i => ({ producto: { nombreProducto: i.nombre }, cantidad: i.cantidad, subtotalItem: i.precio * i.cantidad })) })
      nuevaVenta()
      return
    }
    setLoadingConfirm(true)
    try {
      await posService.confirmarSinpeQr(token, {})
      showToast('✓ SINPE confirmado', 'success')
      setVentasHoy(v => ({ count: v.count + 1, total: v.total + (qrData?.total ?? 0) }))
      setReceipt({ totalPedido: qrData?.total, metodoPago: 'SINPE', numeroPedido: '—', items: cartItems.map(i => ({ producto: { nombreProducto: i.nombre }, cantidad: i.cantidad, subtotalItem: i.precio * i.cantidad })) })
      setQrData(null)
      nuevaVenta()
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
  }

  /* ─── Turno elapsed ─── */
  const [elapsed, setElapsed] = useState('')
  useEffect(() => {
    if (!turnoActivo?.fechaApertura) return
    const tick = () => {
      const diff = Math.floor((Date.now() - new Date(turnoActivo.fechaApertura).getTime()) / 1000)
      const h = Math.floor(diff / 3600); const m = Math.floor((diff % 3600) / 60)
      setElapsed(`${h}h ${String(m).padStart(2,'0')}m`)
    }
    tick(); const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [turnoActivo])

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ backgroundColor: '#08080c', fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace" }}>

      {/* ── TOP BAR ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 shrink-0 border-b border-white/5"
        style={{ backgroundColor: '#0c0c12', backgroundImage: 'linear-gradient(90deg, rgba(79,124,255,0.04) 0%, transparent 50%)' }}>

        {/* Logo + título */}
        <div className="flex items-center gap-2 mr-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
            style={{ background: 'linear-gradient(135deg,#4f7cff,#7c3aed)', color: '#fff' }}>HC</div>
          <span className="text-sm font-bold tracking-wider" style={{ color: '#fff' }}>POS</span>
        </div>

        {/* Estado turno */}
        {turnoActivo ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-bold" style={{ color: '#34d399' }}>TURNO ABIERTO</span>
            {elapsed && <span className="text-xs" style={{ color: 'rgba(52,211,153,0.6)' }}>{elapsed}</span>}
          </div>
        ) : (
          <Link to="/admin/pos/caja"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:brightness-125"
            style={{ backgroundColor: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)' }}>
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="text-xs font-bold" style={{ color: '#fbbf24' }}>ABRIR TURNO</span>
          </Link>
        )}

        {/* Stats del día */}
        {turnoActivo && (
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>HOY:</span>
            <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {ventasHoy.count} ventas
            </span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>
            <span className="text-xs font-bold tabular-nums" style={{ color: '#60a5fa' }}>₡{fmt(ventasHoy.total)}</span>
          </div>
        )}

        <div className="flex-1" />

        {/* Shortcuts */}
        <div className="hidden md:flex items-center gap-1.5">
          {[['F2','Buscar'],['F4','Cobrar'],['F8','Nuevo']].map(([key, label]) => (
            <div key={key} className="flex items-center gap-1 px-2 py-1 rounded-md"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <kbd className="text-[10px] font-bold px-1.5 rounded"
                style={{ backgroundColor: 'rgba(79,124,255,0.2)', color: '#7aa3ff' }}>{key}</kbd>
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Acciones rápidas */}
        <Link to="/admin/pos/caja"
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:brightness-125"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
          Cuadre
        </Link>
        <Link to="/admin/pos/historial"
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:brightness-125"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
          Historial
        </Link>

        {/* Cajero */}
        <div className="flex items-center gap-2 pl-3 border-l border-white/8">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff' }}>
            {userName?.[0]?.toUpperCase() ?? 'C'}
          </div>
          <span className="text-xs hidden lg:block" style={{ color: 'rgba(255,255,255,0.5)' }}>{userName}</span>
        </div>
      </div>

      {/* ── MAIN LAYOUT ─────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Panel izquierdo — productos */}
        <div ref={searchRef} className="flex-1 flex flex-col overflow-hidden border-r border-white/5">
          <div className="flex-1 overflow-y-auto p-4">
            <POSProductSearch onAdd={agregarProducto} />
          </div>
        </div>

        {/* Panel derecho — carrito */}
        <div className="w-80 lg:w-96 xl:w-[420px] flex flex-col shrink-0 overflow-hidden"
          style={{ backgroundColor: '#0a0a0e' }}>

          {/* Cabecera carrito */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: '#fff' }}>PEDIDO</span>
              {cartItems.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ backgroundColor: 'rgba(79,124,255,0.2)', color: '#7aa3ff' }}>
                  {cartItems.length}
                </span>
              )}
            </div>
            {cartItems.length > 0 && (
              <button onClick={nuevaVenta}
                className="text-xs px-2.5 py-1 rounded-lg transition-all hover:brightness-125"
                style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                🗑 Limpiar
              </button>
            )}
          </div>

          {/* Lista de ítems */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            <AnimatePresence>
              {cartItems.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-48 gap-3 opacity-25">
                  <div className="text-5xl">🛒</div>
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Carrito vacío
                  </p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    F2 → buscar producto
                  </p>
                </motion.div>
              ) : (
                cartItems.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="rounded-2xl p-3 flex gap-3 group"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    {/* Imagen */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                      {item.imagen
                        ? <img src={item.imagen} alt="" className="w-full h-full object-cover" />
                        : <span className="text-xl">📦</span>}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-semibold line-clamp-2 leading-tight" style={{ color: '#e8e8ed' }}>
                          {item.nombre}
                        </p>
                        <button onClick={() => quitarItem(item.id)}
                          className="w-5 h-5 rounded-lg flex items-center justify-center text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                          ✕
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        {/* Qty */}
                        <div className="flex items-center gap-1">
                          <button onClick={() => setCantidad(item.id, item.cantidad - 1)}
                            disabled={item.cantidad <= 1}
                            className="w-7 h-7 rounded-lg font-bold text-sm flex items-center justify-center transition-all hover:brightness-125 disabled:opacity-30"
                            style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff' }}>−</button>
                          <input
                            type="number" min={1} value={item.cantidad}
                            onChange={e => setCantidad(item.id, e.target.value)}
                            className="w-10 text-center text-sm font-bold rounded-lg outline-none tabular-nums"
                            style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '3px 0' }}
                          />
                          <button onClick={() => setCantidad(item.id, item.cantidad + 1)}
                            disabled={item.cantidad >= item.stockActual}
                            className="w-7 h-7 rounded-lg font-bold text-sm flex items-center justify-center transition-all hover:brightness-125 disabled:opacity-30"
                            style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff' }}>+</button>
                        </div>

                        {/* Precio editable */}
                        <div className="flex-1 relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: 'rgba(79,124,255,0.6)' }}>₡</span>
                          <input
                            type="text"
                            value={fmt(item.precio)}
                            onChange={e => setPrecio(item.id, e.target.value)}
                            className="w-full pl-5 pr-2 text-xs font-bold text-right rounded-lg outline-none tabular-nums"
                            style={{
                              backgroundColor: item.precio !== item.precioOriginal ? 'rgba(251,191,36,0.08)' : 'rgba(79,124,255,0.06)',
                              border: `1px solid ${item.precio !== item.precioOriginal ? 'rgba(251,191,36,0.3)' : 'rgba(79,124,255,0.2)'}`,
                              color: item.precio !== item.precioOriginal ? '#fbbf24' : '#7aa3ff',
                              padding: '4px 8px 4px 18px',
                            }}
                          />
                        </div>
                      </div>

                      {/* Subtotal */}
                      <div className="flex justify-end mt-1">
                        <span className="text-xs font-bold tabular-nums" style={{ color: 'rgba(255,255,255,0.6)' }}>
                          = ₡{fmt(item.precio * item.cantidad)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Totales + cobrar */}
          <div className="shrink-0 border-t border-white/5"
            style={{ backgroundColor: '#0c0c12' }}>

            {/* Descuento */}
            <div className="flex items-center gap-3 px-5 pt-4 pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Descuento ₡
              </span>
              <div className="flex-1 relative">
                <input
                  type="number" min={0} value={descuento || ''}
                  onChange={e => setDescuento(Math.max(0, parseInt(e.target.value || '0')))}
                  placeholder="0"
                  className="w-full text-right pr-3 py-2 rounded-xl text-sm font-bold outline-none tabular-nums"
                  style={{
                    backgroundColor: descuento > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${descuento > 0 ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.08)'}`,
                    color: descuento > 0 ? '#f87171' : 'rgba(255,255,255,0.5)',
                  }}
                />
              </div>
            </div>

            {/* Resumen */}
            <div className="px-5 pb-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span style={{ color: 'rgba(255,255,255,0.35)' }}>Subtotal</span>
                <span className="tabular-nums" style={{ color: 'rgba(255,255,255,0.6)' }}>₡{fmt(subtotal)}</span>
              </div>
              {descuento > 0 && (
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'rgba(239,68,68,0.7)' }}>Descuento</span>
                  <span className="tabular-nums" style={{ color: '#f87171' }}>-₡{fmt(descuento)}</span>
                </div>
              )}
              {cartItems.length > 0 && (
                <div className="flex justify-between text-xs mt-1">
                  <span style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {cartItems.reduce((s,i) => s + i.cantidad, 0)} ítems
                  </span>
                  <span className="tabular-nums" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {cartItems.length} líneas
                  </span>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="mx-4 mb-3 rounded-2xl px-5 py-4 flex items-center justify-between"
              style={{
                background: cartItems.length > 0
                  ? 'linear-gradient(135deg, rgba(79,124,255,0.15) 0%, rgba(124,58,237,0.1) 100%)'
                  : 'rgba(255,255,255,0.03)',
                border: `1px solid ${cartItems.length > 0 ? 'rgba(79,124,255,0.25)' : 'rgba(255,255,255,0.06)'}`,
              }}>
              <span className="text-sm font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.5)' }}>
                TOTAL
              </span>
              <span className="text-3xl font-black tabular-nums"
                style={{
                  color: cartItems.length > 0 ? '#fff' : 'rgba(255,255,255,0.2)',
                  letterSpacing: '-1px',
                }}>
                ₡{fmt(total)}
              </span>
            </div>

            {/* Botón cobrar */}
            <div className="px-4 pb-4">
              <button
                onClick={() => setShowPayment(true)}
                disabled={cartItems.length === 0}
                className="w-full py-4 rounded-2xl font-black text-base tracking-wide transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                style={{
                  background: cartItems.length > 0
                    ? 'linear-gradient(135deg, #4f7cff 0%, #7c3aed 100%)'
                    : 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  boxShadow: cartItems.length > 0 ? '0 8px 32px rgba(79,124,255,0.4)' : 'none',
                  letterSpacing: '0.05em',
                }}>
                {cartItems.length === 0 ? 'CARRITO VACÍO' : `COBRAR  ·  F4`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODALES ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showPayment && (
          <PayModal
            total={total}
            onConfirm={handleConfirmarPago}
            onClose={() => setShowPayment(false)}
            loading={loadingVenta}
          />
        )}
        {qrData && (
          <QRModal
            qrData={qrData}
            onConfirmSinpe={handleQrConfirmSinpe}
            onCancelar={handleQrCancelar}
            loadingConfirm={loadingConfirm}
          />
        )}
        {receipt && (
          <ReceiptModal venta={receipt} onNuevaVenta={nuevaVenta} />
        )}
      </AnimatePresence>
    </div>
  )
}
