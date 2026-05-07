import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import AdminLayout from '@/layouts/AdminLayout'
import Spinner from '@/components/ui/Spinner'
import { adminService, ventaService } from '@/services/orderService'
import { formatPrice } from '@/utils/format'

const stagger = {
  container: { show: { transition: { staggerChildren: 0.07 } } },
  item: { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      adminService.getDashboard().catch(() => ({ data: {} })),
      ventaService.getAll().catch(() => ({ data: [] })),
    ]).then(([{ data: s }, { data: vs }]) => {
      setStats(s)
      setVentas(Array.isArray(vs) ? vs : vs?.content ?? [])
    }).finally(() => setLoading(false))
  }, [])

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

  // Total del mes actual
  const now = new Date()
  const mesKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const totalMes = ventas
    .filter((v) => (v.fechaCreacion ?? '').startsWith(mesKey))
    .reduce((s, v) => s + (v.total ?? 0), 0)

  const completadas = ventas.filter((v) => v.estado === 'COMPLETADO' || v.estado === 'ENTREGADO').length
  const pendientes = ventas.filter((v) => v.estado === 'PENDIENTE').length

  const cards = [
    { label: 'Ingresos del mes', value: formatPrice(totalMes), icon: <CoinIcon />, color: 'text-emerald-400', sub: `${ventas.length} ventas total` },
    { label: 'Ventas completadas', value: completadas, icon: <CheckCircleIcon />, color: 'text-[#4f7cff]', sub: `${pendientes} pendientes` },
    { label: 'Usuarios', value: stats?.totalUsuarios ?? '—', icon: <PeopleIcon />, color: 'text-purple-400', sub: `${stats?.usuariosPendientes ?? 0} por aprobar` },
    { label: 'Productos', value: stats?.totalProductos ?? '—', icon: <PackageIcon />, color: 'text-amber-400', sub: `${stats?.stockBajo ?? 0} stock bajo` },
  ]

  const quickLinks = [
    { to: '/admin/pedidos', label: 'Gestionar pedidos', icon: <ClipboardQLIcon /> },
    { to: '/admin/productos', label: 'Gestionar productos', icon: <PackageIcon /> },
    { to: '/admin/usuarios', label: 'Aprobar usuarios', icon: <PeopleIcon /> },
    { to: '/admin/ventas', label: 'Nueva venta', icon: <BoltIcon /> },
    { to: '/admin/finanzas', label: 'Finanzas', icon: <CoinIcon /> },
    { to: '/admin/reportes', label: 'Reportes', icon: <BarChartIcon /> },
  ]

  const maxSale = Math.max(...salesLast7.map((d) => d.total), 1)
  const maxMethod = byMethod[0]?.[1] ?? 1

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#e8e8ed]">General</h1>
          <p className="text-sm text-[#8e8e9a] mt-1">Panel de control HOTCLICK</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : (
          <>
            {/* KPI cards */}
            <motion.div variants={stagger.container} initial="hidden" animate="show" className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
              {cards.map((card) => (
                <motion.div key={card.label} variants={stagger.item} className="bg-[#111114] border border-white/8 rounded-2xl p-3 sm:p-5">
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
              {/* Sales trend – last 7 days */}
              <div className="lg:col-span-2 bg-[#111114] border border-white/8 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-[#e8e8ed]">Ventas — últimos 7 días</h2>
                    <p className="text-xs text-[#8e8e9a] mt-0.5">Solo ventas completadas/entregadas</p>
                  </div>
                  <Link to="/admin/reportes" className="text-xs text-[#4f7cff] hover:underline">Ver reportes →</Link>
                </div>
                <div className="flex items-end gap-2 h-36">
                  {salesLast7.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-[9px] text-[#8e8e9a]">
                        {d.total > 0 ? formatPrice(d.total) : ''}
                      </span>
                      <div className="w-full relative flex items-end" style={{ height: '96px' }}>
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max((d.total / maxSale) * 96, d.total > 0 ? 4 : 2)}px` }}
                          transition={{ duration: 0.5, delay: i * 0.06 }}
                          className={`w-full rounded-t-lg ${d.total > 0 ? 'bg-[#4f7cff]' : 'bg-white/6'}`}
                          style={{ minHeight: d.total > 0 ? '4px' : '2px' }}
                        />
                      </div>
                      <span className="text-[10px] text-[#8e8e9a] capitalize">{d.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment methods */}
              <div className="bg-[#111114] border border-white/8 rounded-2xl p-5">
                <h2 className="text-sm font-semibold text-[#e8e8ed] mb-4">Métodos de pago</h2>
                {byMethod.length === 0 ? (
                  <p className="text-xs text-[#8e8e9a] text-center py-8">Sin datos</p>
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

                {/* Status breakdown */}
                <div className="mt-5 pt-4 border-t border-white/8">
                  <h3 className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider mb-3">Estado ventas</h3>
                  <div className="space-y-2">
                    {[
                      { label: 'Completadas', count: completadas, color: 'bg-emerald-500' },
                      { label: 'Pendientes', count: pendientes, color: 'bg-amber-500' },
                      { label: 'Otras', count: ventas.length - completadas - pendientes, color: 'bg-white/20' },
                    ].filter((s) => s.count > 0).map((s) => (
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

            {/* Quick actions */}
            <div>
              <h2 className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider mb-3">Acciones rápidas</h2>
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                {quickLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="flex flex-col items-center gap-2 p-4 bg-[#111114] border border-white/8 rounded-2xl hover:border-white/15 hover:bg-[#1a1a1f] transition-all text-center group"
                  >
                    <span className="w-5 h-5 text-[#8e8e9a] group-hover:text-white transition-colors">{link.icon}</span>
                    <span className="text-xs text-[#8e8e9a] group-hover:text-white transition-colors leading-tight">{link.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent sales mini table */}
            {ventas.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-[#e8e8ed]">Ventas recientes</h2>
                  <Link to="/admin/reportes" className="text-xs text-[#4f7cff] hover:underline">Ver todas →</Link>
                </div>
                <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[420px]">
                    <thead>
                      <tr className="border-b border-white/8">
                        {['#', 'Cliente', 'Total', 'Estado'].map((h) => (
                          <th key={h} className="text-left px-3 sm:px-4 py-2.5 text-xs font-medium text-[#8e8e9a] uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {ventas.slice(0, 5).map((v) => (
                        <tr key={v.id} className="hover:bg-white/3 transition-colors">
                          <td className="px-3 sm:px-4 py-2.5 text-[#8e8e9a] text-xs">#{v.id}</td>
                          <td className="px-3 sm:px-4 py-2.5 text-[#e8e8ed] text-xs sm:text-sm max-w-[120px] truncate">{v.nombreCliente ?? v.cliente?.nombre ?? '—'}</td>
                          <td className="px-3 sm:px-4 py-2.5 font-semibold text-emerald-400 text-xs sm:text-sm whitespace-nowrap">{formatPrice(v.total ?? 0)}</td>
                          <td className="px-3 sm:px-4 py-2.5">
                            <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                              v.estado === 'COMPLETADO' || v.estado === 'ENTREGADO'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-amber-500/15 text-amber-400'
                            }`}>{v.estado ?? '—'}</span>
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
    </AdminLayout>
  )
}

const ic = 'w-full h-full'
const s = { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

function CoinIcon() {
  return <svg className={ic} {...s}><circle cx="12" cy="12" r="9"/><path d="M14.5 9.5a2.5 2.5 0 00-5 0c0 1.5 1 2 2.5 2.5S15 13 15 14.5a2.5 2.5 0 01-5 0"/><line x1="12" y1="7" x2="12" y2="17"/></svg>
}
function CheckCircleIcon() {
  return <svg className={ic} {...s}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
}
function PeopleIcon() {
  return <svg className={ic} {...s}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
}
function PackageIcon() {
  return <svg className={ic} {...s}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
}
function ClipboardQLIcon() {
  return <svg className={ic} {...s}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
}
function BoltIcon() {
  return <svg className={ic} {...s}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
}
function BarChartIcon() {
  return <svg className={ic} {...s}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
}
