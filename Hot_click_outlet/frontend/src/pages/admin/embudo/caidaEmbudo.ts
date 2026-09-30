import type { ResumenEmbudo } from '@/services/embudoService'

export type FaseCaida = 'antes' | 'durante'

export type CaidaEmbudo = {
  fase: FaseCaida
  personas: number
  detalle: 'producto' | 'checkout' | 'intento' | 'carrito'
}

const MOTIVOS_DURANTE = [
  ['errorDatos', 'datos incompletos'],
  ['errorEntrega', 'la entrega'],
  ['sinComprobante', 'el comprobante SINPE'],
  ['pagoFallido', 'un pago fallido'],
  ['pagoCancelado', 'un pago cancelado'],
] as const

export function caidaDominante(
  r: Pick<ResumenEmbudo, 'producto' | 'carrito' | 'checkout' | 'pagoIntento' | 'pedidosPagados'>,
): CaidaEmbudo {
  const antes = Math.max(0, r.producto - r.carrito)
  const abrioYNoPago = Math.max(0, r.checkout - r.pagoIntento)
  const intentoSinPedido = Math.max(0, r.pagoIntento - r.pedidosPagados)
  const carritoSinPedido = Math.max(0, r.carrito - r.pedidosPagados)
  const durante = Math.max(abrioYNoPago, intentoSinPedido, carritoSinPedido)
  if (durante > antes) {
    return { fase: 'durante', personas: durante, detalle: detalleDurante(abrioYNoPago, intentoSinPedido, carritoSinPedido) }
  }
  return { fase: 'antes', personas: antes, detalle: 'producto' }
}

function detalleDurante(abrioYNoPago: number, intentoSinPedido: number, carritoSinPedido: number): CaidaEmbudo['detalle'] {
  if (abrioYNoPago >= intentoSinPedido && abrioYNoPago >= carritoSinPedido) return 'checkout'
  if (intentoSinPedido >= carritoSinPedido) return 'intento'
  return 'carrito'
}

export function motivoMasFrecuente(r: ResumenEmbudo): { etiqueta: string; cantidad: number } | null {
  let mejor: { etiqueta: string; cantidad: number } | null = null
  for (const [clave, etiqueta] of MOTIVOS_DURANTE) {
    const cantidad = r[clave]
    if (cantidad > 0 && (mejor == null || cantidad > mejor.cantidad)) {
      mejor = { etiqueta, cantidad }
    }
  }
  return mejor
}

export function textoAccion(r: ResumenEmbudo): { titulo: string; cuerpo: string } {
  const caida = caidaDominante(r)
  if (caida.fase === 'durante' && caida.personas > 0) return textoDurante(r, caida)
  if (caida.personas > 0) return textoAntes(r, caida.personas)
  return {
    titulo: 'Sin caída clara en este período',
    cuerpo: 'Nadie que vio un producto se quedó sin carrito, y los carritos que hay tienen un pedido pagado al lado. Seguí mirando el embudo cuando entre más gente.',
  }
}

function textoAntes(r: ResumenEmbudo, cantidad: number): { titulo: string; cuerpo: string } {
  const vieron = cantidad === 1
    ? '1 persona vio un producto y no lo agregó al carrito.'
    : `${cantidad} personas vieron un producto y no lo agregaron al carrito.`
  return {
    titulo: 'Antes: la venta ni empezó',
    cuerpo: `${vieron} Mostrá precio y costo de envío en la ficha, y revisá las búsquedas sin resultados (${r.busquedaVacia} en este período).`,
  }
}

function textoHechoDurante(caida: CaidaEmbudo): string {
  const una = caida.personas === 1
  if (caida.detalle === 'checkout') {
    return una
      ? '1 persona abrió el checkout y no llegó a pagar.'
      : `${caida.personas} personas abrieron el checkout y no llegaron a pagar.`
  }
  if (caida.detalle === 'intento') {
    return una
      ? '1 persona intentó pagar y no quedó un pedido pagado.'
      : `${caida.personas} personas intentaron pagar y no quedó un pedido pagado.`
  }
  return una
    ? '1 persona armó carrito y no hay un pedido pagado que la cubra.'
    : `${caida.personas} personas armaron carrito y no hay un pedido pagado que las cubra.`
}

function textoDurante(r: ResumenEmbudo, caida: CaidaEmbudo): { titulo: string; cuerpo: string } {
  const motivo = motivoMasFrecuente(r)
  const freno = motivo
    ? `El freno que más se repite es ${motivo.etiqueta} (${motivo.cantidad}).`
    : 'No quedó un motivo registrado: mirá envío, datos y el comprobante de SINPE.'
  const hecho = textoHechoDurante(caida)
  return {
    titulo: 'Durante: la compra no se completó',
    cuerpo: `${hecho} ${freno}`,
  }
}

export function textoDespues(r: ResumenEmbudo): string {
  const pendientes = r.carritosPendientes === 1
    ? '1 carrito sigue pendiente'
    : `${r.carritosPendientes} carritos siguen pendientes`
  const enviados = r.carritosEmailEnviado === 1
    ? '1 ya recibió el recordatorio'
    : `${r.carritosEmailEnviado} ya recibieron el recordatorio`
  return `Después de irse: ${pendientes} y ${enviados}. El primer correo no lleva descuento.`
}
