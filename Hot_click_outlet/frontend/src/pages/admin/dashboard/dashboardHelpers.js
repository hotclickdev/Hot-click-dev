import { formatPrice } from '@/utils/format'

/** Roles that see the first-run setup banner. */
export const ROLES_NEGOCIO = new Set(['EMPRENDEDOR'])

/** localStorage key for dismissing the setup banner. */
export const SETUP_KEY = 'hotclick-setup-dismissed'

/** Health poll interval for ADMIN users. */
export const HEALTH_POLL_MS = 30_000

export const stagger = {
  container: { show: { transition: { staggerChildren: 0.07 } } },
  item: { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } },
}

/** @param {string} [badge] */
export function badgeStyle(badge) {
  if (!badge) return 'bg-white/10 text-[#8e8e9a]'
  const b = badge.toUpperCase()
  if (b === 'COMPLETADO' || b === 'ENTREGADO') return 'bg-emerald-500/15 text-emerald-400'
  if (b === 'PENDIENTE') return 'bg-amber-500/15 text-amber-400'
  if (b === 'PAGADO') return 'bg-[#4f7cff]/15 text-[#4f7cff]'
  if (b === 'REGISTRO') return 'bg-[var(--hc-blue-500)]/15 text-[var(--hc-blue-400)]'
  if (b === 'CANCELADO') return 'bg-red-500/15 text-red-400'
  return 'bg-white/10 text-[#8e8e9a]'
}

/**
 * @param {object[]} ventas
 * @returns {{ label: string, total: number }[]}
 */
export function buildSalesLast7(ventas) {
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
}

/**
 * @param {object[]} ventas
 * @returns {[string, number][]}
 */
export function buildByMethod(ventas) {
  const map = {}
  ventas.forEach((v) => {
    const m = v.metodoPago ?? 'OTRO'
    map[m] = (map[m] ?? 0) + 1
  })
  return Object.entries(map).sort((a, b) => b[1] - a[1])
}

/**
 * @param {object[]} ventas
 * @param {object[]} users
 */
export function buildActivity(ventas, users) {
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
}
