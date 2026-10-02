import type { TFunction } from 'i18next'

/** URL canónica del sitio (JSON-LD y Helmet). */
export const SITE_URL = 'https://hotclick.lat'

/** Datos estructurados de servicios HotClick. No alterar el contenido. */
export const serviciosJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Servicios HotClick',
  description: 'Servicios disponibles para clientes de HotClick Marketplace Costa Rica.',
  url: `${SITE_URL}/servicios`,
  numberOfItems: 3,
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      item: {
        '@type': 'Service',
        name: 'Búsqueda de producto',
        description: 'Te ayudamos a encontrar cualquier producto que no esté en nuestro catálogo. Enviá tu solicitud y nuestro equipo lo busca por vos en Costa Rica.',
        provider: { '@type': 'Organization', name: 'HotClick', url: SITE_URL },
        areaServed: { '@type': 'Country', name: 'Costa Rica' },
        availableChannel: {
          '@type': 'ServiceChannel',
          serviceUrl: `${SITE_URL}/servicios`,
          servicePhone: '+506-8666-7888',
        },
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'CRC', availability: 'https://schema.org/InStock' },
      },
    },
    {
      '@type': 'ListItem',
      position: 2,
      item: {
        '@type': 'Service',
        name: 'Garantía de producto',
        description: 'Todos los productos de HotClick incluyen garantía. Reportá un problema con tu compra desde esta sección y te gestionamos la solución.',
        provider: { '@type': 'Organization', name: 'HotClick', url: SITE_URL },
        areaServed: { '@type': 'Country', name: 'Costa Rica' },
        availableChannel: {
          '@type': 'ServiceChannel',
          serviceUrl: `${SITE_URL}/servicios`,
        },
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'CRC', availability: 'https://schema.org/InStock' },
      },
    },
    {
      '@type': 'ListItem',
      position: 3,
      item: {
        '@type': 'Service',
        name: 'Digitalización y etiquetado de inventario',
        description: 'Digitalizamos el inventario de tu negocio en el local: escaneo de códigos de barras, registro manual, SKU internos HOTCLICK y etiquetas impresas para productos sin código.',
        provider: { '@type': 'Organization', name: 'HotClick', url: SITE_URL },
        areaServed: { '@type': 'Country', name: 'Costa Rica' },
        availableChannel: {
          '@type': 'ServiceChannel',
          serviceUrl: `${SITE_URL}/servicios`,
          servicePhone: '+506-8666-7888',
        },
      },
    },
  ],
}

/** Prefijo en descripción al solicitar digitalización de inventario (admin). */
export const PREFIJO_SOLICITUD_INVENTARIO = '[Digitalización de inventario]'

/** Tamaño máximo de cada foto (5 MB). */
export const FOTO_MAX_BYTES = 5 * 1024 * 1024

/** Máximo de fotos en una solicitud de búsqueda. */
export const MAX_FOTOS = 3

/** Campo de texto de los formularios de Servicios HOT (Figma `28:1486`): blanco, borde `n/200`, radio 12, 14/20. */
export const CLASE_CAMPO =
  'w-full rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-[14px] py-3 text-[14px] leading-5 text-hc-n-900 outline-none placeholder:text-hc-n-400 focus:border-hc-blue-600'

/**
 * Teléfono de contacto como lo recibe el backend, con prefijo de país. Quien escribe solo el número local
 * (8888 8888) queda como +506; quien empieza con "+" conserva su país.
 */
export function normalizarTelefono(texto: string): string {
  const digitos = texto.replace(/\D/g, '')
  if (texto.trim().startsWith('+')) return `+${digitos}`
  return digitos.startsWith('506') && digitos.length > 8 ? `+${digitos}` : `+506${digitos}`
}

/** Etiquetas de calificación 1–5. */
export const RATING_LABELS: Record<number, string> = { 1: 'Muy malo', 2: 'Malo', 3: 'Regular', 4: 'Bueno', 5: 'Excelente' }

export type VistaServicios = 'inicio' | 'busqueda' | 'garantia' | 'testimonio' | 'inventario'

export type FormBusqueda = {
  descripcion: string
  presupuesto: string
  nombreContacto: string
}

export type FotoSolicitud = {
  file: File
  preview: string
  url: unknown
}

export type SolicitudBusqueda = {
  id?: number | string
  estado?: string
  fechaCreacion?: string
  descripcion?: string
  presupuesto?: string
  fotosUrls?: string | null
  notasAdmin?: string | null
}

export type GarantiaItem = {
  productoId?: number | string
  pedidoId?: number | string
  activa?: boolean
  diasRestantes?: number
  garantiaDias?: number
  fechaVencimiento?: string
  fechaEntrega?: string
  imagenUrl?: string | null
  nombre?: string
  numeroPedido?: string | number
}

export type ProductoParaResena = {
  productoId?: number | string
  nombre?: string
  imagenUrl?: string | null
  yaReseno?: boolean
}


/** Motivos de la solicitud de garantía (Figma `28:1531`). El backend no tiene campo de motivo: viaja en la descripción. */
export const MOTIVOS_GARANTIA = ['No enciende', 'Se dañó', 'Llegó incompleto', 'Otro'] as const
export type MotivoGarantia = (typeof MOTIVOS_GARANTIA)[number]

/** Clave i18n de cada motivo (`serviciosPage.garantia.motivos.*`); a la tienda viaja el texto en español. */
export const CLAVE_MOTIVO: Record<MotivoGarantia, string> = { 'No enciende': 'noEnciende', 'Se dañó': 'seDano', 'Llegó incompleto': 'incompleto', Otro: 'otro' }

export function descripcionGarantia(motivo: MotivoGarantia | null, texto: string): string {
  return motivo ? `[Motivo: ${motivo}] ${texto.trim()}` : texto.trim()
}

export function claveGarantia(g: GarantiaItem): string {
  return `${g.productoId}-${g.pedidoId}`
}

/** "12 set": día y mes corto, como las fechas de Figma `28:1531` (en Costa Rica se escribe "set"). */
export function fechaDiaMes(iso: string | null | undefined): string {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null
  if (!m) return ''
  const fecha = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const mes = new Intl.DateTimeFormat('es-CR', { month: 'short' }).format(fecha).replace('.', '').slice(0, 3)
  return `${fecha.getDate()} ${mes}`
}

/** "30 días restantes · vence 12 oct": vigencia de una garantía activa. */
export function textoVigencia(g: GarantiaItem, t: TFunction): string {
  const count = g.diasRestantes ?? 0
  const fecha = fechaDiaMes(g.fechaVencimiento)
  return fecha
    ? t('serviciosPage.garantia.vigenciaVence', { count, fecha })
    : t('serviciosPage.garantia.vigencia', { count })
}

/** "25 sep 2026" para fechas ISO (`2026-09-25`); cualquier otro formato se muestra tal como llega. */
export function fechaConMes(valor: string | null | undefined): string {
  if (!valor) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor)
  if (!m) return valor
  const fecha = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const mes = new Intl.DateTimeFormat('es-CR', { month: 'short' }).format(fecha).replace('.', '').slice(0, 3)
  return `${fecha.getDate()} ${mes} ${fecha.getFullYear()}`
}
