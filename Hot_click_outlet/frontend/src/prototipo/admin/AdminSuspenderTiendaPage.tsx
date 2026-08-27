import { useParams } from 'react-router-dom'
import { tiendaPorId } from './adminData'
import AdminConfirmLayout from './AdminConfirmLayout'
import { AdminNoEncontrado } from './AdminTiendaDetallePage'
import { AdminDangerButton, AdminSecondaryButton } from './AdminUi'

/**
 * Admin 13 — Suspender tienda (Figma 54:228).
 */
export default function AdminSuspenderTiendaPage() {
  const { id = '' } = useParams()
  const tienda = tiendaPorId(id)
  if (!tienda) return <AdminNoEncontrado que="tienda" />

  return (
    <AdminConfirmLayout
      marca="alerta"
      titulo="¿Suspender esta tienda?"
      cuerpo={`${tienda.nombre} dejará de estar visible en el marketplace hasta que la reactives.`}
    >
      <AdminDangerButton to="/prototipo/admin/tiendas">Sí, suspender</AdminDangerButton>
      <AdminSecondaryButton to={`/prototipo/admin/tiendas/${tienda.id}`}>Cancelar</AdminSecondaryButton>
    </AdminConfirmLayout>
  )
}
