import { AUDITORIAS } from './adminData'
import AdminPageHeader from './AdminPageHeader'

/**
 * Admin · Auditorías (Figma 82:228).
 */
export default function AdminAuditoriasPage() {
  return (
    <main className="mx-auto max-w-md px-5 pb-10 pt-14">
      <AdminPageHeader
        titulo="Auditorías y Actividad"
        subtitulo="Registro de acciones por negocio"
        atras="/prototipo/admin/herramientas"
      />
      <ol className="flex flex-col gap-5">
        {AUDITORIAS.map((a) => (
          <li key={a.id} className="flex gap-3">
            <span className="mt-2 size-2 shrink-0 rounded-full bg-hc-primary" aria-hidden />
            <div>
              <p className="text-xs font-medium">{a.actor}</p>
              <p className="mt-0.5 text-sm text-hc-muted">{a.detalle}</p>
              <p className="mt-1 text-[10px] text-hc-muted">{a.cuando}</p>
            </div>
          </li>
        ))}
      </ol>
    </main>
  )
}
