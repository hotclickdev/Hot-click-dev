import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import Spinner from '@/components/ui/Spinner'
import { adminService, ventaService } from '@/services/orderService'
import { formatPrice } from '@/utils/format'
import useAuthStore from '@/store/authStore'
import { RUTA_SISTEMA_MARCA } from '@/utils/rutaTienda'
import type { Pagina } from '@/types/api'
import ActivityFeed from './dashboard/ActivityFeed'
import CategoryBars from './dashboard/CategoryBars'
import DashboardHeader from './dashboard/DashboardHeader'
import type { ServerStatus } from './dashboard/DashboardHeader'
import KpiCards from './dashboard/KpiCards'
import type { KpiCardModel } from './dashboard/KpiCards'
import PaymentMethods from './dashboard/PaymentMethods'
import QuickLinks from './dashboard/QuickLinks'
import type { QuickLink } from './dashboard/QuickLinks'
import RecentSales from './dashboard/RecentSales'
import SalesChart from './dashboard/SalesChart'
import SetupBanner from './dashboard/SetupBanner'
import {
  BarChartIcon,
  BoltIcon,
  ClipboardQLIcon,
  CoinIcon,
  MonitorIcon,
  PackageIcon,
  PeopleIcon,
} from './dashboard/dashboardIcons'
import {
  HEALTH_POLL_MS,
  ROLES_NEGOCIO,
  SETUP_KEY,
  buildActivity,
  buildSalesLast7,
} from './dashboard/dashboardHelpers'
import type { DashboardStats, UsuarioDashboard, VentaDashboard } from './dashboard/dashboardHelpers'
import SuperAdminHome from './dashboard/SuperAdminHome'
import {
  metricasDecision,
  textoCambioDelta,
  textoCambioPct,
  tonoCambio,
} from './dashboard/dashboardDecision'
import type { MetricasDecision } from './dashboard/dashboardDecision'

function abrirTutorial() {
  localStorage.removeItem('hc-admin-tour-v4-done')
  globalThis.dispatchEvent(new Event('hc-open-tour'))
}

function listaOPagina<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object' && 'content' in data) {
    const pagina = data as Pagina<T>
    return pagina.content ?? []
  }
  return []
}

function statsDesdeRespuesta(data: unknown): DashboardStats {
  if (data && typeof data === 'object' && !Array.isArray(data)) return data as DashboardStats
  return {}
}

export default function AdminDashboard() {
  const userRole = useAuthStore((s) => s.userRole)
  if (userRole === 'ADMIN') return <SuperAdminHome />
  return <DashboardDecision />
}

function DashboardDecision() {
  const { t } = useTranslation()
  const userRole = useAuthStore((s) => s.userRole)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [ventas, setVentas] = useState<VentaDashboard[]>([])
  const [users, setUsers] = useState<UsuarioDashboard[]>([])
  const [loading, setLoading] = useState(true)
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null)
  const [setupDismissed, setSetupDismissed] = useState(() => {
    try { return localStorage.getItem(SETUP_KEY) === '1' } catch { return false }
  })

  const dismissSetup = () => {
    try { localStorage.setItem(SETUP_KEY, '1') } catch { /* ok */ }
    setSetupDismissed(true)
  }

  useEffect(() => {
    Promise.all([
      adminService.getDashboard().catch((err: unknown) => { console.error(err); return { data: {} } }),
      ventaService.getAll().catch((err: unknown) => { console.error(err); return { data: [] } }),
      userRole === 'ADMIN'
        ? adminService.getUsers().catch((err: unknown) => { console.error(err); return { data: [] } })
        : Promise.resolve({ data: [] }),
    ]).then(([{ data: s }, { data: vs }, { data: us }]) => {
      setStats(statsDesdeRespuesta(s))
      setVentas(listaOPagina<VentaDashboard>(vs))
      setUsers(listaOPagina<UsuarioDashboard>(us))
    }).finally(() => setLoading(false))
  }, [userRole])

  useEffect(() => {
    if (userRole !== 'ADMIN') return
    const check = async () => {
      const t0 = Date.now()
      try {
        await adminService.health()
        setServerStatus({ up: true, ms: Date.now() - t0 })
      } catch {
        setServerStatus({ up: false, ms: null })
      }
    }
    check()
    const interval = setInterval(check, HEALTH_POLL_MS)
    return () => clearInterval(interval)
  }, [userRole])

  const salesLast7 = useMemo(() => buildSalesLast7(ventas), [ventas])
  const activity = useMemo(() => buildActivity(ventas, users), [ventas, users])
  const kpis = useMemo(() => metricasDecision(ventas, stats), [ventas, stats])
  const categorias = stats?.categorias ?? []
  const cards = cardsDecision(kpis, t)
  const quickLinks = accesosRapidos(t, userRole)
  const mostrarSetup = !setupDismissed && (stats?.totalProductos === 0 || stats?.totalProductos == null) && ROLES_NEGOCIO.has(userRole ?? '')
  const completadas = ventas.filter((v) => v.estado === 'COMPLETADO' || v.estado === 'ENTREGADO').length
  const pendientes = ventas.filter((v) => v.estado === 'PENDIENTE').length

  const header = (
    <DashboardHeader
      title={t('admin.dashboard.title')}
      welcome={t('admin.dashboard.welcomeDecision')}
      onOpenTour={abrirTutorial}
      serverStatus={serverStatus}
    />
  )

  if (loading) {
    return (
      <div className="space-y-6">
        {header}
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {header}
      {mostrarSetup && <SetupBanner onDismiss={dismissSetup} />}
      <KpiCards cards={cards} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <SalesChart salesLast7={salesLast7} />
          <CategoryBars categorias={categorias} />
        </div>
        <PaymentMethods
          byMethod={kpis.canales}
          completadas={completadas}
          pendientes={pendientes}
          ventasCount={ventas.length}
          titulo={kpis.canalDeHoy ? t('admin.dashboard.channelToday') : t('admin.dashboard.channel')}
          vacio={t('admin.dashboard.channelEmpty')}
          etiquetaConteo={t('admin.dashboard.channelCount')}
        />
      </div>
      <ActivityFeed activity={activity} />
      <QuickLinks links={quickLinks} />
      <RecentSales ventas={ventas} />
    </div>
  )
}

