import type { TFunction } from 'i18next'
import { STOCK_QUEDAN_MAX } from '@/utils/stockEscaso'
import type { Producto } from '@/types/producto'
import { formatPrice } from '@/utils/format'
import { normalizarBusqueda } from '@/pages/catalogo/catalogoFiltros'

export type TipoVideo = 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'vimeo' | 'otra'

/**
 * Video del producto detectado desde la URL que guarda el vendedor (`Producto.videoUrl`, sin campo de plataforma).
 * `embedUrl` es null cuando la red no se puede incrustar: la ficha muestra una tarjeta de enlace.
 */
export type VideoDetectado = {
  type: TipoVideo
  /** Nombre visible de la red para la insignia ("YouTube", "Shorts", "Instagram"...). */
  etiqueta: string
  embedUrl: string | null
  /** 9:16 (Shorts, Reels, TikTok) o 16:9. */
  vertical: boolean
  /** Miniatura conocida (YouTube) para cargar el embed recién al tocar. */
  miniatura: string | null
  url: string
}

export type TabProducto = {
  id: string
  label: string
}

export type VarianteProducto = {
  id?: number
  talla?: string | null
  colorVariante?: string | null
  nombreProducto?: string
  nombre?: string
  stock?: number | null
}

export type ImagenProductoApi = {
  posicion?: unknown
  urlImagen?: unknown
}

export function parseTallas(talla: string | null | undefined): string[] {
  if (!talla) return []
  return talla.split(/[-,/]/).map((s) => s.trim()).filter(Boolean)
}

const YT_ID = /^[a-zA-Z0-9_-]{11}$/
const NUMERO = /^\d+$/

type Red = Omit<VideoDetectado, 'miniatura'> & { miniatura?: string | null }

