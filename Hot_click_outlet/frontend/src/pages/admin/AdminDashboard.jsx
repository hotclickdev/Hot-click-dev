import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Spinner from '@/components/ui/Spinner'
import { adminService, ventaService } from '@/services/orderService'
import { formatPrice } from '@/utils/format'
import useAuthStore from '@/store/authStore'

const stagger = {
  container: { show: { transition: { staggerChildren: 0.07 } } },
  item: { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

const badgeStyle = (badge) => {
  if (!badge) return 'bg-white/10 text-[#8e8e9a]'
  const b = badge.toUpperCase()
  if (b === 'COMPLETADO' || b === 'ENTREGADO') return 'bg-emerald-500/15 text-emerald-400'
  if (b === 'PENDIENTE') return 'bg-amber-500/15 text-amber-400'
  if (b === 'PAGADO') return 'bg-[#4f7cff]/15 text-[#4f7cff]'
  if (b === 'REGISTRO') return 'bg-purple-500/15 text-purple-400'
  if (b === 'CANCELADO') return 'bg-red-500/15 text-red-400'
  return 'bg-white/10 text-[#8e8e9a]'
}

const SETUP_KEY = 'hotclick-setup-dismissed'

export default function AdminDashboard() {
  const { t } = useTranslation()
  const userRole = useAuthStore((s) => s.userRole)
  const [stats, setStats] = useState(null)
  const [ventas, setVentas] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [setupDismissed, setSetupDismissed] = useState(() => {
    try { return localStorage.getItem(SETUP_KEY) === '1' } catch { return false }
  })

  const dismissSetup = () => {
    try { localStorage.setItem(SETUP_KEY, '1') } catch { /* ok */ }
    setSetupDismissed(true)
  }

  useEffect(() => {
    Promise.all([
      adminService.getDashboard().catch(() => ({ data: {} })),
      ventaService.getAll().catch(() => ({ data: [] })),
      userRole === 'ADMIN_IT'
        ? adminService.getUsers().catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] }),
    ]).then(([{ data: s }, { data: vs }, { data: us }]) => {
      setStats(s)
      setVentas(Array.isArray(vs) ? vs : vs?.content ?? [])
      setUsers(Array.isArray(us) ? us : us?.content ?? [])
    }).finally(() => setLoading(false))
  }, [userRole])

  const now = new Date()
  const mesKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Ventas últimos 7 días
  const salesLast7 = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const label = d.toLocaleDateString('es-CR', { weekday: 'short' })
      const total = ventas
        .filter((v) => (v.fechaCreacion ?? '').startsWith(key) && (v.estado === 'COMPLETADO' || v.estado === 'ENTREGADO'))
        .reduce((s, v) => s + (v.total ?? 0), 0)
      days.push({ label, total })
    }
    return days
  }, [ventas])

  // Por método de pago
  const byMethod = useMemo(() => {
    const map = {}
    ventas.forEach((v) => {
      const m = v.metodoPago ?? 'OTRO'
      map[m] = (map[m] ?? 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [ventas])

  const totalMes = ventas
    .filter((v) => (v.fechaCreacion ?? '').startsWith(mesKey))
    .reduce((s, v) => s + (v.total ?? 0), 0)

  const completadas = ventas.filter((v) => v.estado === 'COMPLETADO' || v.estado === 'ENTREGADO').length
  const pendientes = ventas.filter((v) => v.estado === 'PENDIENTE').length

  // Usuarios nuevos este mes
  const usuariosNuevosMes = useMemo(
    () => users.filter((u) => (u.fechaCreacion ?? u.createdAt ?? '').startsWith(mesKey)).length,
    [users, mesKey]
  )

  // Feed de actividad reciente
  const activity = useMemo(() => {
    const items = []
    ventas.slice(0, 15).forEach((v) => {
      items.push({
        type: 'sale',
        id: `sale-${v.id}`,
        title: `Nueva venta #${v.id}`,
        desc: `${v.nombreCliente ?? v.cliente?.nombre ?? 'Cliente'} — ${formatPrice(v.total ?? 0)}`,
        date: v.fechaCreacion,
        badge: v.estado,
      })
    })
    users.slice(0, 8).forEach((u) => {
      items.push({
        type: 'user',
        id: `user-${u.id}`,
        title: 'Nuevo usuario registrado',
        desc: u.nombre ?? u.email ?? '—',
        date: u.fechaCreacion ?? u.createdAt,
        badge: 'REGISTRO',
      })
    })
    return items
      .filter((i) => i.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10)
  }, [ventas, users])

  // Categorías
  const categorias = stats?.categorias ?? []
  const maxCat = Math.max(...categorias.map((c) => c.cantidad ?? 0), 1)

  const cards = [
    {
      label: t('admin.finanzas.income'),
      value: formatPrice(totalMes),
      icon: <CoinIcon />,
      color: 'text-emerald-400',
      sub: `${ventas.length} ventas total`,
    },
    {
      label: t('admin.dashboard.totalOrders'),
      value: completadas,
      icon: <CheckCircleIcon />,
      color: 'text-[#4f7cff]',
      sub: `${pendientes} pendientes`,
    },
    {
      label: t('admin.dashboard.totalUsers'),
      value: stats?.totalUsuarios ?? '—',
      icon: <PeopleIcon />,
      color: 'text-purple-400',
      sub: usuariosNuevosMes > 0 ? `+${usuariosNuevosMes} este mes` : 'usuarios activos',
    },
    {
      label: t('admin.dashboard.totalProducts'),
      value: stats?.totalProductos ?? '—',
      icon: <PackageIcon />,
      color: 'text-amber-400',
      sub: `${stats?.stockBajo ?? 0} stock bajo`,
    },
  ]

  const quickLinks = [
    { to: '/admin/pos',       label: 'Caja POS',                icon: '🖥️',               roles: ['ADMIN_IT', 'ADMIN_CLIENTE', 'EMPRENDEDOR', 'CAJERO', 'GERENTE', 'SUPERVISOR'], highlight: true },
    { to: '/admin/pedidos',   label: t('admin.orders.title'),   icon: <ClipboardQLIcon />, roles: ['ADMIN_IT', 'ADMIN_CLIENTE', 'EMPRENDEDOR'] },
    { to: '/admin/productos', label: t('admin.products.title'), icon: <PackageIcon />,     roles: ['ADMIN_IT', 'ADMIN_CLIENTE', 'EMPRENDEDOR'] },
    { to: '/admin/usuarios',  label: t('admin.users.title'),    icon: <PeopleIcon />,      roles: ['ADMIN_IT'] },
    { to: '/admin/ventas',    label: t('admin.sales.title'),    icon: <BoltIcon />,        roles: ['ADMIN_IT', 'ADMIN_CLIENTE', 'EMPRENDEDOR'] },
    { to: '/admin/finanzas',  label: t('admin.finanzas.title'), icon: <CoinIcon />,        roles: ['ADMIN_IT', 'ADMIN_CLIENTE', 'EMPRENDEDOR'] },
    { to: '/admin/reportes',  label: t('admin.reportes.title'), icon: <BarChartIcon />,    roles: ['ADMIN_IT', 'ADMIN_CLIENTE', 'EMPRENDEDOR'] },
    { to: '/admin/mi-empresa', label: 'Mi negocio',              icon: <PackageIcon />,    roles: ['EMPRENDEDOR', 'ADMIN_CLIENTE'] },
  ].filter(link => link.roles.includes(userRole))

  const maxSale = Math.max(...salesLast7.map((d) => d.total), 1)
  const maxMethod = byMethod[0]?.[1] ?? 1

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[#e8e8ed]">{t('admin.dashboard.title')}</h1>
            <p className="text-sm text-[#8e8e9a] mt-1">{t('admin.dashboard.welcome')}</p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('hc-admin-tour-v2-done')
              window.dispatchEvent(new Event('hc-open-tour'))
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-80 shrink-0"
            style={{ backgroundColor: 'rgba(120,64,224,0.1)', border: '1px solid rgba(120,64,224,0.25)', color: '#a78bfa' }}
          >
            🎯 Ver tutorial
          </button>
        </div>

        {/* Banner: Primeros pasos — solo para negocios nuevos sin productos */}
        {!loading && !setupDismissed && (stats?.totalProductos === 0 || stats?.totalProductos == null) && ['EMPRENDEDOR', 'ADMIN_CLIENTE'].includes(userRole) && (
          <div className="rounded-2xl p-5" style={{ backgroundColor: 'rgba(79,124,255,0.06)', border: '1px solid rgba(79,124,255,0.2)' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-[#e8e8ed] mb-1">Empezá en 3 pasos</p>
                <p className="text-xs text-[#8e8e9a] mb-4">Tu negocio está listo. Completá esto para recibir tus primeros clientes.</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Completar perfil',    to: '/admin/mi-empresa',   step: 1 },
                    { label: 'Agregar un producto', to: '/admin/productos',    step: 2 },
                    { label: 'Activar visibilidad', to: '/admin/mi-empresa',   step: 3 },
                  ].map(({ label, to, step }) => (
                    <Link
                      key={step}
                      to={to}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-80"
                      style={{ backgroundColor: 'rgba(79,124,255,0.12)', border: '1px solid rgba(79,124,255,0.25)', color: '#7fa0ff' }}
                    >
                      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0" style={{ backgroundColor: '#4f7cff', color: '#fff' }}>{step}</span>
                      {label} →
                    </Link>
                  ))}
                </div>
              </div>
              <button
                onClick={dismissSetup}
                className="p-1 rounded-lg hover:bg-white/5 transition-colors shrink-0"
                style={{ color: '#8e8e9a' }}
                title="Cerrar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : (
          <>
            {/* KPI cards */}
            <motion.div
              variants={stagger.container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4"
            >
              {cards.map((card) => (
                <motion.div
                  key={card.label}
                  variants={stagger.item}
                  className="bg-[#111114] border border-white/8 rounded-2xl p-3 sm:p-5"
                >
                  <div className="flex items-start justify-between mb-1.5 sm:mb-2">
                    <span className="w-4 h-4 sm:w-5 sm:h-5 text-[#8e8e9a]">{card.icon}</span>
                    <div className={`text-lg sm:text-2xl font-bold ${card.color} leading-none`}>{card.value}</div>
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-[#e8e8ed] leading-tight">{card.label}</p>
                  <p className="text-[10px] sm:text-xs text-[#8e8e9a] mt-0.5">{card.sub}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left col: bar chart + categories */}
              <div className="lg:col-span-2 space-y-4">
                {/* Bar chart — últimos 7 días */}
                <div className="bg-[#111114] border border-white/8 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-semibold text-[#e8e8ed]">{t('admin.dashboard.revenue')}</h2>
                      <p className="text-xs text-[#8e8e9a] mt-0.5">Últimos 7 días (completadas)</p>
                    </div>
                    <Link to="/admin/reportes" className="text-xs text-[#4f7cff] hover:underline">
                      Ver reportes →
                    </Link>
                  </div>
                  <div className="flex items-end gap-2 h-40">
                    {salesLast7.map((d, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span
                          className="text-[9px] text-[#8e8e9a] text-center leading-tight"
                          style={{ minHeight: '22px' }}
                        >
                          {d.total > 0 ? formatPrice(d.total) : ''}
                        </span>
                        <div className="w-full relative flex items-end" style={{ height: '100px' }}>
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{
                              height: `${Math.max((d.total / maxSale) * 100, d.total > 0 ? 6 : 2)}px`,
                            }}
                            transition={{ duration: 0.55, delay: i * 0.06 }}
                            className="w-full rounded-t-lg"
                            style={{
                              background: d.total > 0
                                ? 'linear-gradient(to top, #4f7cff, #7fa0ff)'
                                : 'rgba(255,255,255,0.06)',
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-[#8e8e9a] capitalize">{d.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Categories chart */}
                {categorias.length > 0 && (
                  <div className="bg-[#111114] border border-white/8 rounded-2xl p-5">
                    <h2 className="text-sm font-semibold text-[#e8e8ed] mb-4">Productos por categoría</h2>
                    <div className="space-y-2.5">
                      {categorias.slice(0, 6).map((cat, i) => (
                        <div key={cat.nombre} className="flex items-center gap-3">
                          <span className="text-xs text-[#8e8e9a] w-28 truncate shrink-0">{cat.nombre}</span>
                          <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${((cat.cantidad ?? 0) / maxCat) * 100}%` }}
                              transition={{ duration: 0.5, delay: i * 0.06 }}
                              className="h-full rounded-full"
                              style={{ background: `hsl(${220 + i * 35}, 75%, 65%)` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-[#e8e8ed] w-6 text-right shrink-0">
                            {cat.cantidad}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right col: payment methods + status */}
              <div className="bg-[#111114] border border-white/8 rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-[#e8e8ed] mb-4">Métodos de pago</h2>
                {byMethod.length === 0 ? (
                  <p className="text-xs text-[#8e8e9a] text-center py-8">{t('common.noData')}</p>
                ) : (
                  <div className="space-y-3">
                    {byMethod.map(([method, count]) => (
                      <div key={method}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[#e8e8ed]">{method}</span>
                          <span className="text-[#8e8e9a]">{count} ventas</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(count / maxMethod) * 100}%` }}
                            transition={{ duration: 0.5 }}
                            className="h-full bg-[#4f7cff] rounded-full"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-5 pt-4 border-t border-white/8">
                  <h3 className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider mb-3">
                    Estado ventas
                  </h3>
                  <div className="space-y-2">
                    {[
                      { label: 'Completadas', count: completadas, color: 'bg-emerald-500' },
                      { label: 'Pendientes', count: pendientes, color: 'bg-amber-500' },
                      {
                        label: 'Otras',
                        count: ventas.length - completadas - pendientes,
                        color: 'bg-white/20',
                      },
                    ]
                      .filter((s) => s.count > 0)
                      .map((s) => (
                        <div key={s.label} className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${s.color}`} />
                          <span className="text-xs text-[#8e8e9a] flex-1">{s.label}</span>
                          <span className="text-xs font-medium text-[#e8e8ed]">{s.count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Activity feed */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[#e8e8ed]">Actividad reciente</h2>
                {activity.length > 0 && (
                  <span className="text-[10px] text-[#8e8e9a] bg-white/5 px-2.5 py-0.5 rounded-full">
                    {activity.length} eventos
                  </span>
                )}
              </div>
              {activity.length === 0 ? (
                <div className="bg-[#111114] border border-white/8 rounded-2xl p-8 text-center text-xs text-[#8e8e9a]">
                  Sin actividad reciente
                </div>
              ) : (
                <div className="bg-[#111114] border border-white/8 rounded-2xl divide-y divide-white/5 overflow-hidden">
                  {activity.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.22, delay: i * 0.04 }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors"
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          item.type === 'user' ? 'bg-purple-500/15' : 'bg-[#4f7cff]/15'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 ${
                            item.type === 'user' ? 'text-purple-400' : 'text-[#4f7cff]'
                          }`}
                        >
                          {item.type === 'user' ? <PeopleIcon /> : <BoltIcon />}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#e8e8ed] truncate">{item.title}</p>
                        <p className="text-[10px] text-[#8e8e9a] truncate">{item.desc}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badgeStyle(item.badge)}`}
                        >
                          {item.badge}
                        </span>
                        <span className="text-[10px] text-[#8e8e9a] whitespace-nowrap">
                          {timeAgo(item.date)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div>
              <h2 className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider mb-3">
                Acceso rápido
              </h2>
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                {quickLinks.map((link) => (
                  link.highlight ? (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all text-center group col-span-1"
                      style={{ background: 'linear-gradient(135deg,rgba(79,124,255,0.18),rgba(124,58,237,0.18))', border: '1.5px solid rgba(79,124,255,0.4)' }}
                    >
                      <span className="text-xl">{link.icon}</span>
                      <span className="text-xs font-bold leading-tight" style={{ color: '#7aa3ff' }}>
                        {link.label}
                      </span>
                    </Link>
                  ) : (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="flex flex-col items-center gap-2 p-4 bg-[#111114] border border-white/8 rounded-2xl hover:border-white/15 hover:bg-[#1a1a1f] transition-all text-center group"
                    >
                      <span className="w-5 h-5 text-[#8e8e9a] group-hover:text-white transition-colors">
                        {link.icon}
                      </span>
                      <span className="text-xs text-[#8e8e9a] group-hover:text-white transition-colors leading-tight">
                        {link.label}
                      </span>
                    </Link>
                  )
                ))}
              </div>
            </div>

            {/* Recent sales table */}
            {ventas.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-[#e8e8ed]">Ventas recientes</h2>
                  <Link to="/admin/ventas" className="text-xs text-[#4f7cff] hover:underline">
                    Ver todas →
                  </Link>
                </div>
                <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[560px]">
                      <thead>
                        <tr className="border-b border-white/8">
                          {['#', 'Cliente', 'Total', 'Estado'].map((h) => (
                            <th
                              key={h}
                              className="text-left px-3 sm:px-4 py-2.5 text-xs font-medium text-[#8e8e9a] uppercase tracking-wider"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {ventas.slice(0, 5).map((v) => (
                          <tr key={v.id} className="hover:bg-white/3 transition-colors">
                            <td className="px-3 sm:px-4 py-2.5 text-[#8e8e9a] text-xs">#{v.id}</td>
                            <td className="px-3 sm:px-4 py-2.5 text-[#e8e8ed] text-xs sm:text-sm" title={v.nombreCliente ?? v.cliente?.nombre ?? ''}>
                              <span className="truncate block max-w-[180px]">{v.nombreCliente ?? v.cliente?.nombre ?? '—'}</span>
                            </td>
                            <td className="px-3 sm:px-4 py-2.5 font-semibold text-emerald-400 text-xs sm:text-sm whitespace-nowrap">
                              {formatPrice(v.total ?? 0)}
                            </td>
                            <td className="px-3 sm:px-4 py-2.5">
                              <span
                                className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                                  v.estado === 'COMPLETADO' || v.estado === 'ENTREGADO'
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : 'bg-amber-500/15 text-amber-400'
                                }`}
                              >
                                {v.estado ?? '—'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

const ic = 'w-full h-full'
const s = {
  fill: 'none',
  stroke: 'currentColor',
  viewBox: '0 0 24 24',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function CoinIcon() {
  return (
    <svg className={ic} {...s}>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 9.5a2.5 2.5 0 00-5 0c0 1.5 1 2 2.5 2.5S15 13 15 14.5a2.5 2.5 0 01-5 0" />
      <line x1="12" y1="7" x2="12" y2="17" />
    </svg>
  )
}
function CheckCircleIcon() {
  return (
    <svg className={ic} {...s}>
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
function PeopleIcon() {
  return (
    <svg className={ic} {...s}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}
function PackageIcon() {
  return (
    <svg className={ic} {...s}>
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}
function ClipboardQLIcon() {
  return (
    <svg className={ic} {...s}>
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  )
}
function BoltIcon() {
  return (
    <svg className={ic} {...s}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}
function BarChartIcon() {
  return (
    <svg className={ic} {...s}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  )
}
