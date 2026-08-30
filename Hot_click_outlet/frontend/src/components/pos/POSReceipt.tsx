import { useRef } from 'react'
import useAuthStore from '@/store/authStore'

const fmt = (n: number | null | undefined) => new Intl.NumberFormat('es-CR').format(n ?? 0)

type ReciboVenta = {
  numeroPedido?: string
  fechaPedido?: string
  metodoPago?: string
  totalPedido?: number
  descuentoTotal?: number
  items?: {
    producto?: { nombreProducto?: string }
    cantidad?: number
    subtotalItem?: number
  }[]
  usuarioFinal?: { id?: number; nombre?: string }
}

export default function POSReceipt({ venta, onNuevaVenta }: {
  venta: ReciboVenta | null | undefined
  onNuevaVenta: () => void
}) {
  const userName    = useAuthStore(s => s.userName)
  const printRef    = useRef<HTMLDivElement>(null)

  const handlePrint = () => globalThis.print()

  const handleWhatsApp = () => {
    if (!venta) return
    const items = (venta.items ?? [])
      .map(i => `• ${i.producto?.nombreProducto ?? 'Producto'} ×${i.cantidad} = ₡${fmt(i.subtotalItem)}`)
      .join('\n')
    const msg = encodeURIComponent(
      `*Recibo HotClick*\n` +
      `Ticket: ${venta.numeroPedido}\n` +
      `Cajero: ${userName}\n\n` +
      `${items}\n\n` +
      `*Total: ₡${fmt(venta.totalPedido)}*\n` +
      `Método: ${venta.metodoPago}\n` +
      `¡Gracias por su compra!`
    )
    globalThis.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  if (!venta) return null

  const fecha = venta.fechaPedido
    ? new Date(venta.fechaPedido).toLocaleString('es-CR')
    : new Date().toLocaleString('es-CR')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div className="w-full max-w-sm flex flex-col gap-4">
        {/* Recibo imprimible */}
        <div ref={printRef} className="rounded-2xl p-5"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
          id="pos-receipt">
          {/* Cabecera */}
          <div className="text-center mb-4">
            <p className="text-xl font-black" style={{ color: 'var(--hc-accent)' }}>HotClick</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>Caja registradora</p>
          </div>

          <div className="space-y-1 text-xs mb-3" style={{ color: 'var(--hc-muted)' }}>
            <p><span className="font-medium">Ticket:</span> {venta.numeroPedido}</p>
            <p><span className="font-medium">Fecha:</span> {fecha}</p>
            <p><span className="font-medium">Cajero:</span> {userName}</p>
            {venta.usuarioFinal?.nombre && venta.usuarioFinal.id !== 999 && (
              <p><span className="font-medium">Cliente:</span> {venta.usuarioFinal.nombre}</p>
            )}
          </div>

          <div className="border-t border-b py-3 my-3" style={{ borderColor: 'var(--hc-border)' }}>
            {(venta.items ?? []).map((item, i) => (
              <div key={i} className="flex justify-between text-xs py-1">
                <span style={{ color: 'var(--hc-text)' }}>
                  {item.producto?.nombreProducto ?? 'Producto'} ×{item.cantidad}
                </span>
                <span style={{ color: 'var(--hc-text)' }}>₡{fmt(item.subtotalItem)}</span>
              </div>
            ))}
          </div>

          {(venta.descuentoTotal ?? 0) > 0 && (
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: 'var(--hc-muted)' }}>Descuento</span>
              <span style={{ color: '#f87171' }}>-₡{fmt(venta.descuentoTotal)}</span>
            </div>
          )}

          <div className="flex justify-between items-center mt-2">
            <span className="text-sm font-bold" style={{ color: 'var(--hc-text)' }}>TOTAL</span>
            <span className="text-xl font-black" style={{ color: 'var(--hc-accent)' }}>₡{fmt(venta.totalPedido)}</span>
          </div>

          <p className="text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>
            Método: {venta.metodoPago}
          </p>

          <p className="text-center text-xs mt-4" style={{ color: 'var(--hc-muted)' }}>
            ¡Gracias por su compra!
          </p>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2">
          <button type="button" onClick={handlePrint}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-text)' }}>
            Imprimir
          </button>
          <button type="button" onClick={handleWhatsApp}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'rgba(37,211,102,0.15)', color: '#25d366' }}>
            WhatsApp
          </button>
          <button type="button" onClick={onNuevaVenta}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
            Nueva venta
          </button>
        </div>
      </div>

      {/* CSS print */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #pos-receipt {
            display: block !important;
            width: 80mm;
            font-size: 11px;
            box-shadow: none;
            border: none;
            background: #fff !important;
            color: #000 !important;
          }
        }
      `}</style>
    </div>
  )
}