function youtube(id: string, etiqueta: 'YouTube' | 'Shorts'): Red {
  return { type: 'youtube', etiqueta, vertical: etiqueta === 'Shorts', url: `https://www.youtube.com/watch?v=${id}`,
    miniatura: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&autoplay=1` }
}

/**
 * Cada red se reconoce por el host exacto (con o sin `www.`/`m.`) y por la forma de la ruta; el enlace
 * "Ver en …" se arma de nuevo desde el ID, nunca con la URL que escribió el vendedor (SEC-98-03).
 */
function redDeVideo(u: URL): Red | null {
  const host = u.hostname.toLowerCase().replace(/^(?:www|m)\./, '')
  const [, a = '', b = '', c = '', d = ''] = u.pathname.split('/')
  switch (host) {
    case 'youtu.be':
      return YT_ID.test(a) ? youtube(a, 'YouTube') : null
    case 'youtube.com': {
      if (a === 'shorts' && YT_ID.test(b)) return youtube(b, 'Shorts')
      if ((a === 'embed' || a === 'live') && YT_ID.test(b)) return youtube(b, 'YouTube')
      const v = u.searchParams.get('v')
      return a === 'watch' && !b && v && YT_ID.test(v) ? youtube(v, 'YouTube') : null
    }
    case 'vimeo.com':
    case 'player.vimeo.com': {
      const id = a === 'video' ? b : a
      return NUMERO.test(id)
        ? { type: 'vimeo', etiqueta: 'Vimeo', vertical: false, url: `https://vimeo.com/${id}`, embedUrl: `https://player.vimeo.com/video/${id}?dnt=1` }
        : null
    }
    case 'tiktok.com':
      return /^@[\w.-]+$/.test(a) && b === 'video' && NUMERO.test(c)
        ? { type: 'tiktok', etiqueta: 'TikTok', vertical: true, url: `https://www.tiktok.com/${a}/video/${c}`, embedUrl: `https://www.tiktok.com/embed/v2/${c}` }
        : null
    case 'instagram.com': {
      if (!['p', 'reel', 'reels', 'tv'].includes(a) || !/^[A-Za-z0-9_-]+$/.test(b)) return null
      const tipo = a === 'reels' ? 'reel' : a
      return { type: 'instagram', etiqueta: 'Instagram', vertical: true, url: `https://www.instagram.com/${tipo}/${b}/`,
        embedUrl: `https://www.instagram.com/${tipo}/${b}/embed/` }
    }
    case 'facebook.com':
    case 'fb.watch': {
      const esVideo = host === 'fb.watch' ? Boolean(a) : a === 'watch' || a === 'reel' || (b === 'videos' && Boolean(c || d))
      if (!esVideo) return null
      const enlace = `https://${host === 'fb.watch' ? 'fb.watch' : 'www.facebook.com'}${u.pathname}${u.search}`
      return { type: 'facebook', etiqueta: 'Facebook', vertical: a === 'reel', url: enlace,
        embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(enlace)}&show_text=false` }
    }
    default:
      return null
  }
}

export function detectVideo(url: string | null | undefined): VideoDetectado | null {
  const limpio = url?.trim()
  if (!limpio) return null
  let u: URL
  try {
    u = new URL(limpio)
  } catch {
    return null
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  const red = redDeVideo(u)
  if (red) return { miniatura: null, ...red }
  return { type: 'otra', etiqueta: u.hostname.replace(/^www\./, ''), vertical: false, embedUrl: null, miniatura: null, url: u.href }
}

/** Segmento del control de plataforma (imagen aprobada `ficha-video.png`): Facebook, Vimeo y el resto van a "Otra red". */
export type SegmentoVideo = 'youtube' | 'instagram' | 'tiktok' | 'otra'

export function segmentoVideo(tipo: TipoVideo): SegmentoVideo {
  return tipo === 'youtube' || tipo === 'instagram' || tipo === 'tiktok' ? tipo : 'otra'
}

export function seoDesdeProducto(product: Producto, userLang: string): { seoTitle: string; seoDescription: string } {
  const seoByLang: Record<string, { title?: string | null; description?: string | null }> = {
    es: { title: product.metaTitle,         description: product.metaDescription },
    en: { title: product.metaTitleEn,       description: product.metaDescriptionEn },
    pt: { title: product.metaTitlePt,       description: product.metaDescriptionPt },
    fr: { title: product.metaTitleFr,       description: product.metaDescriptionFr },
  }
  const activeSeo = seoByLang[userLang] ?? {}
  const fallbackTitle = `${product.titulo || product.nombre} | HotClick Outlet`
  const fallbackDesc  = `${product.descripcion || product.nombre} | Precio: ${formatPrice(product.precio)} | Envíos en Costa Rica`
  const seoTitle       = activeSeo.title       || seoByLang.es.title       || fallbackTitle
  const seoDescription = activeSeo.description || seoByLang.es.description || fallbackDesc
  return { seoTitle, seoDescription }
}

export function tabsDesdeProducto(product: Producto, t: TFunction): TabProducto[] {
  const tabs: (TabProducto | null)[] = [
    product.especificaciones?.trim() ? { id: 'especificaciones', label: t('product.specsTab') } : null,
    product.comoUsar?.trim()        ? { id: 'como-usar',        label: t('product.howToUseTab') } : null,
  ]
  return tabs.filter((tab): tab is TabProducto => tab != null)
}

/** Producto personalizado con precio a cotizar: no se compra directo, se pide un encargo. */
export function esProductoCotizable(product: Pick<Producto, 'esPersonalizado' | 'modoPrecioPersonalizado'>): boolean {
  return Boolean(product.esPersonalizado) && product.modoPrecioPersonalizado !== 'FIJO'
}

/** Un producto está agotado cuando no tiene stock (`stock` 0, negativo o ausente). */
export function estaAgotado(product: Pick<Producto, 'stock'>): boolean {
  return !(Number(product.stock) > 0)
}

export const MAX_PARECIDOS_AGOTADO = 6

/**
 * "Parecidos disponibles" de la ficha agotada (Figma 44:1965): recomendaciones
 * con stock, sin repetir el producto actual.
 */
export function parecidosDisponibles(
  recomendaciones: Producto[],
  idActual: Producto['id'],
  max = MAX_PARECIDOS_AGOTADO,
): Producto[] {
  return recomendaciones
    .filter((p) => p.id !== idActual && !estaAgotado(p))
    .slice(0, max)
}

export function tallasDesdeProducto(
  product: Producto,
  variantes: VarianteProducto[],
): { tallasPropias: string[]; hermanasPorTalla: Map<string, VarianteProducto> } {
  const tallasPropias = parseTallas(product.talla)
  const hermanasPorTalla = new Map<string, VarianteProducto>()
  variantes.forEach((v) => {
    if (v.talla && !hermanasPorTalla.has(v.talla)) hermanasPorTalla.set(v.talla, v)
  })
  tallasPropias.forEach((tOpt) => hermanasPorTalla.delete(tOpt))
  return { tallasPropias, hermanasPorTalla }
}

export function listaProductosDesdePagina(data: unknown): Producto[] {
  if (Array.isArray(data)) {
    return data.filter((item): item is Producto => typeof item === 'object' && item !== null)
  }
  if (data && typeof data === 'object' && 'content' in data) {
    const content = (data as { content: unknown }).content
    if (Array.isArray(content)) {
      return content.filter((item): item is Producto => typeof item === 'object' && item !== null)
    }
  }
  return []
}

export function variantesDesdeRespuesta(data: unknown): VarianteProducto[] {
  if (!Array.isArray(data)) return []
  return data.filter((item): item is VarianteProducto => typeof item === 'object' && item !== null)
}

export function listaImagenesProducto(data: unknown): ImagenProductoApi[] {
  let lista: unknown[] = []
  if (Array.isArray(data)) lista = data
  else if (data && typeof data === 'object' && 'data' in data) {
    const inner = (data as { data: unknown }).data
    if (Array.isArray(inner)) lista = inner
  }
  return lista.filter((item): item is ImagenProductoApi => typeof item === 'object' && item !== null)
}

export function nombreError(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'name' in err) {
    const name = (err as { name: unknown }).name
    return typeof name === 'string' ? name : undefined
  }
  return undefined
}

/** Stock a partir del cual la ficha avisa "Quedan N" en vez de "Disponible · N en stock". */
export const STOCK_BAJO_MAX = STOCK_QUEDAN_MAX

export type OpinionProducto = {
  id: string
  autor: string
  comentario: string
  calificacion: number | null
}

/** Reseñas aprobadas de `/testimonios/producto/:id/resenas` (`{ data: [...] }` o lista directa). */
export function opinionesDesdeRespuesta(data: unknown): OpinionProducto[] {
  const lista = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data: unknown }).data)
      ? (data as { data: unknown[] }).data
      : []
  const opiniones: OpinionProducto[] = []
  lista.forEach((item, i) => {
    if (typeof item !== 'object' || item === null) return
    const r = item as { id?: unknown; nombreUsuario?: unknown; comentario?: unknown; calificacion?: unknown }
    const comentario = typeof r.comentario === 'string' ? r.comentario.trim() : ''
    if (!comentario) return
    const calificacion = Number(r.calificacion)
    opiniones.push({
      id: String(r.id ?? i),
      autor: typeof r.nombreUsuario === 'string' ? r.nombreUsuario : '',
      comentario,
      calificacion: Number.isFinite(calificacion) && calificacion > 0 ? Math.min(5, Math.round(calificacion)) : null,
    })
  })
  return opiniones
}

export type OpcionTalla = {
  talla: string
  /** `propia`: misma ficha (se selecciona). `hermana`: otra ficha con su propio stock (se navega). */
  origen: 'propia' | 'hermana'
  id?: number
  stock: number | null
}

/**
 * Tallas de la ficha en el orden del Figma (38, 39, 40, 41, 42): si todas son numéricas van
 * de menor a mayor; si no, primero las propias y luego las hermanas.
 */
export function opcionesDeTalla(product: Producto, variantes: VarianteProducto[]): OpcionTalla[] {
  const { tallasPropias, hermanasPorTalla } = tallasDesdeProducto(product, variantes)
  const opciones: OpcionTalla[] = [
    ...tallasPropias.map((talla) => ({ talla, origen: 'propia' as const, stock: null })),
    ...[...hermanasPorTalla.entries()].map(([talla, v]) => ({
      talla, origen: 'hermana' as const, id: v.id, stock: v.stock ?? 0,
    })),
  ]
  if (opciones.length > 1 && opciones.every((o) => /^\d+([.,]\d+)?$/.test(o.talla))) {
    opciones.sort((a, b) => parseFloat(a.talla.replace(',', '.')) - parseFloat(b.talla.replace(',', '.')))
  }
  return opciones
}

/**
 * La cabecera compacta (44:1775, 44:1849, 44:1917) oculta la línea de stock porque la ficha con
 * talla avisa el stock bajo dentro del selector de talla (44:1840). Sin talla (por ejemplo, solo
 * color) ese aviso no existe: la cabecera conserva "Quedan N" de 28:839 para no perder la escasez.
 */
export function avisoStockBajoSinTalla(product: Producto, variantes: VarianteProducto[]): boolean {
  if (esProductoCotizable(product) || product.esPersonalizado === true || estaAgotado(product)) return false
  if (Number(product.stock) > STOCK_BAJO_MAX) return false
  return opcionesDeTalla(product, variantes).length === 0
}

/**
 * La ficha (`GET /productos/:id`) no trae el nombre ni el slug de la tienda; el listado público sí.
 * Se toman de cualquier producto del mismo negocio para dibujar la fila de tienda del Figma `28:839`.
 */
export function tiendaDesdeCatalogo(
  lista: Pick<Producto, 'empresaId' | 'empresaNombre' | 'empresaSlug'>[],
  empresaId: Producto['empresaId'],
): { empresaNombre: string; empresaSlug: string } | null {
  if (empresaId === null || empresaId === undefined) return null
  const hallado = lista.find((p) => String(p.empresaId) === String(empresaId) && p.empresaNombre && p.empresaSlug)
  return hallado ? { empresaNombre: hallado.empresaNombre as string, empresaSlug: hallado.empresaSlug as string } : null
}

/** La marca es la del propio negocio cuando su nombre está contenido en el de la tienda (sin tildes ni mayúsculas). */
export function marcaEsLaTienda(product: Pick<Producto, 'marcaNombre' | 'empresaNombre'>): boolean {
  if (!product.marcaNombre || !product.empresaNombre) return false
  return normalizarBusqueda(product.empresaNombre).includes(normalizarBusqueda(product.marcaNombre))
}
