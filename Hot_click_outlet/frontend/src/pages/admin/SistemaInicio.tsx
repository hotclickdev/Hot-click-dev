import { useEffect, useState, useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Spinner from '@/components/ui/Spinner'
import { adminService, ventaService } from '@/services/orderService'
import { copilotService } from '@/services/copilotService'
import { formatPrice } from '@/utils/format'
import useAuthStore from '@/store/authStore'
import TextoFlecha from '@/components/ui/TextoFlecha'
import HoyAlertas from './sistema-inicio/HoyAlertas'
import SistemaChecklist from './sistema-inicio/SistemaChecklist'
import { SETUP_KEY } from './dashboard/dashboardHelpers'
import type { DashboardStats } from './dashboard/dashboardHelpers'
import {
  ESTADO_LABEL,
  countPorDespachar,
  conteosHoy,
  isoDay,
  listaOPagina,
  pctCambio,
  timeAgo,
  totalCompletado,
  ventasDelDia,
  type InsightsInicio,
  type VentaInicio,
} from './sistema-inicio/sistemaInicioHelpers'
import AccesoTiendaPublica from '@/components/sistema/AccesoTiendaPublica'
import BotonesAgregarProducto from '@/prototipo/compartido/BotonesAgregarProducto'
import { rutaNuevoProductoSeller } from '@/prototipo/compartido/rutaNuevoProductoSeller'
import useTenantStore from '@/store/tenantStore'
import { debeMostrarChecklist } from './sistema-inicio/sistemaChecklistPasos'

const stagger = {
  container: { show: { transition: { staggerChildren: 0.07 } } },
  item: { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
}

const ESTADO_STYLE: Record<string, { bg: string; color: string }> = {
  PENDIENTE:  { bg: '#f7ead2', color: '#8a5a00' },
  PAGADO:     { bg: 'rgba(23,71,168,0.08)', color: 'var(--hc-accent)' },
  COMPLETADO: { bg: '#e2f1e8', color: '#1E7F4F' },
  ENTREGADO:  { bg: '#e2f1e8', color: '#1E7F4F' },
  CANCELADO:  { bg: '#fbe4e2', color: '#a8291f' },
}

function EstadoBadge({ estado }: { estado?: string }) {
  const s = ESTADO_STYLE[estado ?? ''] ?? { bg: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ backgroundColor: s.bg, color: s.color }}>
      {ESTADO_LABEL[estado ?? ''] ?? estado ?? '—'}
    </span>
  )
}

