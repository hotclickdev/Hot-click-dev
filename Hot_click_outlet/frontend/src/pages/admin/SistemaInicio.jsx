import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Spinner from '@/components/ui/Spinner'
import { adminService, ventaService } from '@/services/orderService'
import { formatPrice } from '@/utils/format'
import useAuthStore from '@/store/authStore'

const ESTADOS_COMPLETADOS = new Set(['COMPLETADO', 'ENTREGADO'])

const stagger = {
  container: { show: { transition: { staggerChildren: 0.07 } } },
  item: { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs} h`
  return `hace ${Math.floor(hrs / 24)} d`
}

function isoDay(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() - offsetDays)
  return d.toISOString().slice(0, 10)
}

const ESTADO_STYLE = {
  PENDIENTE:  { bg: '#f7ead2', color: '#8a5a00' },
  PAGADO:     { bg: 'rgba(23,71,168,0.08)', color: 'var(--hc-accent)' },
  COMPLETADO: { bg: '#e2f1e8', color: '#1E7F4F' },
  ENTREGADO:  { bg: '#e2f1e8', color: '#1E7F4F' },
  CANCELADO:  { bg: '#fbe4e2', color: '#a8291f' },
}

function EstadoBadge({ estado }) {
  const s = ESTADO_STYLE[estado] ?? { bg: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ backgroundColor: s.bg, color: s.color }}>
      {estado ?? '—'}
    </span>
  )
}

export default function SistemaInicio() {
  const userName    = useAuthStore((s) => s.userName)
  const empresaNombre = useAuthStore((s) => s.empresaNombre)
  const [stats, setStats]   = useState(null)
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

  const hoy   = isoDay(0)
  const ayer  = isoDay(1)

  const ventasHoyList  = useMemo(() => ventas.filter(v => (v.fechaCreacion ?? '').startsWith(hoy)), [ventas, hoy])
  const ventasAyerList = useMemo(() => ventas.filter(v => (v.fechaCreacion ?? '').startsWith(ayer)), [ventas, ayer])

  const totalHoy  = ventasHoyList.filter(v => ESTADOS_COMPLETADOS.has(v.estado)).reduce((s, v) => s + (v.total ?? 0), 0)
  const totalAyer = ventasAyerList.filter(v => ESTADOS_COMPLETADOS.has(v.estado)).reduce((s, v) => s + (v.total ?? 0), 0)
  const ventasCompHoy = totalAyer > 0 ? Math.round(((totalHoy - totalAyer) / totalAyer) * 100) : null

  const pedidosHoy  = ventasHoyList.length
  const pedidosAyer = ventasAyerList.length

  const ticketHoy  = ventasHoyList.length > 0 ? Math.round(totalHoy / ventasHoyList.length) : 0
  const ticketAyer = ventasAyerList.length > 0 ? Math.round(totalAyer / ventasAyerList.length) : 0
  const ticketComp = ticketAyer > 0 ? Math.round(((ticketHoy - ticketAyer) / ticketAyer) * 100) : null

  const pendientes = ventas.filter(v => v.estado === 'PENDIENTE').length

  const recientes = useMemo(
    () => [...ventas].sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion)).slice(0, 4),
    [ventas]
  )

  const fechaHoyLegible = new Date().toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' })

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  }

  return (
    <div className="space-y-6">
      {/* Saludo */}
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--hc-text)' }}>
          Hola, {userName?.split(' ')[0] ?? 'de nuevo'}
        </h1>
        <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
          Así va {empresaNombre ?? 'tu negocio'} hoy, {fechaHoyLegible}.
        </p>
      </header>

      {/* KPI cards */}
      <motion.div variants={stagger.container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <motion.div variants={stagger.item} className="rounded-2xl p-5 flex flex-col gap-3" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: '0 1px 2px rgba(26,26,26,0.04), 0 8px 20px rgba(26,26,26,0.06)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: 'var(--hc-muted)' }}>Ventas de hoy</span>
            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{ backgroundColor: 'rgba(23,71,168,0.08)', color: 'var(--hc-accent)' }}>₡</span>
          </div>
          <div className="text-2xl sm:text-[28px] leading-none" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: 'var(--hc-text)' }}>
            {formatPrice(totalHoy)}
          </div>
          {ventasCompHoy !== null && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full w-fit" style={{ backgroundColor: ventasCompHoy >= 0 ? '#e2f1e8' : 'var(--hc-surface-2)', color: ventasCompHoy >= 0 ? '#1E7F4F' : 'var(--hc-muted)' }}>
              {ventasCompHoy >= 0 ? '▲' : '▼'} {Math.abs(ventasCompHoy)}% vs ayer
            </span>
          )}
        </motion.div>

        <motion.div variants={stagger.item} className="rounded-2xl p-5 flex flex-col gap-3" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: '0 1px 2px rgba(26,26,26,0.04), 0 8px 20px rgba(26,26,26,0.06)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: 'var(--hc-muted)' }}>Pedidos de hoy</span>
            <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(23,71,168,0.08)' }}>
              <span className="w-3 h-3 rounded-sm border-2" style={{ borderColor: 'var(--hc-accent)' }} />
            </span>
          </div>
          <div className="text-2xl sm:text-[28px] leading-none" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: 'var(--hc-text)' }}>
            {pedidosHoy}
          </div>
          {pedidosHoy !== pedidosAyer && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full w-fit" style={{ backgroundColor: pedidosHoy >= pedidosAyer ? '#e2f1e8' : 'var(--hc-surface-2)', color: pedidosHoy >= pedidosAyer ? '#1E7F4F' : 'var(--hc-muted)' }}>
              {pedidosHoy >= pedidosAyer ? '▲' : '▼'} {Math.abs(pedidosHoy - pedidosAyer)} vs ayer
            </span>
          )}
        </motion.div>

        <motion.div variants={stagger.item} className="rounded-2xl p-5 flex flex-col gap-3" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: '0 1px 2px rgba(26,26,26,0.04), 0 8px 20px rgba(26,26,26,0.06)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: 'var(--hc-muted)' }}>Ticket promedio</span>
            <span className="w-8 h-8 rounded-lg flex items-center justify-center gap-0.5" style={{ backgroundColor: 'rgba(23,71,168,0.08)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--hc-accent)" strokeWidth={2.5}><line x1="6" y1="18" x2="6" y2="12"/><line x1="12" y1="18" x2="12" y2="8"/><line x1="18" y1="18" x2="18" y2="14"/></svg>
            </span>
          </div>
          <div className="text-2xl sm:text-[28px] leading-none" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: 'var(--hc-text)' }}>
            {formatPrice(ticketHoy)}
          </div>
          {ticketComp !== null && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full w-fit" style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}>
              {ticketComp >= 0 ? '▲' : '▼'} {Math.abs(ticketComp)}% vs ayer
            </span>
          )}
        </motion.div>

        <motion.div variants={stagger.item} className="rounded-2xl p-5 flex flex-col gap-3" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: '0 1px 2px rgba(26,26,26,0.04), 0 8px 20px rgba(26,26,26,0.06)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: 'var(--hc-muted)' }}>Por agotarse</span>
            <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f7ead2' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#8a5a00' }} />
            </span>
          </div>
          <div className="text-2xl sm:text-[28px] leading-none" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', color: 'var(--hc-text)' }}>
            {stats?.stockBajo ?? 0}
          </div>
          <Link to="/admin/productos" className="text-xs font-bold w-fit" style={{ color: 'var(--hc-accent)' }}>Revisalos →</Link>
        </motion.div>
      </motion.div>

      {/* Accesos rápidos */}
      <div className="flex flex-wrap gap-3">
        <Link to="/admin/nuevo-producto"
          className="flex items-center justify-center px-5 py-3.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}>
          + Agregá un producto
        </Link>
        <Link to="/admin/pedidos"
          className="flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold transition-colors"
          style={{ backgroundColor: 'var(--hc-surface)', color: 'var(--hc-accent)', border: '1px solid var(--hc-border)' }}>
          Mirá los pedidos
          {pendientes > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(23,71,168,0.1)' }}>{pendientes} pendientes</span>
          )}
        </Link>
        <Link to="/admin/pos"
          className="flex items-center justify-center px-5 py-3.5 rounded-xl text-sm font-semibold transition-colors"
          style={{ backgroundColor: 'var(--hc-surface)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}>
          Abrí la caja (POS)
        </Link>
      </div>

      {/* Pedidos recientes */}
      <section className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: '0 1px 2px rgba(26,26,26,0.04), 0 8px 20px rgba(26,26,26,0.06)' }}>
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--hc-text)' }}>Pedidos recientes</h2>
          <Link to="/admin/pedidos" className="text-sm font-semibold" style={{ color: 'var(--hc-accent)' }}>Vé todos →</Link>
        </div>
        {recientes.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--hc-muted)' }}>Todavía no tenés pedidos.</p>
        ) : (
          recientes.map((v) => (
            <div key={v.id} className="flex items-center gap-4 px-5 py-3.5" style={{ borderTop: '1px solid var(--hc-border)' }}>
              <span className="text-sm font-semibold w-16 shrink-0" style={{ color: 'var(--hc-text)' }}>#{v.id}</span>
              <span className="text-sm flex-1 truncate" style={{ color: 'var(--hc-text)' }}>
                {v.nombreCliente ?? v.cliente?.nombre ?? 'Cliente'} · {timeAgo(v.fechaCreacion)}
              </span>
              <span className="text-sm font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--hc-text)' }}>{formatPrice(v.total ?? 0)}</span>
              <EstadoBadge estado={v.estado} />
            </div>
          ))
        )}
      </section>
    </div>
  )
}
