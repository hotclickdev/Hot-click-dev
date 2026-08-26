import { useState } from 'react'
import POSProductSearch from '@/components/pos/POSProductSearch'
import CartItem from './CartItem'
import ClienteSelector from './ClienteSelector'
import { formatMontoPos } from './posHelpers'
import { CartEmptyIcon } from './posIcons'
import { usePosAtajos } from './usePosAtajos'

export default function StepVenta({ cartItems, onAdd, onSetCantidad, onSetPrecio, onRemove, descuento, onSetDescuento, subtotal, total, onNueva, onCobrar, onQrCliente, loadingQr, cliente, onSetCliente }) {
  const [mobileTab, setMobileTab] = useState('productos')
  const numItems = cartItems.reduce((s, i) => s + i.cantidad, 0)
  usePosAtajos({
    activo: true,
    hayItems: cartItems.length > 0,
    onCobrar,
    alBuscar: () => setMobileTab('productos'),
    alCantidad: () => setMobileTab('carrito'),
  })

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tabs — solo móvil */}
      <div className="flex sm:hidden border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: '#0c0c12' }}>
        {[
          { id: 'productos', label: 'Productos' },
          { id: 'carrito', label: `Carrito${numItems > 0 ? ` (${numItems})` : ''}` },
        ].map(t => (
          <button type="button" key={t.id} onClick={() => setMobileTab(t.id)}
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
              F2 buscar · F4 cantidad · F8 cobrar
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
              <button type="button" onClick={onNueva}
                className="text-xs px-2.5 py-1 rounded-lg"
                style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                Limpiar
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 opacity-30">
                <CartEmptyIcon />
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
            <ClienteSelector cliente={cliente} onChange={onSetCliente} />

            <div className="flex items-center gap-3">
              <span className="text-xs shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>Descuento ₡</span>
              <input type="number" min={0} value={descuento || ''} placeholder="0"
                onChange={e => onSetDescuento(Math.max(0, Number.parseInt(e.target.value || '0')))}
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
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>₡{formatMontoPos(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: '#f87171' }}>Descuento</span>
                  <span style={{ color: '#f87171' }}>-₡{formatMontoPos(descuento)}</span>
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
                ₡{formatMontoPos(total)}
              </span>
            </div>

            <button type="button" onClick={onCobrar} disabled={cartItems.length === 0}
              className="w-full py-4 rounded-2xl font-black text-base transition-all disabled:opacity-20 disabled:cursor-not-allowed"
              style={{
                background: cartItems.length > 0 ? 'var(--hc-accent)' : 'rgba(255,255,255,0.06)',
                color: '#fff',
                boxShadow: cartItems.length > 0 ? '0 6px 24px rgba(23,71,168,0.4)' : 'none',
                letterSpacing: '0.05em',
              }}>
              {cartItems.length === 0 ? 'Agregá productos primero' : `COBRAR  ·  ₡${formatMontoPos(total)}  (F8)`}
            </button>

            {cartItems.length > 0 && (
              <button type="button" onClick={onQrCliente} disabled={loadingQr}
                className="w-full py-3 rounded-2xl font-semibold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: 'rgba(122,163,255,0.08)',
                  border: '1px solid rgba(122,163,255,0.25)',
                  color: '#7aa3ff',
                }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                  <path d="M14 14h1v1h-1z M17 14h1v1h-1z M20 14h1v1h-1z M14 17h1v1h-1z M17 17h1v1h-1z M20 17h1v1h-1z M14 20h1v1h-1z M17 20h1v1h-1z M20 20h1v1h-1z"/>
                </svg>
                {loadingQr ? 'Generando QR…' : 'QR pago con tarjeta (cliente)'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
