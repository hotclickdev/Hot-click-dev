import { METODOS_PAGO, letraDe } from './adminData'
import AdminPageHeader from './AdminPageHeader'
import { AdminAvatar, AdminBadge } from './AdminUi'

/**
 * Admin · Métodos de pago (Figma 65:263).
 */
export default function AdminPagosPage() {
  return (
    <main className="mx-auto max-w-md px-5 pb-10 pt-14">
      <AdminPageHeader titulo="Métodos de Pago" atras="/prototipo/admin/config" />
      <ul className="flex flex-col gap-4">
        {METODOS_PAGO.map((m) => (
          <li key={m.id} className="flex min-h-[68px] items-center gap-3 rounded-lg bg-hc-surface-2 px-3.5">
            <AdminAvatar letra={letraDe(m.nombre)} size="sm" />
            <p className="flex-1 text-sm font-medium">{m.nombre}</p>
            <AdminBadge tono={m.habilitado ? 'ok' : 'muted'}>
              {m.habilitado ? 'Habilitado' : 'Deshabilitado'}
            </AdminBadge>
          </li>
        ))}
      </ul>
    </main>
  )
}
