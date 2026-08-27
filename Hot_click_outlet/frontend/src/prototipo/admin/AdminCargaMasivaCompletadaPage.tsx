import AdminConfirmLayout from './AdminConfirmLayout'
import { AdminPrimaryButton } from './AdminUi'

/**
 * Admin · Carga masiva completada (Figma 72:280).
 */
export default function AdminCargaMasivaCompletadaPage() {
  return (
    <AdminConfirmLayout
      marca="ok"
      titulo="Importación completada"
      cuerpo="Se publicaron 138 productos en TechZone CR. 4 filas con errores no se importaron."
    >
      <AdminPrimaryButton to="/prototipo/admin/tiendas/techzone">Ver detalle de la tienda</AdminPrimaryButton>
    </AdminConfirmLayout>
  )
}
