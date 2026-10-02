import { inicialesDe } from '@/components/comprador/header/headerHelpers'
import { agruparPedidosPorPaquete, estadoDePedido, itemsDePedido } from '../../pedidos/pedidoHelpers'
import type { PedidoCliente } from '../../pedidos/pedidoHelpers'
import type { SolicitudBusqueda } from '../../servicios/serviciosHelpers'

/** Estados en que el pedido sigue "en curso" (se destaca en Mi cuenta). */
const ESTADOS_EN_CURSO = new Set(['PAGADO', 'EN_PREPARACION', 'LISTO_RETIRO', 'ENVIADO'])

/** Producto entregado que aún admite opinión: respuesta de `GET /testimonios/productos-para-resenar`. */
export type ProductoPorOpinar = {
  productoId?: number | string
  nombre?: string
  imagenUrl?: string | null
  pedidoId?: number | string
  resenasEnviadas?: number
  puedeResenar?: boolean
}

/** Opinión ya enviada: respuesta de `GET /testimonios/mis-testimonios`. */
export type OpinionEnviada = {
  id?: number | string
  tipo?: string
  productoId?: number | string | null
  productoNombre?: string | null
  productoImagenUrl?: string | null
  comentario?: string
  calificacion?: number | null
  estado?: string
  fechaCreacion?: string
}

/** Mismas iniciales que el header (primera y última palabra): el avatar no cambia de una pantalla a otra. */
export function iniciales(nombre?: string | null): string {
  return inicialesDe(nombre) || '?'
}

export function primerNombre(nombre?: string | null): string {
  return (nombre ?? '').trim().split(/\s+/)[0] ?? ''
}

/** "#1042" si el número es solo dígitos; los números con prefijo (ORD-10482) se muestran tal cual. */
export function etiquetaPedido(numero?: string | null): string {
  if (!numero) return ''
  return /^\d+$/.test(numero) ? `#${numero}` : numero
}

/** Cuenta de pedidos como los ve el comprador: un pago con varios paquetes es un solo pedido. */
export function resumenDePedidos(orders: PedidoCliente[]): { total: number; enCamino: number } {
  const grupos = agruparPedidosPorPaquete(orders)
  const enCamino = grupos.filter((g) => g.pedidos.some((p) => estadoDePedido(p) === 'ENVIADO')).length
  return { total: grupos.length, enCamino }
}

/** Pedido a destacar: el primero que sigue en curso (el listado llega del más reciente al más antiguo). */
export function pedidoEnCurso(orders: PedidoCliente[]): PedidoCliente[] | null {
  const grupos = agruparPedidosPorPaquete(orders)
  const grupo = grupos.find((g) => g.pedidos.some((p) => ESTADOS_EN_CURSO.has(estadoDePedido(p))))
  return grupo ? grupo.pedidos : null
}

/** Estado "global" de un pedido de varios paquetes: el más atrasado manda (todo entregado solo si todo lo está). */
const ORDEN_ESTADO = ['PENDIENTE', 'PAGADO', 'EN_PREPARACION', 'LISTO_RETIRO', 'ENVIADO', 'ENTREGADO', 'CANCELADO']
export function estadoGlobal(pedidos: PedidoCliente[]): string {
  const vivos = pedidos.map(estadoDePedido).filter((e) => e !== 'CANCELADO')
  if (vivos.length === 0) return 'CANCELADO'
  if (vivos.every((e) => e === 'ENTREGADO')) return 'ENTREGADO'
  // En un pedido mixto lo que se destaca es lo que está en camino; si no, lo más atrasado.
  if (vivos.includes('ENVIADO')) return 'ENVIADO'
  return vivos.reduce((peor, e) => (ORDEN_ESTADO.indexOf(e) < ORDEN_ESTADO.indexOf(peor) ? e : peor), vivos[0])
}

export type MiniaturaPedido = { src: string | null; nombre: string }

/** Fotos de los productos de un pedido (con o sin paquetes), sin repetir. */
export function miniaturasDePedido(pedidos: PedidoCliente[], limite = 2): MiniaturaPedido[] {
  const vistas = new Set<string>()
  const salida: MiniaturaPedido[] = []
  for (const pedido of pedidos) {
    for (const item of itemsDePedido(pedido)) {
      const src = item.producto?.imagenPrincipalUrl ?? null
      const nombre = item.nombreProducto ?? item.producto?.nombreProducto ?? ''
      const clave = src ?? nombre
      if (vistas.has(clave)) continue
      vistas.add(clave)
      salida.push({ src, nombre })
      if (salida.length >= limite) return salida
    }
  }
  return salida
}

export function solicitudesCotizadas(solicitudes: SolicitudBusqueda[]): number {
  return solicitudes.filter((s) => s.estado === 'ENCONTRADO').length
}

export function solicitudesEnBusqueda(solicitudes: SolicitudBusqueda[]): number {
  return solicitudes.filter((s) => s.estado === 'EN_BUSQUEDA' || s.estado === 'PENDIENTE').length
}

/** Productos entregados que todavía esperan la primera opinión del comprador. */
export function productosPendientesDeOpinar(productos: ProductoPorOpinar[]): ProductoPorOpinar[] {
  return productos.filter((p) => p.puedeResenar !== false && (p.resenasEnviadas ?? 0) === 0)
}

