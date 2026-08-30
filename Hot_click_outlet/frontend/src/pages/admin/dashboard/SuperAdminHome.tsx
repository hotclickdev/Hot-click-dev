import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { HotClickMark } from '@/components/ui/BrandLogo'
import Spinner from '@/components/ui/Spinner'
import { formatoEntero, letraDe } from '@/prototipo/admin/adminData'
import {
  AdminDarkButton,
  AdminEntityRow,
  AdminSecondaryButton,
  AdminStatCard,
} from '@/prototipo/admin/AdminUi'
import { adminService } from '@/services/orderService'
import { formatPrice } from '@/utils/format'
import { listaEmpresasDesdeRespuesta, nombreVisibleEmpresa, type EmpresaLista } from '../empresas/empresasHelpers'
import { listaUsuariosDesdeRespuesta, type UsuarioAdmin } from '../usuarios/usuarioHelpers'
import {
  etiquetaEstadoTienda,
  kpisPanelAdmin,
  tonoEstadoTienda,
  type KpisPanelAdmin,
} from './superAdminHomeHelpers'
import type { DashboardStats } from './dashboardHelpers'

function statsDesdeRespuesta(data: unknown): DashboardStats {
  if (data && typeof data === 'object' && !Array.isArray(data)) return data as DashboardStats
  return {}
}

/**
 * Super Admin home (Figma 41:129) con datos reales.
 */
export default function SuperAdminHome() {
  const [stats, setStats] = useState<DashboardStats>({})
  const [empresas, setEmpresas] = useState<EmpresaLista[]>([])
  const [users, setUsers] = useState<UsuarioAdmin[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelado = false
    Promise.all([
      adminService.getDashboard().catch((err: unknown) => { console.error(err); return { data: {} } }),
      adminService.getEmpresas().catch((err: unknown) => { console.error(err); return { data: [] } }),
      adminService.getUsers().catch((err: unknown) => { console.error(err); return { data: [] } }),
    ]).then(([{ data: s }, { data: emps }, { data: us }]) => {
      if (cancelado) return
      setStats(statsDesdeRespuesta(s))
      setEmpresas(listaEmpresasDesdeRespuesta(emps))
      setUsers(listaUsuariosDesdeRespuesta(us))
    }).finally(() => { if (!cancelado) setLoading(false) })
    return () => { cancelado = true }
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  const kpis = kpisPanelAdmin(empresas, stats, users)
  const recientes = empresas.slice(0, 3)

  return (
    <div className="mx-auto flex max-w-md flex-col gap-[22px] pb-8 md:max-w-4xl">
      <CabeceraPanel />
      <KpisPanel kpis={kpis} />
      <div className="flex flex-col gap-3 md:flex-row md:max-w-2xl">
        <AdminDarkButton to="/admin/productos/carga-masiva" dataMm="carga-masiva">
          Carga masiva de productos
        </AdminDarkButton>
        <AdminSecondaryButton to="/admin/herramientas" dataMm="mas-herramientas">
          Más herramientas
        </AdminSecondaryButton>
      </div>
      <TiendasRecientes empresas={recientes} total={empresas.length} />
    </div>
  )
}

function CabeceraPanel() {
  return (
    <header className="flex items-center gap-2">
      <HotClickMark size={30} className="hidden shrink-0 md:block" />
      <div>
        <h1 className="font-display text-[22px] font-bold text-hc-text">Panel Admin</h1>
        <p className="text-xs text-hc-muted">Vista general de HotClick</p>
      </div>
    </header>
  )
}

function KpisPanel({ kpis }: { kpis: KpisPanelAdmin }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <AdminStatCard label="Tiendas activas" valor={formatoEntero(kpis.tiendasActivas)} />
      <AdminStatCard label="Vendedores" valor={formatoEntero(kpis.vendedores)} />
      <AdminStatCard label="Productos publicados" valor={formatoEntero(kpis.productos)} />
      <AdminStatCard label="Ventas totales" valor={formatPrice(kpis.ventas)} destacado />
    </div>
  )
}

function TiendasRecientes({ empresas, total }: { empresas: EmpresaLista[]; total: number }) {
  return (
    <section data-mm="tiendas-recientes">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[15px] font-bold">Tiendas recientes</h2>
        <Link to="/admin/empresas" className="text-xs font-medium text-hc-primary">
          Ver todas ›
        </Link>
      </div>
      {empresas.length === 0 ? (
        <p className="text-sm text-hc-muted">
          {total === 0 ? 'Todavía no hay tiendas registradas.' : 'Sin tiendas para mostrar.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-5">
          {empresas.map((tienda) => {
            const nombre = nombreVisibleEmpresa(tienda) ?? 'Tienda'
            return (
              <li key={String(tienda.id)}>
                <AdminEntityRow
                  to="/admin/empresas"
                  letra={letraDe(nombre)}
                  titulo={nombre}
                  subtitulo={tienda.slug ?? tienda.correoEmpresa ?? ''}
                  badge={etiquetaEstadoTienda(tienda.estadoEmpresa)}
                  badgeTono={tonoEstadoTienda(tienda.estadoEmpresa)}
                />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
