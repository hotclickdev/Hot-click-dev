import { useState } from 'react'
import { fmt } from './selfCheckoutFormat'
import type { ProductoSelfCheckout } from './selfCheckoutTypes'

/**
 * Tarjeta de producto del catálogo self-checkout.
 */
export default function SelfCheckoutProductCard({
  producto, onAdd,
}: {
  producto: ProductoSelfCheckout
  onAdd: (producto: ProductoSelfCheckout, qty: number) => void
}) {
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
      style={{ backgroundColor: '#1E242E', border: '1px solid rgba(255,255,255,0.08)' }}>
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
        <p className="text-base font-bold mt-auto" style={{ color: 'var(--hc-primary)' }}>
          ₡{fmt(producto.precio)}
        </p>
        <div className="flex items-center gap-2">
          {qty === 0 ? (
            <button type="button" onClick={agregar}
              className="w-full py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}>
              Agregar
            </button>
          ) : (
            <div className="flex items-center gap-2 w-full justify-between">
              <button type="button" onClick={quitar}
                className="w-10 h-10 rounded-xl font-bold text-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(231,59,51,0.15)', color: 'var(--hc-primary)' }}>
                −
              </button>
              <span className="text-white font-bold">{qty}</span>
              <button type="button" onClick={agregar}
                className="w-10 h-10 rounded-xl font-bold text-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}>
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
