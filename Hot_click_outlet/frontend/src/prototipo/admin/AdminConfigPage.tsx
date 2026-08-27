import { CONFIG_LINKS, KPI_ADMIN } from './adminData'
import AdminPageHeader from './AdminPageHeader'
import { AdminMenuRow } from './AdminUi'

/**
 * Admin 05 — Configuración (Figma 43:128).
 */
export default function AdminConfigPage() {
  return (
    <main className="mx-auto max-w-md px-5 pb-8 pt-14">
      <AdminPageHeader titulo="Configuración" subtitulo="Ajustes generales de la plataforma" />
      <div className="flex min-h-14 items-center justify-between">
        <p className="text-sm font-medium">Comisión de la plataforma</p>
        <p className="text-sm font-semibold">{KPI_ADMIN.comisionPlataforma}</p>
      </div>
      <ul>
        {CONFIG_LINKS.map((item) => (
          <li key={item.to} className="border-t border-hc-border">
            <AdminMenuRow to={item.to} label={item.label} />
          </li>
        ))}
      </ul>
    </main>
  )
}