function cardsDecision(kpis: MetricasDecision, t: TFunction): KpiCardModel[] {
  return [
    {
      label: t('admin.dashboard.salesToday'),
      value: formatPrice(kpis.totalHoy),
      icon: <CoinIcon />,
      color: 'text-emerald-400',
      sub: textoCambioPct(kpis.pctIngresos),
      subTone: tonoCambio(kpis.pctIngresos),
      to: '/admin/finanzas',
    },
    {
      label: t('admin.dashboard.ordersToday'),
      value: kpis.pedidosHoy,
      icon: <ClipboardQLIcon />,
      color: 'text-[var(--hc-blue-400)]',
      sub: textoCambioDelta(kpis.pedidosHoy, kpis.pedidosAyer),
      subTone: tonoCambio(kpis.pedidosHoy - kpis.pedidosAyer),
      to: '/admin/pedidos',
    },
    {
      label: t('admin.dashboard.avgTicket'),
      value: formatPrice(kpis.ticketHoy),
      icon: <BoltIcon />,
      color: 'text-amber-400',
      sub: textoCambioPct(kpis.pctTicket),
      subTone: tonoCambio(kpis.pctTicket),
      to: '/admin/reportes',
    },
    {
      label: t('admin.dashboard.lowStock'),
      value: kpis.stockBajo,
      icon: <PackageIcon />,
      color: kpis.stockBajo > 0 ? 'text-red-400' : 'text-emerald-400',
      sub: t('admin.dashboard.reviewStock'),
      subTone: kpis.stockBajo > 0 ? 'down' : 'neutral',
      to: '/admin/productos',
    },
  ]
}

type AccesoRapido = QuickLink & { roles: string[] }

function accesosRapidos(t: TFunction, userRole: string | null): AccesoRapido[] {
  return [
    { to: '/admin/pedidos', label: t('admin.orders.title'), icon: <ClipboardQLIcon />, roles: ['ADMIN', 'EMPRENDEDOR'], highlight: true },
    { to: '/admin/pos', label: t('admin.dashboard.posCash'), icon: <MonitorIcon />, roles: ['EMPRENDEDOR', 'CAJERO', 'GERENTE', 'SUPERVISOR'] },
    { to: '/admin/productos', label: t('admin.products.title'), icon: <PackageIcon />, roles: ['ADMIN', 'EMPRENDEDOR'] },
    { to: '/admin/usuarios', label: t('admin.users.title'), icon: <PeopleIcon />, roles: ['ADMIN'] },
    { to: '/admin/finanzas', label: t('admin.finanzas.title'), icon: <CoinIcon />, roles: ['ADMIN', 'EMPRENDEDOR'] },
    { to: '/admin/reportes', label: t('admin.reportes.title'), icon: <BarChartIcon />, roles: ['ADMIN', 'EMPRENDEDOR'] },
    { to: RUTA_SISTEMA_MARCA, label: t('admin.dashboard.myBrand'), icon: <PackageIcon />, roles: ['EMPRENDEDOR'] },
  ].filter((link) => link.roles.includes(userRole ?? ''))
}
