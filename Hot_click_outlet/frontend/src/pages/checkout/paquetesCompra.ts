import type { ProductoRelacion } from '@/types/producto'
import type { CuponCarrito } from '@/types/carrito'

/** Métodos de envío que entiende `OrderPricingService.calcularCostoEnvio`. */
export const ENVIO = {
  RETIRO: 'RETIRO_EN_TIENDA',
  ENCOMIENDA: 'ENCOMIENDA_PROPIA',
  NORMAL_GAM: 'ENVIO_NORMAL_GAM',
  NORMAL_FUERA_GAM: 'ENVIO_NORMAL_FUERA_GAM',
  RAPIDO: 'ENVIO_RAPIDO',
} as const

/** Mismos montos que el backend; la encomienda se paga al retirar y aquí vale 0. */
export const COSTO_ENVIO: Record<string, number> = {
  [ENVIO.RETIRO]: 0,
  [ENVIO.ENCOMIENDA]: 0,
  [ENVIO.NORMAL_GAM]: 4000,
  [ENVIO.NORMAL_FUERA_GAM]: 4000,
  [ENVIO.RAPIDO]: 5000,
}

const PROVINCIAS_GAM = new Set(['san jose', 'heredia', 'alajuela', 'cartago'])
const CLAVE_SIN_NEGOCIO = 'sin-negocio'

export type ItemPaquete = {
  id?: unknown
  cantidad?: number
  precio?: number
  precioVenta?: number
  empresaId?: number | null
  empresaNombre?: string | null
  bodegaId?: unknown
  bodegaPermiteRetiro?: boolean
  bodegaDireccion?: string
  bodega?: ProductoRelacion
}

export type RetiroPaquete = {
  bodegaId: number
  direccion: string
  horario: string | null
}

export type PaqueteCompra<T extends ItemPaquete = ItemPaquete> = {
  clave: string
  numero: number
  empresaId: number | null
  nombre: string
  provincia: string | null
  items: T[]
  cantidadProductos: number
  subtotal: number
  retiro: RetiroPaquete | null
  fueraGam: boolean
}

/** Los textos salen de `compra.envio.<metodo>` en i18n; el retiro agrega su dirección y horario. */
export type OpcionEntrega = {
  metodo: string
  /** `null` = el monto varía y se paga al retirar (encomienda). */
  precio: number | null
  requiereDireccion: boolean
  retiro?: RetiroPaquete
}

export type GiftCardAplicada = {
  codigo: string
  saldo: number
  empresaId: number | null
}

export type PaqueteEntregaPayload = {
  empresaId: number
  metodoEnvio: string
  bodegaId?: number
}

function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}

function precioItem(item: ItemPaquete): number {
  return (item.precio ?? item.precioVenta ?? 0) * (item.cantidad ?? 0)
}

function claveDe(item: ItemPaquete): string {
  if (item.empresaId != null) return `empresa-${item.empresaId}`
  const empresaBodega = item.bodega?.empresaId
  return empresaBodega == null ? CLAVE_SIN_NEGOCIO : `empresa-${empresaBodega}`
}

function empresaIdDe(item: ItemPaquete): number | null {
  return item.empresaId ?? item.bodega?.empresaId ?? null
}

/** Si el carrito ya tiene un paquete del negocio de `item` (entonces no suma otro envío). */
export function tienePaqueteDe(items: ItemPaquete[], item: ItemPaquete): boolean {
  const clave = claveDe(item)
  return items.some((i) => claveDe(i) === clave)
}

function horarioDe(bodega: ProductoRelacion | undefined): string | null {
  if (!bodega?.horarioApertura || !bodega.horarioCierre) return null
  return `${bodega.horarioApertura.slice(0, 5)} a ${bodega.horarioCierre.slice(0, 5)}`
}

function retiroDe(items: ItemPaquete[]): RetiroPaquete | null {
  const bodegas = new Set(items.map((i) => i.bodegaId ?? i.bodega?.id))
  const primero = items[0]
  const bodegaId = Number(primero?.bodegaId ?? primero?.bodega?.id)
  if (bodegas.size !== 1 || !Number.isFinite(bodegaId)) return null
  if (!items.every((i) => i.bodegaPermiteRetiro ?? i.bodega?.permiteRetiroCliente)) return null
  const direccion = [primero.bodega?.canton, primero.bodegaDireccion ?? primero.bodega?.direccionExacta]
    .filter(Boolean)
    .join(', ')
  return { bodegaId, direccion, horario: horarioDe(primero.bodega) }
}

function armarPaquete<T extends ItemPaquete>(clave: string, numero: number, items: T[]): PaqueteCompra<T> {
  const primero = items[0]
  const provincia = primero.bodega?.provincia?.trim() || null
  return {
    clave,
    numero,
    empresaId: empresaIdDe(primero),
    nombre: primero.empresaNombre?.trim() || 'HotClick',
    provincia,
    items,
    cantidadProductos: items.reduce((suma, i) => suma + (i.cantidad ?? 0), 0),
    subtotal: items.reduce((suma, i) => suma + precioItem(i), 0),
    retiro: retiroDe(items),
    fueraGam: provincia != null && !PROVINCIAS_GAM.has(sinTildes(provincia)),
  }
}