export type EventoActividad = {
  id: string
  tipo: 'pedido' | 'solicitud' | 'opinion'
  tono: 'azul' | 'verde' | 'ambar'
  /** Clave i18n + valores; el texto se resuelve al pintar para respetar el idioma. */
  titulo: { clave: string; valores: Record<string, string> }
  detalle: { clave: string; valores: Record<string, string> } | null
  fecha: string
  to: string
}

function marcaDeTiempo(fecha?: string): number {
  const t = fecha ? new Date(fecha).getTime() : Number.NaN
  return Number.isNaN(t) ? 0 : t
}

/**
 * Feed "Actividad reciente" (Figma `28:1251`, marcado "NUEVO · por programar"): no hay endpoint de
 * eventos, así que se arma con lo que ya se carga (pedidos, solicitudes y productos por opinar).
 */
export function construirEventos(
  orders: PedidoCliente[],
  solicitudes: SolicitudBusqueda[],
  porOpinar: ProductoPorOpinar[],
  limite = 3,
): EventoActividad[] {
  const eventos: EventoActividad[] = []

  for (const grupo of agruparPedidosPorPaquete(orders)) {
    const pedido = grupo.pedidos[0]
    if (!pedido.fechaPedido) continue
    const numero = etiquetaPedido(pedido.numeroPedido)
    const guia = grupo.pedidos.find((p) => p.numeroGuia)?.numeroGuia
    const estado = estadoGlobal(grupo.pedidos)
    eventos.push({
      id: `pedido-${grupo.grupoPago ?? pedido.id}`,
      tipo: 'pedido',
      tono: 'azul',
      titulo: { clave: estado === 'ENTREGADO' ? 'cuenta.actividad.pedidoEntregado' : estado === 'ENVIADO' ? 'cuenta.actividad.pedidoSalio' : 'cuenta.actividad.pedidoActualizado', valores: { numero } },
      detalle: guia ? { clave: 'cuenta.actividad.guia', valores: { guia } } : null,
      fecha: pedido.fechaEnvio ?? pedido.fechaPedido,
      to: pedido.numeroPedido ? `/mis-pedidos?pedido=${encodeURIComponent(pedido.numeroPedido)}` : '/mis-pedidos',
    })
  }

  for (const s of solicitudes) {
    if (!s.fechaCreacion) continue
    eventos.push({
      id: `solicitud-${s.id}`,
      tipo: 'solicitud',
      tono: 'verde',
      titulo: {
        clave: s.estado === 'ENCONTRADO' ? 'cuenta.actividad.solicitudCotizada' : 'cuenta.actividad.solicitudEnviada',
        valores: { producto: s.descripcion ?? '' },
      },
      detalle: null,
      fecha: s.fechaCreacion,
      to: `/servicios?vista=solicitudes&solicitud=${s.id}`,
    })
  }

  for (const p of productosPendientesDeOpinar(porOpinar)) {
    eventos.push({
      id: `opinion-${p.productoId}`,
      tipo: 'opinion',
      tono: 'ambar',
      titulo: { clave: 'cuenta.actividad.contanos', valores: { producto: p.nombre ?? '' } },
      detalle: null,
      fecha: '',
      to: '/perfil?vista=opiniones',
    })
  }

  return eventos
    .sort((a, b) => marcaDeTiempo(b.fecha) - marcaDeTiempo(a.fecha))
    .slice(0, limite)
}

/** Texto relativo corto ("hace 2 h", "hace 1 día") para el feed; claves i18n con conteo. */
export function haceCuanto(fecha: string, ahora = Date.now()): { clave: string; valores: { count: number } } | null {
  const t = marcaDeTiempo(fecha)
  if (!t) return null
  const minutos = Math.max(0, Math.round((ahora - t) / 60_000))
  if (minutos < 60) return { clave: 'cuenta.hace.minutos', valores: { count: Math.max(1, minutos) } }
  const horas = Math.round(minutos / 60)
  if (horas < 24) return { clave: 'cuenta.hace.horas', valores: { count: horas } }
  return { clave: 'cuenta.hace.dias', valores: { count: Math.round(horas / 24) } }
}

/** "28 de set." (es/pt) o "Sep 28" (en): fecha corta del Figma, sin año. */
export function fechaCorta(iso: string | null | undefined, idioma: string): string {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null
  if (!m) return ''
  const fecha = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const base = idioma.slice(0, 2)
  const locale = base === 'en' ? 'en-US' : base === 'pt' ? 'pt-BR' : 'es-CR'
  const corto = new Intl.DateTimeFormat(locale, { month: 'short' }).format(fecha).replace('.', '').slice(0, 3)
  // En Costa Rica se escribe "set." (setiembre), como en Figma.
  const mes = base === 'es' && corto === 'sep' ? 'set' : corto
  return base === 'en' ? `${mes} ${fecha.getDate()}` : `${fecha.getDate()} de ${mes}.`
}

/** "24 set. 2026" (es/pt) o "Sep 24, 2026" (en): fecha completa del Figma (`28:1348`). */
export function fechaConAnio(iso: string | null | undefined, idioma: string): string {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null
  if (!m) return ''
  const fecha = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const base = idioma.slice(0, 2)
  const locale = base === 'en' ? 'en-US' : base === 'pt' ? 'pt-BR' : 'es-CR'
  const corto = new Intl.DateTimeFormat(locale, { month: 'short' }).format(fecha).replace('.', '').slice(0, 3)
  const mes = base === 'es' && corto === 'sep' ? 'set' : corto
  return base === 'en' ? `${mes} ${fecha.getDate()}, ${fecha.getFullYear()}` : `${fecha.getDate()} ${mes}. ${fecha.getFullYear()}`
}