export default function SistemaInicio() {
  const userName = useAuthStore((s) => s.userName)
  const empresaNombre = useAuthStore((s) => s.empresaNombre)
  const estadoEmpresa = useTenantStore((s) => s.estadoEmpresa)
  const visibilidadPublica = useTenantStore((s) => s.visibilidadPublica)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [ventas, setVentas] = useState<VentaInicio[]>([])
  const [insights, setInsights] = useState<InsightsInicio>(null)
  const [loading, setLoading] = useState(true)
  const [setupDismissed, setSetupDismissed] = useState(() => {
    try { return localStorage.getItem(SETUP_KEY) === '1' } catch { return false }
  })

  function dismissSetup() {
    try { localStorage.setItem(SETUP_KEY, '1') } catch { /* ok */ }
    setSetupDismissed(true)
  }

  useEffect(() => {
    Promise.all([
      adminService.getDashboard().catch((err: unknown) => {
        console.error('[SistemaInicio] dashboard', err)
        return { data: {} }
      }),
      ventaService.getAll().catch((err: unknown) => {
        console.error('[SistemaInicio] ventas', err)
        return { data: [] }
      }),
      copilotService.getInsights().catch((err: unknown) => {
        console.error('[SistemaInicio] insights', err)
        return { data: {} }
      }),
    ]).then(([{ data: s }, { data: vs }, { data: ins }]) => {
      setStats(s as DashboardStats)
      setVentas(listaOPagina<VentaInicio>(vs))
      setInsights((ins ?? {}) as InsightsInicio)
    }).finally(() => setLoading(false))
  }, [])

  const hoy = isoDay(0)
  const ayer = isoDay(1)
  const ventasHoyList = useMemo(() => ventasDelDia(ventas, hoy), [ventas, hoy])
  const ventasAyerList = useMemo(() => ventasDelDia(ventas, ayer), [ventas, ayer])
  const totalHoy = totalCompletado(ventasHoyList)
  const totalAyer = totalCompletado(ventasAyerList)
  const ventasCompHoy = pctCambio(totalHoy, totalAyer)
  const ticketHoy = ventasHoyList.length > 0 ? Math.round(totalHoy / ventasHoyList.length) : 0
  const ticketAyer = ventasAyerList.length > 0 ? Math.round(totalAyer / ventasAyerList.length) : 0
  const ticketComp = pctCambio(ticketHoy, ticketAyer)
  const porDespachar = countPorDespachar(ventas)
  const { sinStock, sinVenta } = conteosHoy(insights, stats?.stockBajo ?? 0)
  const recientes = useMemo(
    () => [...ventas].sort((a, b) => new Date(b.fechaCreacion ?? 0).getTime() - new Date(a.fechaCreacion ?? 0).getTime()).slice(0, 4),
    [ventas],
  )
  const fechaHoyLegible = new Date().toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' })

  const mostrarChecklist = debeMostrarChecklist({
    dismissed: setupDismissed,
    totalProductos: stats?.totalProductos,
    estadoEmpresa,
    visibilidadPublica,
  })

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--hc-text)' }}>
          Hola, {userName?.split(' ')[0] ?? 'de nuevo'}
        </h1>
        <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
          Así va {empresaNombre ?? 'tu negocio'} hoy, {fechaHoyLegible}.
        </p>
      </header>

      {mostrarChecklist && (
        <SistemaChecklist
          onDismiss={dismissSetup}
          totalProductos={stats?.totalProductos}
          estadoEmpresa={estadoEmpresa}
          visibilidadPublica={visibilidadPublica}
        />
      )}

      <HoyAlertas porDespachar={porDespachar} sinStock={sinStock} sinVenta={sinVenta} />

      <KpiGrid
        totalHoy={totalHoy}
        ventasCompHoy={ventasCompHoy}
        pedidosHoy={ventasHoyList.length}
        pedidosAyer={ventasAyerList.length}
        ticketHoy={ticketHoy}
        ticketComp={ticketComp}
        stockBajo={stats?.stockBajo ?? 0}
      />

      <AccesosRapidos porDespachar={porDespachar} />

      <PedidosRecientes recientes={recientes} />
    </div>
  )
}

function KpiGrid({ totalHoy, ventasCompHoy, pedidosHoy, pedidosAyer, ticketHoy, ticketComp, stockBajo }: {
  totalHoy: number
  ventasCompHoy: number | null
  pedidosHoy: number
  pedidosAyer: number
  ticketHoy: number
  ticketComp: number | null
  stockBajo: number
}) {
  return (
    <motion.div variants={stagger.container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
      <KpiCard titulo="Ventas de hoy" valor={formatPrice(totalHoy)} badge={badgePct(ventasCompHoy)} />
      <KpiCard titulo="Pedidos de hoy" valor={String(pedidosHoy)} badge={badgeDelta(pedidosHoy, pedidosAyer)} />
      <KpiCard titulo="Ticket promedio" valor={formatPrice(ticketHoy)} badge={badgePct(ticketComp)} />
      <KpiCard titulo="Por agotarse" valor={String(stockBajo)}
        extra={<Link to="/admin/productos" className="text-xs font-bold w-fit" style={{ color: 'var(--hc-accent)' }}><TextoFlecha>Revisalos</TextoFlecha></Link>} />
    </motion.div>
  )
}

function KpiCard({ titulo, valor, badge, extra }: {
  titulo: string
  valor: string
  badge?: ReactNode
  extra?: ReactNode
}) {
  return (
    <motion.div variants={stagger.item} className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ backgroundColor: 'var(--hc-surface)', boxShadow: '0 1px 2px rgba(26,26,26,0.04), 0 8px 20px rgba(26,26,26,0.06)' }}>
      <span className="text-xs font-semibold" style={{ color: 'var(--hc-muted)' }}>{titulo}</span>
      <div className="text-2xl sm:text-[28px] leading-none"
        style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: 'var(--hc-text)' }}>
        {valor}
      </div>
      {badge}
      {extra}
    </motion.div>
  )
}

