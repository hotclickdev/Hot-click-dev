import { REGLAS_MODERACION } from '@/prototipo/admin/adminData'
import AdminPageHeader from '@/prototipo/admin/AdminPageHeader'
import { AdminBadge } from '@/prototipo/admin/AdminUi'

/**
 * Política de moderación (Figma 65:243) — reglas de plataforma, solo lectura.
 */
export default function SuperAdminPolitica() {
  return (
    <div className="mx-auto max-w-md pb-10 md:max-w-xl">
      <AdminPageHeader titulo="Política de Moderación" atras="/admin/configuracion" />
      <ul className="flex flex-col gap-4">
        {REGLAS_MODERACION.map((regla) => (
          <li key={regla.id} className="flex items-center justify-between gap-3">
            <p className="text-sm">{regla.texto}</p>
            <AdminBadge tono={regla.activa ? 'ok' : 'muted'}>
              {regla.activa ? 'Activa' : 'Inactiva'}
            </AdminBadge>
          </li>
        ))}
      </ul>
    </div>
  )
}
