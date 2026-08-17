import { Link } from 'react-router-dom'

export default function POSHeader({ userName, turno, step, onCerrarTurno, mostrarVolverSistema }) {
  const labels = { apertura: 'Paso 1 — Abrir turno', venta: 'Paso 2 — Pedido', cobro: 'Paso 3 — Cobrar', qr: 'Esperando pago', recibo: 'Venta lista' }
  return (
    <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 shrink-0 border-b border-white/5"
      style={{ backgroundColor: '#0c0c12' }}>
      <div className="flex items-center gap-2 mr-1">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
          style={{ background: 'var(--hc-accent)', color: '#fff' }}>HC</div>
        <span className="text-sm font-bold tracking-wider hidden sm:block" style={{ color: '#fff' }}>POS</span>
      </div>

      {mostrarVolverSistema && (
        <Link to="/admin"
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:brightness-125"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
          ← Sistema
        </Link>
      )}

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

      {turno && (
        <button onClick={onCerrarTurno}
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:brightness-125"
          style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
          Cerrar turno
        </button>
      )}

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
