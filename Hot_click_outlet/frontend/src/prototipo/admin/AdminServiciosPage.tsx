import { SERVICIOS_HOT, letraDe } from './adminData'
import AdminPageHeader from './AdminPageHeader'
import { AdminAvatar, AdminBadge, AdminSecondaryButton } from './AdminUi'

/**
 * Admin · Servicios Hot (Figma 82:269).
 */
export default function AdminServiciosPage() {
  return (
    <main className="mx-auto max-w-md px-5 pb-10 pt-14">
      <AdminPageHeader
        titulo="Servicios Hot"
        subtitulo="Servicios premium que ofrece la plataforma"
        atras="/prototipo/admin/herramientas"
      />
      <ul className="flex flex-col gap-4">
        {SERVICIOS_HOT.map((s) => (
          <li key={s.id} className="flex min-h-[69px] items-center gap-3 rounded-lg bg-hc-surface-2 px-3.5">
            <AdminAvatar letra={letraDe(s.nombre)} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{s.nombre}</p>
              <p className="text-xs text-hc-muted">{s.precio}</p>
            </div>
            <AdminBadge tono={s.activo ? 'ok' : 'muted'}>{s.activo ? 'Activo' : 'Inactivo'}</AdminBadge>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <AdminSecondaryButton to="/prototipo/admin/proximamente">+ Agregar servicio</AdminSecondaryButton>
      </div>
    </main>
  )
}
