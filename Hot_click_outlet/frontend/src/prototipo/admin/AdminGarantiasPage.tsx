import { GARANTIAS } from './adminData'
import AdminPageHeader from './AdminPageHeader'
import { AdminSecondaryButton } from './AdminUi'

/**
 * Admin · Garantías (Figma 81:264).
 */
export default function AdminGarantiasPage() {
  return (
    <main className="mx-auto max-w-md px-5 pb-10 pt-14">
      <AdminPageHeader
        titulo="Garantías"
        subtitulo="Políticas de devolución por categoría"
        atras="/prototipo/admin/herramientas"
      />
      <ul className="flex flex-col gap-4">
        {GARANTIAS.map((g) => (
          <li key={g.id} className="flex min-h-12 items-center justify-between rounded-lg bg-hc-surface-2 px-3.5">
            <span className="text-sm font-medium">{g.nombre}</span>
            <span className="text-sm">{g.plazo}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <AdminSecondaryButton to="/prototipo/admin/proximamente">+ Agregar garantía</AdminSecondaryButton>
      </div>
    </main>
  )
}
