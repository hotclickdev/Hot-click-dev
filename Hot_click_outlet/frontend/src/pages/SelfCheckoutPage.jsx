import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import api from '@/services/api'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(n)

function ProductCard({ producto, onAdd }) {
  const [qty, setQty] = useState(0)

  function agregar() {
    setQty(q => q + 1)
    onAdd(producto, qty + 1)
  }
  function quitar() {
    if (qty === 0) return
    setQty(q => q - 1)
    onAdd(producto, qty - 1)
  }

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col"
      style={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)' }}>
      {producto.imagenUrl ? (
        <img src={producto.imagenUrl} alt={producto.nombre}
          className="w-full h-36 object-cover" />
      ) : (
        <div className="w-full h-36 flex items-center justify-center"
          style={{ backgroundColor: '#0f0f1a' }}>
          <svg className="w-10 h-10 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      <div className="p-3 flex-1 flex flex-col gap-2">
        <p className="text-sm font-semibold text-white leading-tight line-clamp-2">{producto.nombre}</p>
        {producto.descripcion && (
          <p className="text-xs text-gray-400 line-clamp-2">{producto.descripcion}</p>
        )}
        <p className="text-base font-bold mt-auto" style={{ color: '#ff4b12' }}>
          ₡{fmt(producto.precio)}
        </p>
        <div className="flex items-center gap-2">
          {qty === 0 ? (
            <button onClick={agregar}
              className="w-full py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#ff4b12', color: '#fff' }}>
              Agregar
            </button>
          ) : (
            <div className="flex items-center gap-2 w-full justify-between">
              <button onClick={quitar}
                className="w-10 h-10 rounded-xl font-bold text-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(255,75,18,0.15)', color: '#ff4b12' }}>
                −
              </button>
              <span className="text-white font-bold">{qty}</span>
              <button onClick={agregar}
                className="w-10 h-10 rounded-xl font-bold text-lg flex items-center justify-center"
                style={{ backgroundColor: '#ff4b12', color: '#fff' }}>
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SelfCheckoutPage() {
  const { token } = useParams()
  const [mesa, setMesa]             = useState(null)
  const [productos, setProductos]   = useState([])
  const [carrito, setCarrito]       = useState({}) // { productoId: { producto, cantidad } }
  const [cargando, setCargando]     = useState(true)
  const [error, setError]           = useState(null)
  const [paso, setPaso]             = useState('catalogo') // catalogo | formulario | exito
  const [form, setForm]             = useState({ clienteNombre: '', clienteTel: '', notas: '' })
  const [enviando, setEnviando]     = useState(false)
  const [pedidoResult, setPedidoResult] = useState(null)

  useEffect(() => {
    Promise.all([
      api.get(`/qr/${token}`),
      api.get(`/qr/${token}/productos`),
    ]).then(([mesaRes, prodRes]) => {
      setMesa(mesaRes.data)
      setProductos(Array.isArray(prodRes.data) ? prodRes.data : [])
    }).catch(() => setError('Código QR inválido o desactivado'))
    .finally(() => setCargando(false))
  }, [token])

  const actualizarCarrito = useCallback((producto, cantidad) => {
    setCarrito(prev => {
      const next = { ...prev }
      if (cantidad <= 0) {
        delete next[producto.id]
      } else {
        next[producto.id] = { producto, cantidad }
      }
      return next
    })
  }, [])

  const totalItems = Object.values(carrito).reduce((s, { cantidad }) => s + cantidad, 0)
  const totalPrecio = Object.values(carrito).reduce((s, { producto, cantidad }) => s + producto.precio * cantidad, 0)

  async function enviarPedido() {
    setEnviando(true)
    try {
      const items = Object.values(carrito).map(({ producto, cantidad }) => ({
        productoId: producto.id,
        cantidad,
      }))
      const { data } = await api.post(`/qr/${token}/pedido`, { ...form, items })
      setPedidoResult(data)
      setPaso('exito')
      setCarrito({})
    } catch {
      setError('Error al enviar el pedido. Intentá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  const primaryColor = mesa?.colorPrimario ?? '#ff4b12'

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0f0f17' }}>
        <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: '#333', borderTopColor: primaryColor }} />
      </div>
    )
  }

  if (error && !mesa) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4" style={{ backgroundColor: '#0f0f17' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <p className="text-lg font-bold text-white">QR inválido</p>
        <p className="text-sm text-gray-400 text-center">{error}</p>
      </div>
    )
  }

  if (paso === 'exito') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-5" style={{ backgroundColor: '#0f0f17' }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(34,197,94,0.15)' }}>
          <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">¡Pedido recibido!</p>
          <p className="text-gray-400 mt-1">{mesa?.mesaNombre}</p>
        </div>
        {pedidoResult && (
          <div className="rounded-2xl p-5 w-full max-w-sm space-y-2" style={{ backgroundColor: '#1a1a2e' }}>
            <p className="text-xs text-gray-400">Número de pedido</p>
            <p className="text-xl font-bold text-white">{pedidoResult.numeroPedido}</p>
            <p className="text-xs text-gray-400 mt-2">Total</p>
            <p className="text-lg font-bold" style={{ color: primaryColor }}>₡{fmt(pedidoResult.total)}</p>
          </div>
        )}
        <p className="text-sm text-gray-400 text-center">El personal te atenderá en breve. Gracias por tu pedido.</p>
        <button onClick={() => { setPaso('catalogo'); setPedidoResult(null) }}
          className="px-6 py-3 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: primaryColor, color: '#fff' }}>
          Hacer otro pedido
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0f0f17' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: '#0f0f17', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {mesa?.logoUrl ? (
          <img src={mesa.logoUrl} alt="" className="w-9 h-9 rounded-xl object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg"
            style={{ backgroundColor: primaryColor, color: '#fff' }}>
            {mesa?.empresaNombre?.[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{mesa?.empresaNombre}</p>
          <p className="text-xs text-gray-400 truncate">{mesa?.mesaNombre}</p>
        </div>
      </div>

      {/* Catálogo */}
      {paso === 'catalogo' && (
        <div className="flex-1 p-4">
          {productos.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p>No hay productos disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {productos.map(p => (
                <ProductCard key={p.id} producto={p} onAdd={actualizarCarrito} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Formulario de checkout */}
      {paso === 'formulario' && (
        <div className="flex-1 p-4 space-y-4">
          <button onClick={() => setPaso('catalogo')}
            className="flex items-center gap-2 text-sm text-gray-400">
            ← Volver al menú
          </button>
          <h2 className="text-lg font-bold text-white">Tu pedido</h2>

          <div className="rounded-2xl divide-y" style={{ backgroundColor: '#1a1a2e', divideColor: 'rgba(255,255,255,0.05)' }}>
            {Object.values(carrito).map(({ producto, cantidad }) => (
              <div key={producto.id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{producto.nombre}</p>
                  <p className="text-xs text-gray-400">x{cantidad} · ₡{fmt(producto.precio)}</p>
                </div>
                <p className="text-sm font-semibold text-white">₡{fmt(producto.precio * cantidad)}</p>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-bold text-white">Total</span>
              <span className="text-base font-bold" style={{ color: primaryColor }}>₡{fmt(totalPrecio)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <input placeholder="Tu nombre (opcional)"
              value={form.clienteNombre}
              onChange={e => setForm(p => ({ ...p, clienteNombre: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
              style={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)' }} />
            <input placeholder="Teléfono (opcional)"
              value={form.clienteTel}
              onChange={e => setForm(p => ({ ...p, clienteTel: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
              style={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)' }} />
            <textarea placeholder="Notas (alergias, preferencias...)"
              rows={2}
              value={form.notas}
              onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none resize-none"
              style={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button onClick={enviarPedido} disabled={enviando}
            className="w-full py-4 rounded-2xl font-bold text-base transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: primaryColor, color: '#fff' }}>
            {enviando ? 'Enviando pedido…' : `Realizar pedido · ₡${fmt(totalPrecio)}`}
          </button>
        </div>
      )}

      {/* FAB del carrito */}
      {paso === 'catalogo' && totalItems > 0 && (
        <div className="sticky bottom-0 p-4" style={{ backgroundColor: '#0f0f17' }}>
          <button onClick={() => setPaso('formulario')}
            className="w-full py-4 rounded-2xl font-bold flex items-center justify-between px-5 transition-opacity hover:opacity-90"
            style={{ backgroundColor: primaryColor, color: '#fff' }}>
            <span className="text-sm font-bold bg-white/20 rounded-lg px-2 py-0.5">{totalItems}</span>
            <span>Ver pedido</span>
            <span className="text-sm">₡{fmt(totalPrecio)}</span>
          </button>
        </div>
      )}
    </div>
  )
}
