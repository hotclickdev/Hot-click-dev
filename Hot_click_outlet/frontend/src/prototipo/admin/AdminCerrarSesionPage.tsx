import AdminConfirmLayout from './AdminConfirmLayout'
import { AdminDangerButton, AdminSecondaryButton } from './AdminUi'

/**
 * Admin 11 — Cerrar sesión (Figma 48:266).
 */
export default function AdminCerrarSesionPage() {
  return (
    <AdminConfirmLayout
      marca="alerta"
      titulo="¿Cerrar sesión?"
      cuerpo="Vas a salir del panel de administración de HotClick."
    >
      <AdminDangerButton to="/prototipo/admin">Sí, cerrar sesión</AdminDangerButton>
      <AdminSecondaryButton to="/prototipo/admin/config">Cancelar</AdminSecondaryButton>
    </AdminConfirmLayout>
  )
}
