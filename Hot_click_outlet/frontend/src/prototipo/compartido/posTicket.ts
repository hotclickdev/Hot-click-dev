import { PRODUCTOS } from './mock'

export type LineaTicket = {
  nombre: string
  qty: number
  subtotal: number
}

export function resumenTicket(cantidades: Record<string, number>): {
  items: number
  total: number
  lineas: LineaTicket[]
} {
  const lineas = PRODUCTOS
    .filter((item) => (cantidades[item.id] ?? 0) > 0)
    .map((item) => {
      const qty = cantidades[item.id]
      return { nombre: item.nombre, qty, subtotal: item.precio * qty }
    })
  const items = lineas.reduce((acc, linea) => acc + linea.qty, 0)
  const total = lineas.reduce((acc, linea) => acc + linea.subtotal, 0)
  return { items, total, lineas }
}
