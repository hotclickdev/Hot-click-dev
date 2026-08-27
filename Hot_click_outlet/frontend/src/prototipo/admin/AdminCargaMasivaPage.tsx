import { letraDe } from './adminData'
import AdminPageHeader from './AdminPageHeader'
import { AdminAvatar, AdminPrimaryButton } from './AdminUi'

/**
 * Admin · Carga masiva paso 1 (Figma 72:228).
 */
export default function AdminCargaMasivaPage() {
  return (
    <main className="mx-auto max-w-md px-5 pb-10 pt-14">
      <AdminPageHeader
        titulo="Carga Masiva de Productos"
        subtitulo="Subí un catálogo completo con un archivo CSV"
        atras="/prototipo/admin/dashboard"
      />
      <p className="text-xs font-medium text-hc-muted">¿A qué negocio va dirigido?</p>
      <div className="mt-2 flex min-h-14 items-center gap-3 rounded-lg bg-hc-surface-2 px-3.5">
        <AdminAvatar letra={letraDe('TechZone CR')} size="sm" />
        <span className="flex-1 text-sm font-medium">TechZone CR</span>
        <span className="text-hc-muted" aria-hidden>
          ▾
        </span>
      </div>
      <p className="mt-3 text-[10px] text-hc-muted">
        * Obligatorio: los productos se publican a nombre de esta tienda
      </p>
      <p className="mb-2 mt-5 text-xs font-medium text-hc-muted">Archivo del catálogo</p>
      <div className="flex min-h-[141px] flex-col items-center justify-center rounded-lg border border-dashed border-hc-border bg-hc-surface-2 px-4 text-center">
        <p className="text-sm font-medium">catalogo_techzone.csv</p>
        <p className="mt-2 text-xs text-hc-muted">142 filas detectadas</p>
      </div>
      <p className="mt-4 text-xs text-hc-accent">Descargar plantilla CSV</p>
      <div className="mt-6">
        <AdminPrimaryButton to="/prototipo/admin/carga-masiva/revisar">Continuar</AdminPrimaryButton>
      </div>
    </main>
  )
}