function badgePct(pct: number | null) {
  if (pct == null) return null
  const ok = pct >= 0
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full w-fit"
      style={{ backgroundColor: ok ? '#e2f1e8' : 'var(--hc-surface-2)', color: ok ? '#1E7F4F' : 'var(--hc-muted)' }}>
      {ok ? '+' : '−'}{Math.abs(pct)}% vs ayer
    </span>
  )
}

function badgeDelta(hoy: number, ayer: number) {
  if (hoy === ayer) return null
  const ok = hoy >= ayer
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full w-fit"
      style={{ backgroundColor: ok ? '#e2f1e8' : 'var(--hc-surface-2)', color: ok ? '#1E7F4F' : 'var(--hc-muted)' }}>
      {ok ? '+' : '−'}{Math.abs(hoy - ayer)} vs ayer
    </span>
  )
}

function AccesosRapidos({ porDespachar }: { porDespachar: number }) {
  const planNombre = useTenantStore((s) => s.planNombre)
  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-md">
        <BotonesAgregarProducto baseNuevo={rutaNuevoProductoSeller(planNombre)} />
      </div>
      <div className="flex flex-wrap gap-3">
      <Link to="/admin/pedidos"
        className="flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold transition-colors"
        style={{ backgroundColor: 'var(--hc-surface)', color: 'var(--hc-accent)', border: '1px solid var(--hc-border)' }}>
        Mirá los pedidos
        {porDespachar > 0 && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(23,71,168,0.1)' }}>
            {porDespachar} por despachar
          </span>
        )}
      </Link>
      <Link to="/admin/pos"
        className="flex items-center justify-center px-5 py-3.5 rounded-xl text-sm font-semibold transition-colors"
        style={{ backgroundColor: 'var(--hc-surface)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}>
        Abrí la caja (POS)
      </Link>
      <AccesoTiendaPublica />
      <Link to="/admin/billing/planes"
        className="flex items-center justify-center px-5 py-3.5 rounded-xl text-sm font-semibold transition-colors"
        style={{ backgroundColor: 'var(--hc-surface)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}>
        Tu plan
      </Link>
      </div>
    </div>
  )
}

function PedidosRecientes({ recientes }: { recientes: VentaInicio[] }) {
  return (
    <section className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: 'var(--hc-surface)', boxShadow: '0 1px 2px rgba(26,26,26,0.04), 0 8px 20px rgba(26,26,26,0.06)' }}>
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--hc-text)' }}>Pedidos recientes</h2>
        <Link to="/admin/pedidos" className="text-sm font-semibold" style={{ color: 'var(--hc-accent)' }}><TextoFlecha>Vé todos</TextoFlecha></Link>
      </div>
      {recientes.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--hc-muted)' }}>Todavía no tenés pedidos.</p>
      ) : recientes.map((v) => (
        <div key={v.id} className="flex items-center gap-4 px-5 py-3.5" style={{ borderTop: '1px solid var(--hc-border)' }}>
          <span className="text-sm font-semibold w-16 shrink-0" style={{ color: 'var(--hc-text)' }}>#{v.id}</span>
          <span className="text-sm flex-1 truncate" style={{ color: 'var(--hc-text)' }}>
            {v.nombreCliente ?? v.cliente?.nombre ?? 'Cliente'} · {timeAgo(v.fechaCreacion)}
          </span>
          <span className="text-sm font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--hc-text)' }}>{formatPrice(v.total ?? 0)}</span>
          <EstadoBadge estado={v.estado} />
        </div>
      ))}
    </section>
  )
}
