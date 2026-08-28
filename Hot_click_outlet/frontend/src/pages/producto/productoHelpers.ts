import type { TFunction } from 'i18next'
import type { Producto } from '@/types/producto'
import type { BadgeProps } from '@/components/ui/Badge'

export type TipoVideo = 'youtube' | 'tiktok' | 'instagram'

export type VideoDetectado = {
  type: TipoVideo
  embedUrl: string
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
}

export type ImagenProductoApi = {
  posicion?: unknown
  urlImagen?: unknown
}

export function parseTallas(talla: string | null | undefined): string[] {
  if (!talla) return []
  return talla.split(/[-,/]/).map((s) => s.trim()).filter(Boolean)
}

export function detectVideo(url: string | null | undefined): VideoDetectado | null {
  if (!url) return null

  const ytPatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const re of ytPatterns) {
    const m = url.match(re)
    if (m) return { type: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1` }
  }

  const ttMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/)
  if (ttMatch) return { type: 'tiktok', embedUrl: `https://www.tiktok.com/embed/v2/${ttMatch[1]}` }

  const igMatch = url.match(/instagram\.com\/(p|reel)\/([A-Za-z0-9_-]+)/)
  if (igMatch) return { type: 'instagram', embedUrl: `https://www.instagram.com/${igMatch[1]}/${igMatch[2]}/embed/` }

  return null
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
  const fallbackDesc  = `${product.descripcion || product.nombre} | Precio: ₡${new Intl.NumberFormat('es-CR').format(product.precio)} | Envíos en Costa Rica`
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

export function stockDesdeProducto(product: Producto, t: TFunction): { badge: NonNullable<BadgeProps['variant']>; label: string } {
  let badge: NonNullable<BadgeProps['variant']> = 'success'
  if (product.stock === 0) badge = 'danger'
  else if (product.stock <= 3) badge = 'warning'
  let label = t('product.inStock')
  if (product.stock === 0) label = t('product.outOfStock')
  else if (product.stock <= 3) label = t('product.lowStock', { count: product.stock })
  return { badge, label }
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
