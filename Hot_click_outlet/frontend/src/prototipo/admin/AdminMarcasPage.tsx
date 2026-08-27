import { MARCAS, formatoEntero, letraDe } from './adminData'
import AdminPageHeader from './AdminPageHeader'
import { AdminAvatar, AdminBadge, AdminSecondaryButton } from './AdminUi'

/**
 * Admin · Marcas (Figma 81:228).
 */
export default function AdminMarcasPage() {
  return (
    <main className="mx-auto max-w-md px-5 pb-10 pt-14">
      <AdminPageHeader
        titulo="Marcas"
        subtitulo="Marcas registradas en el catálogo"
        atras="/prototipo/admin/herramientas"
      />
      <ul className="flex flex-col gap-4">
        {MARCAS.map((m) => (
          <li key={m.id} className="flex min-h-16 items-center gap-3 rounded-lg bg-hc-surface-2 px-3">
            <AdminAvatar letra={letraDe(m.nombre)} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{m.nombre}</p>
              <p className="text-xs text-hc-muted">{formatoEntero(m.productos)} productos</p>
            </div>
            {m.verificada ? <AdminBadge tono="ok">Verificada</AdminBadge> : null}
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <AdminSecondaryButton to="/prototipo/admin/proximamente">+ Agregar marca</AdminSecondaryButton>
      </div>
    </main>
  )
}
