import { isoDay } from '@/pages/admin/sistema-inicio/sistemaInicioHelpers'
import { quedanPocos } from '@/utils/stockEscaso'

/** Día civil local de una fecha ISO o parseable. Vacío si no se puede leer. */
export function diaCivilLocal(fecha: string): string {
  if (!fecha.trim()) return ''
  const leida = new Date(fecha)
  if (Number.isNaN(leida.getTime())) return fecha.length >= 10 ? fecha.slice(0, 10) : ''
  const yyyy = leida.getFullYear()
  const mm = String(leida.getMonth() + 1).padStart(2, '0')
  const dd = String(leida.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/** Pedidos creados hoy (día civil de Costa Rica, no UTC). */
export function contarPedidosHoy(
  pedidos: ReadonlyArray<{ fecha: string }>,
  diaIso = isoDay(),
): number {
  return pedidos.filter((pedido) => diaCivilLocal(pedido.fecha) === diaIso).length
}

/** Productos publicados con 1 a 5 unidades (misma regla que la ficha). */
export function contarStockBajo(
  productos: ReadonlyArray<{ stock: number; estado?: string }>,
): number {
  return productos.filter((p) => p.estado !== 'Pausado' && quedanPocos(p.stock)).length
}
