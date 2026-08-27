import { ERRORES_CARGA } from './adminData'
import AdminPageHeader from './AdminPageHeader'
import { AdminPrimaryButton, AdminStatCard } from './AdminUi'

/**
 * Admin · Carga masiva paso 2 (Figma 72:252).
 */
export default function AdminCargaMasivaRevisarPage() {
  return (
    <main className="mx-auto max-w-md px-5 pb-10 pt-14">
      <AdminPageHeader
        titulo="Revisar antes de subir"
        subtitulo="Destino: TechZone CR"
        atras="/prototipo/admin/carga-masiva"
      />
      <div className="grid grid-cols-2 gap-3">
        <AdminStatCard label="Listos para subir" valor="138" />
        <AdminStatCard label="Con errores" valor="4" destacado />
      </div>
      <h2 className="mb-3 mt-6 text-sm font-semibold">Filas con errores</h2>
      <ul>
        {ERRORES_CARGA.map((e) => (
          <li key={e.fila} className="flex min-h-11 items-center justify-between border-t border-hc-border text-sm">
            <span>{e.fila}</span>
            <span className="text-xs text-hc-muted">{e.motivo}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <AdminPrimaryButton to="/prototipo/admin/carga-masiva/completada">
          Importar 138 productos
        </AdminPrimaryButton>
      </div>
    </main>
  )
}
