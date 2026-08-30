/** URL canónica del sitio (JSON-LD y Helmet). */
export const SITE_URL = 'https://hotclick.lat'

/** Datos estructurados de servicios HotClick. No alterar el contenido. */
export const serviciosJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Servicios HotClick',
  description: 'Servicios disponibles para clientes de HotClick Marketplace Costa Rica.',
  url: `${SITE_URL}/servicios`,
  numberOfItems: 2,
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
  ],
}

/** Estilos de badge por estado de solicitud de búsqueda. */
export const ESTADO_STYLES: Record<string, { color: string; bg: string }> = {
  PENDIENTE:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  EN_BUSQUEDA:   { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  ENCONTRADO:    { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  NO_ENCONTRADO: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  CANCELADO:     { color: 'var(--hc-muted)', bg: 'rgba(107,114,128,0.12)' },
}

/** Tamaño máximo de cada foto (5 MB). */
export const FOTO_MAX_BYTES = 5 * 1024 * 1024

/** Máximo de fotos en una solicitud de búsqueda. */
export const MAX_FOTOS = 3

/** Estilo compartido de inputs del formulario de búsqueda. */
export const inputStyle = {
  backgroundColor: 'var(--hc-surface-2)',
  border: '1.5px solid var(--hc-border)',
  color: 'var(--hc-text)',
  borderRadius: 12,
  outline: 'none',
  width: '100%',
  fontSize: 15,
  padding: '12px 16px',
  transition: 'border-color 0.2s',
}

/** Etiquetas de calificación 1–5. */
export const RATING_LABELS: Record<number, string> = { 1: 'Muy malo', 2: 'Malo', 3: 'Regular', 4: 'Bueno', 5: 'Excelente' }

/** Imágenes de tarjetas: local primero, Unsplash como respaldo. */
export const CARD_IMAGES = {
  busqueda: {
    local: '/servicios/busqueda.jpg',
    fallback: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80',
    alt: 'Búsqueda de producto',
  },
  garantia: {
    local: '/servicios/garantia.jpg',
    fallback: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=80',
    alt: 'Garantía de productos',
  },
  resena: {
    local: '/servicios/resena.jpg',
    fallback: 'https://images.unsplash.com/photo-1556742031-c6961e8560b0?w=800&q=80',
    alt: 'Dejar reseña',
  },
}

export type VistaServicios = 'inicio' | 'busqueda' | 'garantia' | 'testimonio'
export type TabBusqueda = 'solicitar' | 'mis-solicitudes'

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

export type TipoImagenServicio = keyof typeof CARD_IMAGES

