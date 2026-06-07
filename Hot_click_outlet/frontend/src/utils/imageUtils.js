// Image utility — dos modos:
//
// 1. PROXY (default): ruteamos imágenes de Supabase por /api/img con resize
//    en el servidor (Thumbnailator). No requiere Supabase Pro.
//    El proxy devuelve JPEG comprimido al tamaño real mostrado.
//
// 2. SUPABASE TRANSFORMS (TRANSFORMS_ENABLED=true): usa la API de Supabase
//    Image Transformation (requiere Supabase Pro) para WebP on-the-fly.

const TRANSFORMS_ENABLED = false   // true solo con Supabase Pro
const PROXY_ENABLED      = true    // proxy Spring Boot con Thumbnailator

const STORAGE_SEGMENT = '/storage/v1/object/public/'
const RENDER_SEGMENT  = '/storage/v1/render/image/public/'

// Prefijo del bucket esperado en las URLs de Supabase
const SUPABASE_BUCKET = 'HOT_CLICK/'

function normalizeUrl(url) {
  if (!url) return url
  const idx = url.indexOf(RENDER_SEGMENT)
  if (idx !== -1) {
    let path = url.substring(idx + RENDER_SEGMENT.length)
    const qIdx = path.indexOf('?')
    if (qIdx !== -1) path = path.substring(0, qIdx)
    return url.substring(0, idx) + STORAGE_SEGMENT + path
  }
  return url
}

/**
 * Extrae el path relativo dentro del bucket HOT_CLICK desde una URL de Supabase.
 * Ej: "https://xxx.supabase.co/storage/v1/object/public/HOT_CLICK/productos/abc.jpg"
 *     → "HOT_CLICK/productos/abc.jpg"
 * Retorna null si la URL no es del bucket esperado.
 */
function extractBucketPath(url) {
  if (!url) return null
  const normalized = normalizeUrl(url)
  const idx = normalized.indexOf(STORAGE_SEGMENT)
  if (idx === -1) return null
  const path = normalized.substring(idx + STORAGE_SEGMENT.length)
  if (!path.startsWith(SUPABASE_BUCKET)) return null
  return path
}

/**
 * Devuelve una URL optimizada para mostrar la imagen.
 *
 * - Con PROXY_ENABLED: /api/img?p=HOT_CLICK/...&w=N&h=N&q=N
 * - Con TRANSFORMS_ENABLED: URL de Supabase Image Transformation (Pro)
 * - Sin ninguno: URL original de Supabase
 *
 * @param {string} url    URL pública de Supabase Storage
 * @param {object} opts
 * @param {number} [opts.width]
 * @param {number} [opts.height]
 * @param {number} [opts.quality=82]
 * @returns {string}
 */
export function getOptimizedUrl(url, { width, height, quality = 82 } = {}) {
  if (!url) return ''

  if (PROXY_ENABLED) {
    const path = extractBucketPath(url)
    if (path) {
      const params = new URLSearchParams({ p: path, q: String(quality) })
      if (width)  params.set('w', String(width))
      if (height) params.set('h', String(height))
      return `/api/img?${params.toString()}`
    }
    // Si no es del bucket propio, devolvemos la URL original
    return url
  }

  if (!TRANSFORMS_ENABLED) return normalizeUrl(url)

  const normalized = normalizeUrl(url)
  if (!normalized.includes(STORAGE_SEGMENT)) return normalized
  const renderUrl = normalized.replace(STORAGE_SEGMENT, RENDER_SEGMENT)
  const params = new URLSearchParams({ quality: String(quality), format: 'webp' })
  if (width)  params.set('width',  String(width))
  if (height) params.set('height', String(height))
  return `${renderUrl}?${params.toString()}`
}

/**
 * Genera un srcset usando el proxy para imágenes responsivas.
 *
 * @param {string}   url
 * @param {number[]} widths  — ej. [400, 800, 1200]
 * @param {number}   [quality=82]
 * @returns {string}
 */
export function getSrcSet(url, widths, quality = 82) {
  if (!url) return ''
  if (!PROXY_ENABLED && !TRANSFORMS_ENABLED) return ''
  return widths
    .map((w) => `${getOptimizedUrl(url, { width: w, quality })} ${w}w`)
    .join(', ')
}
