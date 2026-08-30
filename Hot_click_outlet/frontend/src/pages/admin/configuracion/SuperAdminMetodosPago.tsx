import { Link } from 'react-router-dom'
import { METODOS } from '@/pages/admin/pos/posHelpers'
import AdminPageHeader from '@/prototipo/admin/AdminPageHeader'
import { AdminAvatar, AdminBadge } from '@/prototipo/admin/AdminUi'
import { letraDe } from '@/prototipo/admin/adminData'

/**
 * Métodos de pago aceptados (Figma 65:263) — los que usa la caja real.
 */
export default function SuperAdminMetodosPago() {
  return (
    <div className="mx-auto max-w-md pb-10 md:max-w-xl">
      <AdminPageHeader titulo="Métodos de Pago" atras="/admin/configuracion" />
      <ul className="flex flex-col gap-4">
        {METODOS.map((metodo) => (
          <li
            key={metodo.id}
            className="flex min-h-[68px] items-center gap-3 rounded-xl border border-hc-border px-3.5"
          >
            <AdminAvatar letra={letraDe(metodo.label)} size="sm" />
            <p className="flex-1 text-sm font-medium">{metodo.label}</p>
            <AdminBadge tono="ok">Habilitado</AdminBadge>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs text-hc-muted">
        Efectivo, SINPE y tarjeta se cobran en la caja. Los comprobantes y webhooks viven en{' '}
        <Link to="/admin/pagos" className="font-medium text-hc-primary">
          Pagos
        </Link>
        .
      </p>
    </div>
  )
}
