import { DIAS_GARANTIA, MS_POR_DIA } from '../pedidos/pedidoHelpers'
import type { PedidoCliente, ItemPedidoCliente } from '../pedidos/pedidoHelpers'

export const MAX_PEDIDOS_RECIENTES = 3
export const MAX_RESENAS = 3
export const ESTADOS_VALIDOS_RESENA = new Set([
  'PAGADO', 'EN_PREPARACION', 'ENVIADO', 'ENTREGADO', 'LISTO_RETIRO',
])
export const RATING_LABELS: Record<number, string> = {
  1: 'Muy malo', 2: 'Malo', 3: 'Regular', 4: 'Bueno', 5: 'Excelente',
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  EMPRENDEDOR: 'Emprendedor',
  USUARIO_FINAL: 'Cliente',
}

export type ProductoElegibleResena = {
  id: number
  nombre: string
}

export type TestimonioUsuario = {
  tipo?: string
  productoId?: number
}

export function garantiaDias(fechaPedido: string | Date | null | undefined): number | null {
  if (!fechaPedido) return null
  const limite = new Date(fechaPedido)
  limite.setDate(limite.getDate() + DIAS_GARANTIA)
  return Math.ceil((limite.getTime() - Date.now()) / MS_POR_DIA)
}

export function primerProducto(order: PedidoCliente): string {
  const items = order.items ?? []
  if (items.length === 0) return 'Sin productos'
  const nombre = items[0].nombreProducto ?? items[0].producto?.nombreProducto ?? 'Producto'
  return items.length > 1 ? `${nombre} +${items.length - 1}` : nombre
}

export function roleLabel(role?: string | null): string | null | undefined {
  if (role == null) return role
  return ROLE_LABELS[role] ?? role
}

function esPedidoCliente(value: unknown): value is PedidoCliente {
  return typeof value === 'object' && value !== null
}

export function listaPedidosDesdeRespuesta(data: unknown): PedidoCliente[] {
  if (Array.isArray(data)) return data.filter(esPedidoCliente)
  if (data && typeof data === 'object' && 'content' in data) {
    const content = (data as { content: unknown }).content
    return Array.isArray(content) ? content.filter(esPedidoCliente) : []
  }
  return []
}

export function productosElegiblesParaResena(orders: PedidoCliente[]): ProductoElegibleResena[] {
  return orders
    .filter((o) => ESTADOS_VALIDOS_RESENA.has(o.estadoPedido ?? ''))
    .flatMap((o) => o.items ?? [])
    .reduce<ProductoElegibleResena[]>((acc, item: ItemPedidoCliente) => {
      const id = item.productoId ?? item.producto?.id
      const nombre = item.nombreProducto ?? item.producto?.nombreProducto ?? 'Producto'
      if (id && !acc.find((p) => p.id === id)) acc.push({ id, nombre })
      return acc
    }, [])
}

function esTestimonioUsuario(value: unknown): value is TestimonioUsuario {
  return typeof value === 'object' && value !== null
}

export function listaTestimoniosDesdeRespuesta(data: unknown): TestimonioUsuario[] {
  if (!Array.isArray(data)) return []
  return data.filter(esTestimonioUsuario)
}

export function conteoResenasPorProducto(testimonios: TestimonioUsuario[]): Record<number, number> {
  return testimonios.reduce<Record<number, number>>((mapa, r) => {
    if (r.tipo === 'RESENA' && r.productoId) {
      mapa[r.productoId] = (mapa[r.productoId] ?? 0) + 1
    }
    return mapa
  }, {})
}

export function mensajeErrorApi(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const data = (err as { response?: { data?: { message?: unknown } } }).response?.data
    const message = data && typeof data === 'object' && 'message' in data
      ? (data as { message: unknown }).message
      : undefined
    if (typeof message === 'string') return message
  }
  return undefined
}

export function textoCampoApi(data: unknown, campo: string): string | undefined {
  if (!data || typeof data !== 'object' || !(campo in data)) return undefined
  const valor = (data as Record<string, unknown>)[campo]
  return typeof valor === 'string' ? valor : undefined
}

export function flagCampoApi(data: unknown, campo: string): boolean | undefined {
  if (!data || typeof data !== 'object' || !(campo in data)) return undefined
  const valor = (data as Record<string, unknown>)[campo]
  return typeof valor === 'boolean' ? valor : undefined
}
