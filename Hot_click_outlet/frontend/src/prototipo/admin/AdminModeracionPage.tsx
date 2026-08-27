import { PRODUCTOS_MODERACION, formatoPrecio } from './adminData'
import AdminPageHeader from './AdminPageHeader'
import { AdminBadge, AdminPairActions, AdminThumb } from './AdminUi'

/**
 * Admin 04 — Moderación (Figma 42:244).
 */
export default function AdminModeracionPage() {
  return (
    <main className="mx-auto max-w-md px-5 pb-8 pt-14">
      <AdminPageHeader titulo="Moderación" subtitulo="6 productos esperando revisión" />
      <ul className="flex flex-col gap-4">
        {PRODUCTOS_MODERACION.map((p) => (
          <li key={p.id} className="rounded-lg border border-hc-border p-3.5">
            <div className="flex items-start gap-3">
              <AdminThumb />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium">{p.nombre}</p>
                <p className="text-[11px] text-hc-muted">{p.meta}</p>
                <p className="mt-0.5 text-xs">{formatoPrecio(p.precio)}</p>
              </div>
              <AdminBadge tono="warn">Pendiente</AdminBadge>
            </div>
            <AdminPairActions
              okTo={`/prototipo/admin/moderacion/aprobado?producto=${p.id}`}
              okLabel="Aprobar"
              noTo={`/prototipo/admin/moderacion/rechazar?producto=${p.id}`}
              noLabel="Rechazar"
            />
          </li>
        ))}
      </ul>
    </main>
  )
}
