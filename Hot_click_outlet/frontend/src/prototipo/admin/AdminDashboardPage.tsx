import { Link } from 'react-router-dom'
import { HotClickMark } from '@/components/ui/BrandLogo'
import {
  KPI_ADMIN,
  TIENDAS,
  formatoEntero,
  formatoPrecio,
  letraDe,
  tonoEstadoTienda,
} from './adminData'
import { AdminDarkButton, AdminEntityRow, AdminSecondaryButton, AdminStatCard } from './AdminUi'

const RECIENTES = TIENDAS.slice(0, 3)

/**
 * Admin 01 — Dashboard (Figma 41:129).
 */
export default function AdminDashboardPage() {
  return (
    <main className="mx-auto max-w-md px-5 pb-8 pt-14">
      <CabeceraDashboard />
      <KpisDashboard />
      <div className="mt-4 flex flex-col gap-3">
        <AdminDarkButton to="/prototipo/admin/carga-masiva">Carga masiva de productos</AdminDarkButton>
        <AdminSecondaryButton to="/prototipo/admin/herramientas">Más herramientas</AdminSecondaryButton>
      </div>
      <div className="mb-3 mt-6 flex items-baseline justify-between">
        <h2 className="text-[15px] font-bold">Tiendas recientes</h2>
        <Link to="/prototipo/admin/tiendas" className="text-xs font-medium text-hc-primary">
          Ver todas ›
        </Link>
      </div>
      <ul className="flex flex-col gap-5">
        {RECIENTES.map((tienda) => (
          <li key={tienda.id}>
            <AdminEntityRow
              to={`/prototipo/admin/tiendas/${tienda.id}`}
              letra={letraDe(tienda.nombre)}
              titulo={tienda.nombre}
              subtitulo={tienda.handle}
              badge={tienda.estado}
              badgeTono={tonoEstadoTienda(tienda.estado)}
            />
          </li>
        ))}
      </ul>
    </main>
  )
}

function CabeceraDashboard() {
  return (
    <header className="mb-5 flex items-center gap-2">
      <HotClickMark size={30} className="shrink-0" />
      <div>
        <h1 className="font-display text-[22px] font-bold">Panel Admin</h1>
        <p className="text-xs text-hc-muted">Vista general de HotClick</p>
      </div>
    </header>
  )
}

function KpisDashboard() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <AdminStatCard label="Tiendas activas" valor={formatoEntero(KPI_ADMIN.tiendasActivas)} />
      <AdminStatCard label="Vendedores" valor={formatoEntero(KPI_ADMIN.vendedores)} />
      <AdminStatCard label="Productos publicados" valor={formatoEntero(KPI_ADMIN.productosPublicados)} />
      <AdminStatCard
        label="Ventas totales"
        valor={formatoPrecio(KPI_ADMIN.ventasTotales)}
        destacado
      />
    </div>
  )
}
