import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import POSProductSearch from '@/components/pos/POSProductSearch'
import POSPaymentPanel from '@/components/pos/POSPaymentPanel'
import POSReceipt from '@/components/pos/POSReceipt'
import { posService } from '@/services/posService'
import { useToast } from '@/components/ui/Toast'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)

export default function AdminPOS() {
  const { showToast } = useToast()

  const [cartItems, setCartItems]       = useState([])
  const [descuento, setDescuento]       = useState(0)
  const [turnoActivo, setTurnoActivo]   = useState(null)
  const [showPayment, setShowPayment]   = useState(false)
  const [receipt, setReceipt]           = useState(null)
  const [loadingVenta, setLoadingVenta] = useState(false)

  const searchRef = useRef(null)

  // Cargar turno activo al montar
  useEffect(() => {
    posService.getCajaActiva()
      .then(res => setTurnoActivo(res?.data ?? null))
      .catch(() => {})
  }, [])

  // Atajos de teclado
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.querySelector('input')?.focus() }
      if (e.key === 'F4' && cartItems.length > 0) { e.preventDefault(); setShowPayment(true) }
      if (e.key === 'F8') { e.preventDefault(); nuevaVenta() }
      if (e.key === 'Escape') { setShowPayment(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [cartItems.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const agregarProducto = useCallback((producto) => {
    setCartItems(prev => {
      const id = producto.id ?? producto.idProducto
      const existing = prev.find(i => i.id === id)
      if (existing) {
        return prev.map(i => i.id === id ? { ...i, cantidad: i.cantidad + 1 } : i)
      }
      return [...prev, {
        id,
        nombre: producto.nombreProducto,
        precio: producto.precioEfectivo ?? producto.precioVenta,
        stockActual: producto.stockActual ?? 0,
        cantidad: 1,
      }]
    })
  }, [])

  const cambiarCantidad = (id, val) => {
    const n = parseInt(val)
    if (isNaN(n) || n < 1) return
    setCartItems(prev => prev.map(i => i.id === id ? { ...i, cantidad: n } : i))
  }

  const cambiarPrecio = (id, val) => {
    const n = parseInt(val.replace(/\D/g, ''))
    if (isNaN(n)) return
    setCartItems(prev => prev.map(i => i.id === id ? { ...i, precio: n } : i))
  }

  const quitarItem = (id) =>
    setCartItems(prev => prev.filter(i => i.id !== id))

  const nuevaVenta = () => {
    setCartItems([])
    setDescuento(0)
    setReceipt(null)
    setShowPayment(false)
  }

  const subtotal = cartItems.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const total    = Math.max(0, subtotal - descuento)

  const handleConfirmarPago = async (payloadExtra) => {
    setLoadingVenta(true)
    try {
      const dto = {
        ...payloadExtra,
        descuentoGlobal: descuento,
        items: cartItems.map(i => ({
          productoId:    i.id,
          cantidad:      i.cantidad,
          precioUnitario: i.precio,
        })),
      }
      const res = await posService.crearVenta(dto)
      const venta = res.data ?? res
      setReceipt(venta)
      setShowPayment(false)
      showToast('Venta registrada correctamente', 'success')
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'Error al procesar la venta'
      showToast(msg, 'error')
    } finally {
      setLoadingVenta(false)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-screen" style={{ backgroundColor: 'var(--hc-bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.07)', backgroundColor: 'var(--hc-surface)' }}>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold" style={{ color: 'var(--hc-text)' }}>Caja POS</span>
          {turnoActivo ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: 'rgba(52,211,153,0.15)', color: '#34d399' }}>
              Turno abierto
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
              Sin turno
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/pos/caja"
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-70"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>
            Cuadre de caja
          </Link>
          <Link to="/admin/pos/historial"
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-70"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>
            Historial
          </Link>
        </div>
      </div>

      {/* Layout principal */}
      <div className="flex flex-1 overflow-hidden">
        {/* Panel izquierdo — búsqueda de productos */}
        <div ref={searchRef} className="flex-1 p-4 overflow-y-auto border-r"
          style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <p className="text-xs mb-2" style={{ color: 'var(--hc-muted)' }}>
            F2 = buscar · F4 = cobrar · F8 = nueva venta
          </p>
          <POSProductSearch onAdd={agregarProducto} />
        </div>

        {/* Panel derecho — carrito */}
        <div className="w-80 lg:w-96 flex flex-col p-4 gap-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--hc-muted)' }}>
            Carrito ({cartItems.length} ítem{cartItems.length !== 1 ? 's' : ''})
          </h3>

          {/* Ítems */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {cartItems.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <svg className="w-10 h-10 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-8 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
                </svg>
                <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>Buscá un producto para agregar</p>
              </div>
            )}

            {cartItems.map(item => (
              <div key={item.id} className="rounded-xl p-3"
                style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium flex-1 line-clamp-2" style={{ color: 'var(--hc-text)' }}>
                    {item.nombre}
                  </p>
                  <button onClick={() => quitarItem(item.id)}
                    className="text-red-400 hover:text-red-300 flex-shrink-0 text-xs">✕</button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => cambiarCantidad(item.id, item.cantidad - 1)}
                      disabled={item.cantidad <= 1}
                      className="w-6 h-6 rounded-md text-sm font-bold disabled:opacity-30"
                      style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--hc-text)' }}>−</button>
                    <input
                      type="number" min={1} max={item.stockActual}
                      value={item.cantidad}
                      onChange={e => cambiarCantidad(item.id, e.target.value)}
                      className="w-10 text-center text-xs rounded-md py-0.5 outline-none"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--hc-text)', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                    <button onClick={() => cambiarCantidad(item.id, item.cantidad + 1)}
                      disabled={item.cantidad >= item.stockActual}
                      className="w-6 h-6 rounded-md text-sm font-bold disabled:opacity-30"
                      style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--hc-text)' }}>+</button>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>×</span>
                  <input
                    type="text"
                    value={fmt(item.precio)}
                    onChange={e => cambiarPrecio(item.id, e.target.value)}
                    className="flex-1 text-right text-xs rounded-md py-0.5 px-2 outline-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--hc-accent)', border: '1px solid rgba(79,124,255,0.2)' }}
                  />
                </div>
                <p className="text-right text-xs font-semibold mt-1" style={{ color: 'var(--hc-text)' }}>
                  ₡{fmt(item.precio * item.cantidad)}
                </p>
              </div>
            ))}
          </div>

          {/* Totales */}
          <div className="border-t pt-3 space-y-2" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--hc-muted)' }}>Subtotal</span>
              <span style={{ color: 'var(--hc-text)' }}>₡{fmt(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>Descuento (₡)</span>
              <input
                type="number" min={0} value={descuento}
                onChange={e => setDescuento(Math.max(0, parseInt(e.target.value || '0')))}
                className="w-28 text-right text-xs rounded-lg py-1 px-2 outline-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold" style={{ color: 'var(--hc-text)' }}>TOTAL</span>
              <span className="text-2xl font-black" style={{ color: 'var(--hc-accent)' }}>₡{fmt(total)}</span>
            </div>
          </div>

          {/* Botón cobrar */}
          <button
            onClick={() => setShowPayment(true)}
            disabled={cartItems.length === 0}
            className="w-full py-4 rounded-xl font-bold text-base transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90"
            style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
            Cobrar →  (F4)
          </button>

          {cartItems.length > 0 && (
            <button onClick={nuevaVenta}
              className="text-center text-xs transition-opacity hover:opacity-70"
              style={{ color: 'var(--hc-muted)' }}>
              Limpiar carrito
            </button>
          )}
        </div>
      </div>

      {/* Modal pago */}
      {showPayment && (
        <POSPaymentPanel
          total={total}
          onConfirm={handleConfirmarPago}
          onClose={() => setShowPayment(false)}
          loading={loadingVenta}
        />
      )}

      {/* Recibo */}
      {receipt && (
        <POSReceipt venta={receipt} onNuevaVenta={nuevaVenta} />
      )}
    </div>
  )
}
