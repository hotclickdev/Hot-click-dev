import { Link, useParams } from 'react-router-dom'
import { formatoEntero, formatoPrecio, letraDe, tiendaPorId, tonoEstadoTienda } from './adminData'
import AdminPageHeader from './AdminPageHeader'
import { AdminAvatar, AdminBadge, AdminDangerButton, AdminSecondaryButton, AdminStatCard } from './AdminUi'

/**
 * Admin 06 — Detalle de tienda (Figma 45:228).
 */
export default function AdminTiendaDetallePage() {
  const { id = '' } = useParams()
  const tienda = tiendaPorId(id)
  if (!tienda) return <AdminNoEncontrado que="tienda" />

  return (
    <main className="mx-auto max-w-md px-5 pb-10 pt-14">
      <AdminPageHeader titulo="Detalle de Tienda" atras="/prototipo/admin/tiendas" />
      <div className="flex items-center gap-3">
        <AdminAvatar letra={letraDe(tienda.nombre)} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{tienda.nombre}</p>
          <p className="truncate text-[11px] text-hc-muted">
            {tienda.handle} · {tienda.email}
          </p>
        </div>
        <AdminBadge tono={tonoEstadoTienda(tienda.estado)}>{tienda.estado}</AdminBadge>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        <AdminStatCard label="Productos" valor={formatoEntero(tienda.productos)} />
        <AdminStatCard label="Ventas" valor={formatoEntero(tienda.ventas)} />
        <AdminStatCard label="Ingresos" valor={formatoPrecio(tienda.ingresos)} />
      </div>
      <hr className="my-5 border-hc-border" />
      <p className="text-xs text-hc-muted">
        Registrada el {tienda.registrada} · {tienda.plan}
      </p>
      <div className="mt-5 flex flex-col gap-3">
        <AdminSecondaryButton to={`/prototipo/admin/tiendas/${tienda.id}/preview`}>
          Ver tienda pública
        </AdminSecondaryButton>
        <AdminDangerButton to={`/prototipo/admin/tiendas/${tienda.id}/suspender`}>
          Suspender tienda
        </AdminDangerButton>
      </div>
    </main>
  )
}

export function AdminNoEncontrado({ que }: { que: string }) {
  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <p className="text-sm text-hc-muted">No encontramos esa {que} en el prototipo.</p>
      <Link to="/prototipo/admin/dashboard" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-hc-primary">
        Volver al panel
      </Link>
    </main>
  )
}
