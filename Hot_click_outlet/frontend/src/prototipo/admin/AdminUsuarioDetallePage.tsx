import { useParams } from 'react-router-dom'
import { letraDe, tonoRol, usuarioPorId } from './adminData'
import { AdminNoEncontrado } from './AdminTiendaDetallePage'
import AdminPageHeader from './AdminPageHeader'
import { AdminAvatar, AdminBadge, AdminDangerButton, AdminStatCard } from './AdminUi'

/**
 * Admin 07 — Detalle de usuario (Figma 45:254).
 */
export default function AdminUsuarioDetallePage() {
  const { id = '' } = useParams()
  const usuario = usuarioPorId(id)
  if (!usuario) return <AdminNoEncontrado que="cuenta" />

  return (
    <main className="mx-auto max-w-md px-5 pb-10 pt-14">
      <AdminPageHeader titulo="Detalle de Usuario" atras="/prototipo/admin/usuarios" />
      <div className="flex items-center gap-3">
        <AdminAvatar letra={letraDe(usuario.nombre)} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{usuario.nombre}</p>
          <p className="truncate text-[11px] text-hc-muted">{usuario.email}</p>
        </div>
        <AdminBadge tono={tonoRol(usuario.rol)}>{usuario.rol}</AdminBadge>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <AdminStatCard label="Tienda" valor={usuario.tienda} />
        <AdminStatCard label="Miembro desde" valor={usuario.miembro} />
      </div>
      <hr className="my-5 border-hc-border" />
      <AdminDangerButton to={`/prototipo/admin/usuarios/${usuario.id}/suspender`}>
        Suspender cuenta
      </AdminDangerButton>
    </main>
  )
}
