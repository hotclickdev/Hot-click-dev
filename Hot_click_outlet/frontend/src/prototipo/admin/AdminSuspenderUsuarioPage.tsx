import { useParams } from 'react-router-dom'
import { usuarioPorId } from './adminData'
import AdminConfirmLayout from './AdminConfirmLayout'
import { AdminNoEncontrado } from './AdminTiendaDetallePage'
import { AdminDangerButton, AdminSecondaryButton } from './AdminUi'

/**
 * Admin 14 — Suspender usuario (Figma 54:238).
 */
export default function AdminSuspenderUsuarioPage() {
  const { id = '' } = useParams()
  const usuario = usuarioPorId(id)
  if (!usuario) return <AdminNoEncontrado que="cuenta" />

  return (
    <AdminConfirmLayout
      marca="alerta"
      titulo="¿Suspender esta cuenta?"
      cuerpo={`${usuario.nombre} no podrá acceder a HotClick hasta que reactives su cuenta.`}
    >
      <AdminDangerButton to="/prototipo/admin/usuarios">Sí, suspender</AdminDangerButton>
      <AdminSecondaryButton to={`/prototipo/admin/usuarios/${usuario.id}`}>Cancelar</AdminSecondaryButton>
    </AdminConfirmLayout>
  )
}
