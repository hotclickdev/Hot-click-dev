import { useSearchParams } from 'react-router-dom'
import { productoPorId } from './adminData'
import AdminConfirmLayout from './AdminConfirmLayout'
import { AdminPrimaryButton } from './AdminUi'

/**
 * Admin 08 — Producto aprobado (Figma 48:228).
 */
export default function AdminProductoAprobadoPage() {
  const [params] = useSearchParams()
  const producto = productoPorId(params.get('producto') ?? '')
  const nombre = producto?.nombre ?? 'El producto'
  return (
    <AdminConfirmLayout
      marca="ok"
      titulo="Producto aprobado"
      cuerpo={`${nombre} ya está visible en la tienda del vendedor y en el marketplace.`}
    >
      <AdminPrimaryButton to="/prototipo/admin/moderacion">Volver a moderación</AdminPrimaryButton>
    </AdminConfirmLayout>
  )
}
