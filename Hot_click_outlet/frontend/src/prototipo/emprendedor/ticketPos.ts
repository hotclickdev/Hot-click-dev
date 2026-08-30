import type { LineaTicket } from './types'

const TICKET_INICIAL: LineaTicket[] = [
  { id: 'x200', nombre: 'Auriculares Bluetooth X200', precio: 18500, cantidad: 2 },
  { id: 'oversize', nombre: 'Camiseta Oversize Negra', precio: 9900, cantidad: 1 },
]

let lineas: LineaTicket[] = TICKET_INICIAL.map((linea) => ({ ...linea }))

export function leerTicket(): LineaTicket[] {
  return lineas.map((linea) => ({ ...linea }))
}

export function totalTicket(items = lineas): number {
  return items.reduce((suma, linea) => suma + linea.precio * linea.cantidad, 0)
}

export function cantidadTicket(items = lineas): number {
  return items.reduce((suma, linea) => suma + linea.cantidad, 0)
}

export function agregarAlTicket(linea: Omit<LineaTicket, 'cantidad'>): LineaTicket[] {
  const existente = lineas.find((item) => item.id === linea.id)
  if (existente) existente.cantidad += 1
  else lineas = [...lineas, { ...linea, cantidad: 1 }]
  return leerTicket()
}

export function vaciarTicket(): void {
  lineas = []
}

export function restaurarTicketDemo(): void {
  lineas = TICKET_INICIAL.map((linea) => ({ ...linea }))
}
