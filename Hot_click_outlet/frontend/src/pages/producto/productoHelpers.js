// "talla" guarda las tallas disponibles como texto libre (ej. "37-38-39", "S,M,L") —
// se parsea en opciones individuales para que el cliente pueda elegir la suya.
export function parseTallas(talla) {
  if (!talla) return []
  return talla.split(/[-,/]/).map((s) => s.trim()).filter(Boolean)
}

// ── Detecta plataforma y retorna { type, embedUrl } o null ───────────────────
export function detectVideo(url) {
  if (!url) return null

  // YouTube
  const ytPatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const re of ytPatterns) {
    const m = url.match(re)
    if (m) return { type: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1` }
  }

  // TikTok — formato completo: tiktok.com/@user/video/ID
  const ttMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/)
  if (ttMatch) return { type: 'tiktok', embedUrl: `https://www.tiktok.com/embed/v2/${ttMatch[1]}` }

  // Instagram — post o reel
  const igMatch = url.match(/instagram\.com\/(p|reel)\/([A-Za-z0-9_-]+)/)
  if (igMatch) return { type: 'instagram', embedUrl: `https://www.instagram.com/${igMatch[1]}/${igMatch[2]}/embed/` }

  return null
}

/**
 * Título y descripción SEO del producto según el idioma del navegador.
 * Fallbacks: idioma activo → español → título/nombre y precio en colones.
 * @param {object} product
 * @param {string} userLang código ISO de dos letras (ej. 'es')
 * @returns {{ seoTitle: string, seoDescription: string }}
 */
export function seoDesdeProducto(product, userLang) {
  const seoByLang = {
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

/**
 * Pestañas de ficha según el contenido disponible.
 * @param {{ especificaciones?: string, comoUsar?: string }} product
 * @param {(key: string) => string} t
 * @returns {{ id: string, label: string }[]}
 */
export function tabsDesdeProducto(product, t) {
  return [
    product.especificaciones?.trim() ? { id: 'especificaciones', label: t('product.specsTab') } : null,
    product.comoUsar?.trim()        ? { id: 'como-usar',        label: t('product.howToUseTab') } : null,
  ].filter(Boolean)
}

/**
 * Variante de badge y etiqueta de stock para la ficha.
 * @param {{ stock: number }} product
 * @param {(key: string, opts?: object) => string} t
 * @returns {{ badge: string, label: string }}
 */
export function stockDesdeProducto(product, t) {
  let badge = 'success'
  if (product.stock === 0) badge = 'danger'
  else if (product.stock <= 3) badge = 'warning'
  let label = t('product.inStock')
  if (product.stock === 0) label = t('product.outOfStock')
  else if (product.stock <= 3) label = t('product.lowStock', { count: product.stock })
  return { badge, label }
}

/**
 * Tallas propias del producto y tallas de variantes hermanas.
 * Elegir una talla hermana navega a esa fila; una propia solo marca la selección local.
 * @param {{ talla?: string }} product
 * @param {{ id: number, talla?: string }[]} variantes
 * @returns {{ tallasPropias: string[], hermanasPorTalla: Map<string, object> }}
 */
export function tallasDesdeProducto(product, variantes) {
  const tallasPropias = parseTallas(product.talla)
  const hermanasPorTalla = new Map()
  variantes.forEach((v) => {
    if (v.talla && !hermanasPorTalla.has(v.talla)) hermanasPorTalla.set(v.talla, v)
  })
  tallasPropias.forEach((tOpt) => hermanasPorTalla.delete(tOpt))
  return { tallasPropias, hermanasPorTalla }
}
