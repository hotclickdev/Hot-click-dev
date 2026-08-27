import { REGLAS_MODERACION } from './adminData'
import AdminPageHeader from './AdminPageHeader'
import { AdminBadge } from './AdminUi'

/**
 * Admin · Política de moderación (Figma 65:243).
 */
export default function AdminPoliticaPage() {
  return (
    <main className="mx-auto max-w-md px-5 pb-10 pt-14">
      <AdminPageHeader titulo="Política de Moderación" atras="/prototipo/admin/config" />
      <ul className="flex flex-col gap-4">
        {REGLAS_MODERACION.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3">
            <p className="text-sm">{r.texto}</p>
            <AdminBadge tono={r.activa ? 'ok' : 'muted'}>{r.activa ? 'Activa' : 'Inactiva'}</AdminBadge>
          </li>
        ))}
      </ul>
    </main>
  )
}
