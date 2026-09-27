import { formatoColon } from '@/theme/formatoColon'

/** Respuesta de `GET /pedidos/{id}/despacho` (`DespachoPaqueteDTO`). */
export type DespachoPaquete = {
  pedidoId: number
  numeroCompra: string
  numeroPaquete: number
  cantidadPaquetes: number
  negocio: string
  otrosNegocios: string[]
  estado: string | null
  metodoEnvio: string | null
  numeroGuia: string | null
  cliente: { nombre: string | null; telefono: string | null; direccion: string | null }
  productos: { nombre: string; cantidad: number; subtotal: number; imagenUrl: string | null }[]
  pago: PagoPaquete
}

export type PagoPaquete = {
  venta: number
  envio: number
  comision: number
  porcentaje: number | null
  minimo: number
  plan: string | null
  aRecibir: number
}

export type EtapaDespacho = 'porDespachar' | 'despachado' | 'cancelado'

const ESTADOS_DESPACHADOS = new Set(['ENVIADO', 'ENTREGADO', 'COMPLETADO', 'LISTO_RETIRO'])
const METODOS_CORREOS = new Set(['ENVIO_NORMAL_GAM', 'ENVIO_NORMAL_FUERA_GAM'])

export function etapaDespacho(estado: string | null): EtapaDespacho {
  const valor = (estado ?? '').toUpperCase()
  if (valor === 'CANCELADO') return 'cancelado'
  return ESTADOS_DESPACHADOS.has(valor) ? 'despachado' : 'porDespachar'
}

/** Los pedidos sin método (anteriores a los paquetes) siempre salieron por Correos. */
export function usaGuiaCorreos(metodoEnvio: string | null): boolean {
  return !metodoEnvio || METODOS_CORREOS.has(metodoEnvio)
}

const FORMA_ENTREGA: Record<string, string> = {
  ENVIO_RAPIDO: 'Envío rápido · mensajería',
  ENCOMIENDA_PROPIA: 'Encomienda · según transportista',
  RETIRO_EN_TIENDA: 'Retiro en tienda · el cliente lo recoge',
}

export function formaEntrega(metodoEnvio: string | null): string {
  if (usaGuiaCorreos(metodoEnvio)) return 'Envío normal · Correos de Costa Rica'
  return FORMA_ENTREGA[metodoEnvio ?? ''] ?? 'Envío coordinado'
}

export function unirNombres(nombres: string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? ''
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`
}

export function textoOtrosNegocios(otros: string[]): string | null {
  if (otros.length === 0) return null
  if (otros.length === 1) return `El otro paquete del pedido lo despacha ${otros[0]}.`
  return `Los otros ${otros.length} paquetes del pedido los despachan ${unirNombres(otros)}.`
}

function porcentajeTexto(porcentaje: number | null): string {
  return porcentaje == null ? '' : `${Number(porcentaje)}%`
}

export function etiquetaComision(pago: PagoPaquete): string {
  return `Comisión HotClick ${porcentajeTexto(pago.porcentaje)}`.trim()
}

function nombrePlan(plan: string | null): string {
  const limpio = (plan ?? '').trim().toLowerCase()
  return limpio ? limpio.charAt(0).toUpperCase() + limpio.slice(1) : 'HotClick'
}

/** La comisión se cobra sobre los productos; el envío se le paga completo al negocio (igual que el wallet). */
export function notaPlan(pago: PagoPaquete): string {
  const pct = porcentajeTexto(pago.porcentaje)
  const minimo = pago.minimo > 0 ? `, mínimo ${formatoColon(pago.minimo)}` : ''
  const calculo = pago.minimo > 0 && pago.comision === pago.minimo
    ? `Se aplicó el mínimo de ${formatoColon(pago.minimo)}.`
    : `${pct} de ${formatoColon(pago.venta)} = ${formatoColon(pago.comision)}.`
  return `Plan ${nombrePlan(pago.plan)}: ${pct} por venta${minimo}, pasarela incluida. ${calculo} HotClick cobró al cliente y te transfiere este monto.`
}
