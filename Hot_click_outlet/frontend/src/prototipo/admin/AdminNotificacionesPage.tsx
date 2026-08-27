import { NOTIFICACIONES } from './adminData'
import AdminPageHeader from './AdminPageHeader'

/**
 * Admin · Notificaciones del sistema (Figma 65:295).
 */
export default function AdminNotificacionesPage() {
  return (
    <main className="mx-auto max-w-md px-5 pb-10 pt-14">
      <AdminPageHeader titulo="Notificaciones" atras="/prototipo/admin/config" />
      <ul className="flex flex-col gap-4">
        {NOTIFICACIONES.map((n) => (
          <li key={n.id} className="flex gap-3 rounded-lg bg-hc-surface-2 p-3">
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                n.tono === 'muted' ? 'bg-[var(--hc-info-bg)] text-hc-accent' : 'bg-[var(--hc-danger-bg)] text-hc-danger'
              }`}
              aria-hidden
            >
              {n.tono === 'muted' ? 'i' : '!'}
            </span>
            <div>
              <p className="text-sm font-medium">{n.titulo}</p>
              <p className="mt-1 text-xs text-hc-muted">{n.cuerpo}</p>
              <p className="mt-2 text-[10px] text-hc-muted">{n.cuando}</p>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
