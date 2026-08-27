import { HERRAMIENTAS } from './adminData'
import AdminPageHeader from './AdminPageHeader'
import { AdminMenuRow } from './AdminUi'

/**
 * Admin · Más herramientas (Figma 80:228).
 */
export default function AdminHerramientasPage() {
  return (
    <main className="mx-auto max-w-md px-5 pb-10 pt-14">
      <AdminPageHeader
        titulo="Más Herramientas"
        subtitulo="Gestión avanzada de la plataforma"
        atras="/prototipo/admin/dashboard"
      />
      <ul>
        {HERRAMIENTAS.map((item) => (
          <li key={item.to} className="border-t border-hc-border first:border-t-0">
            <AdminMenuRow to={item.to} label={item.label} />
          </li>
        ))}
      </ul>
    </main>
  )
}
