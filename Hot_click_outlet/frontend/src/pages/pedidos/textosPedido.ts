import { formatPrice } from '@/utils/format'
import {
  envioCompra,
  envioUniforme,
  estadoCompra,
  fechaEntregaCompra,
  paquetesEntregados,
  totalPaquetes,
  type CompraCliente,
} from './comprasCliente'
import { aFecha, fechaCorta, partesFecha, ventanaEntrega } from './fechasPedido'
import { estadoPaquete, nombreTienda } from './paquetePedido'
import type { PedidoCliente } from './pedidoHelpers'

export type Traducir = (clave: string, opciones?: Record<string, unknown>) => string

function diaMes(fecha: Date, idioma: string): string {
  const { dia, mes } = partesFecha(fecha, idioma)
  return `${dia} ${mes}`
}

/** «3 paquetes · 1 entregado»; sin entregas queda solo «3 paquetes». */
export function resumenPaquetes(t: Traducir, compra: CompraCliente): string {
  const paquetes = t('misPedidos.paquetes', { count: totalPaquetes(compra) })
  const entregados = paquetesEntregados(compra)
  return entregados > 0 ? `${paquetes} · ${t('misPedidos.entregados', { count: entregados })}` : paquetes
}

function pieEntregado(t: Traducir, compra: CompraCliente, idioma: string): string {
  const fecha = aFecha(fechaEntregaCompra(compra))
  if (!fecha) return t('misPedidos.pie.entregado')
  return t('misPedidos.pie.entregadoEl', partesFecha(fecha, idioma))
}

/** Texto al pie de la tarjeta de «Mis pedidos» (Figma `28:1357`). */
export function pieTarjeta(t: Traducir, compra: CompraCliente, idioma: string): string {
  if (totalPaquetes(compra) > 1) return resumenPaquetes(t, compra)
  const estado = estadoCompra(compra)
  if (estado === 'entregado') return pieEntregado(t, compra, idioma)
  return t(`misPedidos.pie.${estado}`)
}

/** «24 set. 2026 · pagado con SINPE Móvil». */
export function pagadoCon(t: Traducir, compra: CompraCliente, idioma: string): string {
  const fecha = fechaCorta(compra.fecha, idioma)
  const metodo = compra.metodoPago ? t(`misPedidos.metodoPago.${compra.metodoPago}`, { defaultValue: '' }) : ''
  return metodo ? t('misPedidos.detalle.pagadoCon', { fecha, metodo }) : fecha
}

/** «Envío · 3 paquetes × ₡4.000» cuando todos pagan lo mismo. */
export function lineaEnvio(t: Traducir, compra: CompraCliente): string {
  if (compra.paquetes.length <= 1) return t('misPedidos.detalle.envio')
  const paquetes = t('misPedidos.paquetes', { count: compra.paquetes.length })
  const costo = envioUniforme(compra)
  if (costo === null) return t('misPedidos.detalle.envioPaquetes', { paquetes })
  return t('misPedidos.detalle.envioPorPaquete', { paquetes, costo: formatPrice(costo) })
}

export function montoProductos(compra: CompraCliente, total: number): number {
  return total - envioCompra(compra)
}

/** «Sale de San José · envío ₡4.000». */
export function origenPaquete(t: Traducir, paquete: PedidoCliente): string {
  const costo = formatPrice(paquete.costoEnvio ?? 0)
  const provincia = paquete.bodega?.provincia?.trim()
  return provincia ? t('misPedidos.paquete.saleDe', { provincia, costo }) : t('misPedidos.paquete.envio', { costo })
}

function rangoLlegada(t: Traducir, salida: Date, idioma: string): string {
  const { desde, hasta } = ventanaEntrega(salida)
  const mismoMes = desde.getMonth() === hasta.getMonth()
  return t('misPedidos.paquete.llegaEntre', {
    desde: mismoMes ? String(desde.getDate()) : diaMes(desde, idioma),
    hasta: diaMes(hasta, idioma),
  })
}

/** Segunda línea de la guía: «Salió el 25 set. · llega entre el 27 y 29 set.» o «Entregado el 26 set.». */
export function lineaGuia(t: Traducir, paquete: PedidoCliente, idioma: string): string | null {
  if (estadoPaquete(paquete) === 'entregado') {
    const entrega = aFecha(paquete.fechaEntregaReal)
    return entrega ? t('misPedidos.paquete.entregadoEl', { fecha: diaMes(entrega, idioma) }) : null
  }
  const salida = aFecha(paquete.fechaEnvio)
  if (!salida) return null
  return `${t('misPedidos.paquete.salio', { fecha: diaMes(salida, idioma) })} · ${rangoLlegada(t, salida, idioma)}`
}

/** Caja gris del paquete cuando todavía no tiene guía (Figma `37:1438`). */
export function textoSinGuia(t: Traducir, paquete: PedidoCliente): string {
  const tienda = nombreTienda(paquete)
  const estado = estadoPaquete(paquete)
  if (estado === 'pendiente') return t('misPedidos.paquete.pagoPendiente')
  if (estado === 'cancelado') return t('misPedidos.paquete.cancelado')
  if (estado === 'listoRetiro') return t('misPedidos.paquete.listoRetiro', { tienda })
  return t('misPedidos.paquete.guiaPendiente', { tienda })
}

export function mensajeWhatsApp(t: Traducir, compra: CompraCliente, paquete: PedidoCliente): string {
  return t('misPedidos.paquete.mensajeWhatsapp', {
    paquete: paquete.numeroPaquete ?? 1,
    total: totalPaquetes(compra),
    numero: compra.numero,
    tienda: nombreTienda(paquete),
  })
}
