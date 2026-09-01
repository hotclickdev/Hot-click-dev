import type { Id } from '@/types/api'

export type DenominacionPos = {
  v: number
  label: string
  color: string
  bg: string
}

export const DENOM: DenominacionPos[] = [
  { v: 50000, label: '₡50.000', color: '#c0392b', bg: 'rgba(192,57,43,0.15)' },
  { v: 20000, label: '₡20.000', color: '#27ae60', bg: 'rgba(39,174,96,0.15)'  },
  { v: 10000, label: '₡10.000', color: '#e67e22', bg: 'rgba(230,126,34,0.15)' },
  { v:  5000, label: '₡5.000',  color: '#2980b9', bg: 'rgba(41,128,185,0.15)' },
  { v:  2000, label: '₡2.000',  color: '#8e44ad', bg: 'rgba(142,68,173,0.15)' },
  { v:  1000, label: '₡1.000',  color: '#795548', bg: 'rgba(121,85,72,0.15)'  },
  { v:   500, label: '₡500',    color: '#9e9e9e', bg: 'rgba(158,158,158,0.15)'},
  { v:   100, label: '₡100',    color: '#ffc107', bg: 'rgba(255,193,7,0.15)'  },
  { v:    50, label: '₡50',     color: '#ffc107', bg: 'rgba(255,193,7,0.12)'  },
]

export const METODOS = [
  { id: 'EFECTIVO', label: 'Efectivo',    iconId: 'efectivo', color: '#34d399', desc: 'Pago en mano' },
  { id: 'SINPE',    label: 'SINPE Móvil', iconId: 'sinpe',    color: '#6490EA', desc: 'Al número del negocio' },
  { id: 'TARJETA',  label: 'Tarjeta',     iconId: 'tarjeta',  color: '#7aa3ff', desc: 'QR a la pasarela' },
]

export type PosStep = 'loading' | 'apertura' | 'venta' | 'cobro' | 'qr' | 'recibo'

export type ItemCarritoPos = {
  id: Id | undefined
  nombre: string | undefined
  imagen: string | null
  precio: number | undefined
  precioOriginal: number | undefined
  stockActual: number
  cantidad: number
}

/** Producto que entra al carrito POS (API cruda o `Producto` normalizado). */
export type ProductoEntradaCarrito = {
  id?: Id
  idProducto?: Id
  nombreProducto?: string
  nombre?: string
  imagenPrincipalUrl?: string | null
  precioEfectivo?: number
  precioVenta?: number
  stockActual?: number
}

export type ClientePos = {
  id: Id
  nombre?: string
  correo?: string
  apellidoPaterno?: string
  telefono?: string
  segmento?: string
  puntosFidelidad?: number
}

export type ClienteSeleccionadoPos = {
  id: Id
  nombre: string
} | null

export type PosTurno = {
  id?: Id
  montoInicial?: number
  totalEfectivo?: number
  totalSinpe?: number
  totalTarjeta?: number
  totalTransferencia?: number
  numTransacciones?: number
  data?: PosTurno | null
}

export type PosCierre = {
  diferencia?: number
  montoDeclarado?: number
  data?: PosCierre
}

export type PosQrData = {
  token: string
  metodoPago: string
  total: number
  sinpeNumero: string
}

function registroQr(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null
  const obj = data as Record<string, unknown>
  if (typeof obj.token === 'string' && obj.token) return obj
  const inner = obj.data
  if (inner && typeof inner === 'object') {
    const nested = inner as Record<string, unknown>
    if (typeof nested.token === 'string' && nested.token) return nested
  }
  return null
}

/**
 * El interceptor de Axios suele unwrappear ResponseDTO; si no, el token viene en data.data.
 */
export function qrDataDesdeRespuesta(data: unknown, totalFallback: number): PosQrData | null {
  const inner = registroQr(data)
  if (!inner) return null
  const totalRaw = inner.total
  const total = typeof totalRaw === 'number' ? totalRaw : totalFallback
  return {
    token: inner.token as string,
    metodoPago: typeof inner.metodoPago === 'string' ? inner.metodoPago : 'TARJETA',
    total,
    sinpeNumero: typeof inner.sinpeNumero === 'string' ? inner.sinpeNumero : '',
  }
}

export function enlacePagoPosQr(token: string) {
  return `${globalThis.location.origin}/pos/pago/${token}`
}

export type PosVentaItem = {
  producto?: { nombreProducto?: string }
  nombre?: string
  cantidad?: number
  subtotalItem?: number
}

export type PosVenta = {
  id?: Id
  numeroPedido?: string
  fechaPedido?: string
  metodoPago?: string
  totalPedido?: number
  descuentoTotal?: number
  items?: PosVentaItem[]
  usuarioFinal?: { id?: number; nombre?: string }
  data?: PosVenta[] | PosVenta
}

export type PayloadCobroPos = {
  metodoPago: string
  montoRecibido: number | null
}

type AxiosErrorBody = {
  response?: { data?: { message?: unknown; error?: unknown }; status?: number }
}

/**
 * Formatea un monto POS sin prefijo ₡ (para inputs y plantillas que ya ponen ₡).
 */
export function formatMontoPos(n: number | null | undefined) {
  return new Intl.NumberFormat('es-CR').format(Math.round(n ?? 0))
}

/** Exacto primero, luego billetes redondeados hacia arriba (máx. 4 extra). */
export function sugerirMontos(total: number) {
  const exacto = Math.round(total)
  const bases = [1000, 2000, 5000, 10000, 20000, 50000]
  const out: number[] = [exacto]
  for (const b of bases) {
    const s = Math.ceil(exacto / b) * b
    if (s >= exacto && !out.includes(s) && out.length < 5) out.push(s)
  }
  return out
}

export function descomponer(monto: number) {
  const r: (DenominacionPos & { q: number })[] = []; let rest = Math.round(monto)
  for (const d of DENOM) {
    if (rest >= d.v) { const q = Math.floor(rest / d.v); r.push({ ...d, q }); rest -= q * d.v }
  }
  return r
}

/**
 * Agrega un producto al carrito POS o incrementa cantidad si ya está.
 */
export function agregarProductoAlCarrito(prev: ItemCarritoPos[], producto: ProductoEntradaCarrito): ItemCarritoPos[] {
  const id = producto.id ?? producto.idProducto
  const ex = prev.find(i => i.id === id)
  if (ex) return prev.map(i => i.id === id ? { ...i, cantidad: i.cantidad + 1 } : i)
  return [...prev, {
    id,
    nombre:        producto.nombreProducto ?? producto.nombre,
    imagen:        producto.imagenPrincipalUrl ?? null,
    precio:        producto.precioEfectivo ?? producto.precioVenta,
    precioOriginal: producto.precioEfectivo ?? producto.precioVenta,
    stockActual:   producto.stockActual ?? 0,
    cantidad:      1,
  }]
}

export function mensajeErrorPos(err: unknown, fallback = ''): string {
  if (!err || typeof err !== 'object') return fallback
  const body = (err as AxiosErrorBody).response?.data
  const message = body?.message
  if (typeof message === 'string' && message) return message
  const error = body?.error
  if (typeof error === 'string' && error) return error
  return fallback
}

export function statusErrorPos(err: unknown): number | undefined {
  if (!err || typeof err !== 'object' || !('response' in err)) return undefined
  return (err as AxiosErrorBody).response?.status
}
