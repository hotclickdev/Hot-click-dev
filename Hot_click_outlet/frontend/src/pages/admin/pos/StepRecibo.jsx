import { formatMontoPos } from './posHelpers'
import { CheckIcon, PrintIcon, WhatsAppIcon } from './posIcons'

export default function StepRecibo({ venta, userName, onNueva }) {
  const fecha = venta?.fechaPedido
    ? new Date(venta.fechaPedido).toLocaleString('es-CR')
    : new Date().toLocaleString('es-CR')

  function imprimir() {
    const s = document.createElement('style')
    s.id = '__pos-print'
    s.textContent = `@media print { body > * { display:none!important } #pos-ticket { display:block!important; width:80mm; background:#fff!important; color:#000!important } }`
    document.head.appendChild(s)
    globalThis.print()
    setTimeout(() => document.getElementById('__pos-print')?.remove(), 800)
  }

  function whatsapp() {
    const items = (venta?.items ?? [])
      .map(i => `• ${i.producto?.nombreProducto ?? i.nombre ?? 'Producto'} ×${i.cantidad} = ₡${formatMontoPos(i.subtotalItem)}`)
      .join('\n')
    globalThis.open(`https://wa.me/?text=${encodeURIComponent(`*Recibo HotClick*\nTicket: ${venta?.numeroPedido ?? '—'}\n\n${items}\n\n*Total: ₡${formatMontoPos(venta?.totalPedido)}*\n¡Gracias!`)}`, '_blank')
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-sm space-y-4">
        <div id="pos-ticket" className="rounded-3xl p-6 shadow-2xl"
          style={{ backgroundColor: '#0c0c10', border: '1px solid rgba(255,255,255,0.1)' }}>

          <div className="text-center mb-5">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center"
              style={{ backgroundColor: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}>
              <CheckIcon />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#34d399' }}>Venta registrada</p>
            <p className="text-3xl font-black mt-1 tabular-nums" style={{ color: '#fff', letterSpacing: '-1px' }}>
              ₡{formatMontoPos(venta?.totalPedido)}
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
                <span className="font-semibold tabular-nums" style={{ color: '#fff' }}>₡{formatMontoPos(item.subtotalItem)}</span>
              </div>
            ))}
          </div>

          <p className="text-center text-xs mt-4" style={{ color: 'rgba(255,255,255,0.2)' }}>
            ¡Gracias por su compra! · HotClick CR
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={imprimir}
            className="py-3 rounded-2xl text-xs font-semibold transition-all hover:brightness-125 flex items-center justify-center gap-1.5"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>
            <PrintIcon /> Imprimir
          </button>
          <button type="button" onClick={whatsapp}
            className="py-3 rounded-2xl text-xs font-semibold transition-all hover:brightness-125 flex items-center justify-center gap-1.5"
            style={{ backgroundColor: 'rgba(37,211,102,0.12)', color: '#25d366' }}>
            <WhatsAppIcon /> WhatsApp
          </button>
          <button type="button" onClick={onNueva}
            className="py-3 rounded-2xl text-xs font-semibold transition-all hover:brightness-125"
            style={{ background: 'var(--hc-accent)', color: '#fff' }}>
            + Nueva
          </button>
        </div>
      </div>
    </div>
  )
}