/** Un paquete por negocio, en el orden en que entraron al carrito (igual que el backend). */
export function agruparPaquetes<T extends ItemPaquete>(items: T[]): PaqueteCompra<T>[] {
  const grupos = new Map<string, T[]>()
  for (const item of items) {
    const clave = claveDe(item)
    grupos.set(clave, [...(grupos.get(clave) ?? []), item])
  }
  return [...grupos.entries()].map(([clave, grupo], indice) => armarPaquete(clave, indice + 1, grupo))
}

/** Figma `29:1248`: normal, rápido (solo GAM), encomienda y retiro si la tienda lo permite. */
export function opcionesEntrega(paquete: PaqueteCompra): OpcionEntrega[] {
  const normal = paquete.fueraGam ? ENVIO.NORMAL_FUERA_GAM : ENVIO.NORMAL_GAM
  const opciones: OpcionEntrega[] = [{ metodo: normal, precio: COSTO_ENVIO[normal], requiereDireccion: true }]
  if (!paquete.fueraGam) {
    opciones.push({ metodo: ENVIO.RAPIDO, precio: COSTO_ENVIO[ENVIO.RAPIDO], requiereDireccion: true })
  }
  opciones.push({ metodo: ENVIO.ENCOMIENDA, precio: null, requiereDireccion: true })
  if (paquete.retiro) {
    opciones.push({ metodo: ENVIO.RETIRO, precio: 0, requiereDireccion: false, retiro: paquete.retiro })
  }
  return opciones
}

export function metodoInicial(paquete: PaqueteCompra): string {
  return opcionesEntrega(paquete)[0].metodo
}

export function costoEnvio(metodo: string | undefined): number {
  return metodo ? COSTO_ENVIO[metodo] ?? 0 : 0
}

/** Método elegido de cada paquete; si falta o ya no aplica, el inicial. */
export function enviosVigentes(paquetes: PaqueteCompra[], elegidos: Record<string, string>): Record<string, string> {
  const vigentes: Record<string, string> = {}
  for (const paquete of paquetes) {
    const elegido = elegidos[paquete.clave]
    const valido = opcionesEntrega(paquete).some((o) => o.metodo === elegido)
    vigentes[paquete.clave] = valido ? elegido : metodoInicial(paquete)
  }
  return vigentes
}

export function envioTotal(paquetes: PaqueteCompra[], envios: Record<string, string>): number {
  return paquetes.reduce((suma, p) => suma + costoEnvio(envios[p.clave]), 0)
}

export function requiereDireccion(envios: Record<string, string>): boolean {
  return Object.values(envios).some((metodo) => metodo !== ENVIO.RETIRO)
}

export function payloadPaquetes(paquetes: PaqueteCompra[], envios: Record<string, string>): PaqueteEntregaPayload[] {
  return paquetes
    .filter((p): p is PaqueteCompra & { empresaId: number } => p.empresaId != null)
    .map((p) => {
      const metodoEnvio = envios[p.clave]
      const retiro = metodoEnvio === ENVIO.RETIRO && p.retiro ? { bodegaId: p.retiro.bodegaId } : {}
      return { empresaId: p.empresaId, metodoEnvio, ...retiro }
    })
}

/** Igual que `OrderPricingService`: el cupón solo aplica al paquete de su negocio. */
function cuponAplica(paquete: PaqueteCompra, empresaIdCupon: number | null): boolean {
  return paquete.empresaId == null || paquete.empresaId === empresaIdCupon
}

export function descuentoPaquete(paquete: PaqueteCompra, cupon: CuponCarrito | null): number {
  if (!cupon || cupon.descuento <= 0 || !cuponAplica(paquete, cupon.empresaId)) return 0
  return Math.round(paquete.subtotal * cupon.descuento / 100)
}

export function descuentoCupon(paquetes: PaqueteCompra[], cupon: CuponCarrito | null): number {
  return paquetes.reduce((suma, p) => suma + descuentoPaquete(p, cupon), 0)
}

/** La tarjeta de regalo solo cubre el paquete de su negocio, hasta su total. */
export function montoGiftCard(
  paquetes: PaqueteCompra[],
  envios: Record<string, string>,
  cupon: CuponCarrito | null,
  giftCard: GiftCardAplicada | null,
): number {
  if (!giftCard || giftCard.saldo <= 0) return 0
  const paquete = paquetes.find((p) => p.empresaId != null && p.empresaId === giftCard.empresaId)
  if (!paquete) return 0
  const totalPaquete = paquete.subtotal - descuentoPaquete(paquete, cupon) + costoEnvio(envios[paquete.clave])
  return Math.min(giftCard.saldo, Math.max(0, totalPaquete))
}

export type TotalesCompra = {
  cantidadProductos: number
  subtotal: number
  envio: number
  descuento: number
  giftCard: number
  total: number
}

export function totalesCompra(
  paquetes: PaqueteCompra[],
  envios: Record<string, string>,
  cupon: CuponCarrito | null,
  giftCard: GiftCardAplicada | null = null,
): TotalesCompra {
  const subtotal = paquetes.reduce((suma, p) => suma + p.subtotal, 0)
  const envio = envioTotal(paquetes, envios)
  const descuento = descuentoCupon(paquetes, cupon)
  const gift = montoGiftCard(paquetes, envios, cupon, giftCard)
  return {
    cantidadProductos: paquetes.reduce((suma, p) => suma + p.cantidadProductos, 0),
    subtotal,
    envio,
    descuento,
    giftCard: gift,
    total: Math.max(0, subtotal - descuento + envio - gift),
  }
}
