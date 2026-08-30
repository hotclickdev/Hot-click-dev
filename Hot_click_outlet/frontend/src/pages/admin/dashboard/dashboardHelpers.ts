import type { Variants } from 'framer-motion'
import { formatPrice } from '@/utils/format'
import { isoDay } from '../sistema-inicio/sistemaInicioHelpers'

/** Roles that see the first-run setup banner. */
export const ROLES_NEGOCIO = new Set<string>(['EMPRENDEDOR'])

/** localStorage key for dismissing the setup banner. */
export const SETUP_KEY = 'hotclick-setup-dismissed'

/** Health poll interval for ADMIN users. */
export const HEALTH_POLL_MS = 30_000

/** Tarjeta clara del dashboard (Figma Super Admin). */
export const CLASE_TARJETA_DASH = 'bg-[var(--hc-surface)] border border-[var(--hc-border)] rounded-2xl'

export const stagger: { container: Variants; item: Variants } = {
  container: { show: { transition: { staggerChildren: 0.07 } } },
  item: { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
}

/** Resumen de venta/pedido que consume el dashboard admin. */
export type VentaDashboard = {
  id?: number | string
  estado?: string
  total?: number
  fechaCreacion?: string
  metodoPago?: string
  origen?: string
  nombreCliente?: string
  cliente?: { nombre?: string }
}

/** Usuario listado en el feed de actividad (ADMIN). */
export type UsuarioDashboard = {
  id?: number | string
  nombre?: string
  email?: string
  fechaCreacion?: string
  createdAt?: string
}

export type CategoriaConteo = {
  nombre: string
  cantidad?: number
}

/** Métricas de GET /admin/dashboard. Campos opcionales: el catch original devolvía `{}`. */
export type DashboardStats = {
  totalUsuarios?: number
  totalProductos?: number
  totalPedidos?: number
  totalVentas?: number
  pedidosPendientes?: number
  usuariosPendientes?: number
  stockBajo?: number
  categorias?: CategoriaConteo[]
}

export type SalesDay = {
  label: string
  total: number
}

export type ActivityItem = {
  type: string
  id: string
  title: string
  desc: string
  date: string
  badge?: string
}

type ActivityDraft = Omit<ActivityItem, 'date'> & { date?: string }

export function badgeStyle(badge?: string) {
  if (!badge) return 'bg-[var(--hc-surface-2)] text-[var(--hc-muted)]'
  const b = badge.toUpperCase()
  if (b === 'COMPLETADO' || b === 'ENTREGADO') return 'bg-emerald-500/15 text-emerald-700'
  if (b === 'PENDIENTE') return 'bg-amber-500/15 text-amber-700'
  if (b === 'PAGADO') return 'bg-[var(--hc-link)]/15 text-[var(--hc-link)]'
  if (b === 'REGISTRO') return 'bg-[var(--hc-blue-500)]/15 text-[var(--hc-link)]'
  if (b === 'CANCELADO') return 'bg-red-500/15 text-red-600'
  return 'bg-[var(--hc-surface-2)] text-[var(--hc-muted)]'
}

export function buildSalesLast7(ventas: VentaDashboard[]): SalesDay[] {
  const days: SalesDay[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = isoDay(i)
    const label = d.toLocaleDateString('es-CR', { weekday: 'short' })
    const total = ventas
      .filter((v) => (v.fechaCreacion ?? '').startsWith(key) && (v.estado === 'COMPLETADO' || v.estado === 'ENTREGADO'))
      .reduce((s, v) => s + (v.total ?? 0), 0)
    days.push({ label, total })
  }
  return days
}

export function buildByMethod(ventas: VentaDashboard[]): [string, number][] {
  const map: Record<string, number> = {}
  ventas.forEach((v) => {
    const m = v.metodoPago ?? 'OTRO'
    map[m] = (map[m] ?? 0) + 1
  })
  return Object.entries(map).sort((a, b) => b[1] - a[1])
}

function tieneFecha(item: ActivityDraft): item is ActivityItem {
  return Boolean(item.date)
}

export function buildActivity(ventas: VentaDashboard[], users: UsuarioDashboard[]): ActivityItem[] {
  const items: ActivityDraft[] = []
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
    .filter(tieneFecha)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)
}
