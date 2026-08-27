import { CATEGORIAS, formatoEntero } from './adminData'
import AdminPageHeader from './AdminPageHeader'
import { AdminPrimaryButton } from './AdminUi'

/**
 * Admin · Categorías (Figma 65:228).
 */
export default function AdminCategoriasPage() {
  return (
    <main className="mx-auto max-w-md px-5 pb-10 pt-14">
      <AdminPageHeader titulo="Categorías" atras="/prototipo/admin/config" />
      <ul className="flex flex-col gap-4">
        {CATEGORIAS.map((c) => (
          <li key={c.id} className="flex min-h-12 items-center justify-between rounded-lg bg-hc-surface-2 px-3.5">
            <span className="text-sm font-medium">{c.nombre}</span>
            <span className="text-xs text-hc-muted">{formatoEntero(c.productos)} productos</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <AdminPrimaryButton to="/prototipo/admin/config/categorias/nueva">
          + Agregar categoría
        </AdminPrimaryButton>
      </div>
    </main>
  )
}
