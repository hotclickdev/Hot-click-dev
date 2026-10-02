import type { Encargo } from '@/services/encargoService'
import type { TFunction } from 'i18next'

export type EstadoPaso = 'hecho' | 'actual' | 'pendiente' | 'error'

export type PasoEncargo = {
  clave: string
  titulo: string
  detalle?: string
  estado: EstadoPaso
}

/** Estados con cotización ya emitida por la tienda. */
const CON_COTIZACION = ['APROBADO', 'PENDIENTE_PAGO', 'PAGADO', 'VENCIDO']

/** "22 sep · 10:14" a partir de la fecha ISO del backend; vacío si no viene. */
export function fechaHoraEncargo(iso: string | null | undefined): string {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso) : null
  if (!m) return ''
  const fecha = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const mes = new Intl.DateTimeFormat('es-CR', { month: 'short' }).format(fecha).replace('.', '').slice(0, 3)
  return `${fecha.getDate()} ${mes} · ${m[4]}:${m[5]}`
}

/**
 * Línea de tiempo de Figma `28:1594` a partir del estado real del encargo. Solo lleva detalle donde el backend
 * entrega el dato (fecha de creación, precio cotizado, motivo de rechazo); no se inventan duraciones ni fechas.
 */
export function pasosDelEncargo(e: Encargo, precio: (monto: number) => string, t: TFunction): PasoEncargo[] {
  const pasos: PasoEncargo[] = [
    { clave: 'recibida', titulo: t('encargoPublico.pasos.recibida'), detalle: fechaHoraEncargo(e.fechaCreacion) || undefined, estado: 'hecho' },
  ]

  if (e.estado === 'RECHAZADO') {
    pasos.push({ clave: 'rechazado', titulo: t('encargoPublico.pasos.rechazado'), detalle: e.motivoRechazo ?? undefined, estado: 'error' })
    return pasos
  }

  const cotizada = CON_COTIZACION.includes(e.estado) && e.precioCotizado != null
  pasos.push(cotizada
    ? { clave: 'cotizacion', titulo: t('encargoPublico.pasos.cotizacionEnviada'), detalle: precio(e.precioCotizado as number), estado: 'hecho' }
    : { clave: 'cotizacion', titulo: t('encargoPublico.pasos.cotizacion'), detalle: t('encargoPublico.pasos.revisando'), estado: 'actual' })
  if (!cotizada) return pasos

  if (e.estado === 'VENCIDO') {
    pasos.push({ clave: 'vencido', titulo: t('encargoPublico.pasos.vencida'), detalle: t('encargoPublico.pasos.vencidaDetalle'), estado: 'error' })
    return pasos
  }

  const pagado = e.estado === 'PAGADO'
  pasos.push({
    clave: 'pago',
    titulo: e.estado === 'PENDIENTE_PAGO' ? t('encargoPublico.pasos.pagoProceso') : pagado ? t('encargoPublico.pasos.pagoRecibido') : t('encargoPublico.pasos.esperandoPago'),
    detalle: pagado ? undefined : t('encargoPublico.pasos.pagaDetalle'),
    estado: pagado ? 'hecho' : 'actual',
  })

  const fulfillment = e.estadoFulfillment ?? 'EN_PRODUCCION'
  const entregado = fulfillment === 'ENTREGADO'
  const listo = fulfillment === 'LISTO' || entregado
  pasos.push({ clave: 'produccion', titulo: t('encargoPublico.pasos.produccion'), estado: !pagado ? 'pendiente' : listo ? 'hecho' : 'actual' })
  pasos.push({
    clave: 'listo',
    titulo: entregado ? t('encargoPublico.pasos.entregado') : t('encargoPublico.pasos.listo'),
    estado: entregado ? 'hecho' : listo ? 'actual' : 'pendiente',
  })
  return pasos
}

export function referenciasDelEncargo(e: Encargo): string[] {
  return [e.imagenUrl1, e.imagenUrl2, e.imagenUrl3].filter((u): u is string => Boolean(u))
}
