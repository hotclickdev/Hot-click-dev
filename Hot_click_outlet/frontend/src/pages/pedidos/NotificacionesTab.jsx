import { ESTADO_LABELS } from './pedidoHelpers'

export default function NotificacionesTab({ notificaciones }) {
  const list = Array.isArray(notificaciones) ? notificaciones : []
  if (list.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>No hay notificaciones todavía</p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {[...list].reverse().map((notif, index) => (
        <div key={index} className="rounded-xl px-4 py-3 space-y-1"
          style={{ backgroundColor: 'rgba(23,71,168,0.06)', border: '1px solid rgba(23,71,168,0.15)' }}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'rgba(23,71,168,0.12)', color: 'var(--hc-accent)' }}>
              {ESTADO_LABELS[notif.estado] ?? notif.estado}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>
              {notif.fecha ? new Date(notif.fecha).toLocaleString('es-CR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </div>
          <p className="text-sm" style={{ color: 'var(--hc-text)' }}>{notif.nota}</p>
        </div>
      ))}
    </div>
  )
}
