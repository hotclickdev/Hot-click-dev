// Imágenes: se rutean por el proxy /api/img (Spring Boot + Thumbnailator), que las lee del bucket S3 de AWS
// (`aws.s3.public-url`) y devuelve JPEG al tamaño real mostrado. Supabase ya no se usa (decisión del 3-oct-2026);
// las URLs viejas con formato Supabase que sigan en la base se reconocen igual para pasar por el proxy.

const STORAGE_SEGMENT = '/storage/v1/object/public/'
const RENDER_SEGMENT  = '/storage/v1/render/image/public/'

// Prefijo de bucket de las URLs viejas (formato Supabase); el proxy lo quita antes de leer de S3.
const BUCKET_LEGADO = 'HOT_CLICK/'

/** Host público del bucket S3 (virtual-hosted o path-style). */
const HOST_S3 = /^[a-z0-9.-]+\.s3[.-]([a-z0-9-]+\.)?amazonaws\.com$/i

export type OptimizeOpts = {
  width?: number
  height?: number
  quality?: number
}

function normalizeUrl(url: string): string {
  const idx = url.indexOf(RENDER_SEGMENT)
  if (idx === -1) return url
  let path = url.substring(idx + RENDER_SEGMENT.length)
  const qIdx = path.indexOf('?')
  if (qIdx !== -1) path = path.substring(0, qIdx)
  return url.substring(0, idx) + STORAGE_SEGMENT + path
}

/**
 * Path dentro del bucket para el proxy, o `null` si la URL no es del almacenamiento propio.
 * - S3: "https://hotclick-media.s3.us-east-2.amazonaws.com/productos/abc.jpg" → "productos/abc.jpg"
 * - Legado: "https://xxx/storage/v1/object/public/HOT_CLICK/productos/abc.jpg" → "HOT_CLICK/productos/abc.jpg"
 */
export function extractBucketPath(url?: string | null): string | null {
  if (!url) return null
  const normalized = normalizeUrl(url)
  const idx = normalized.indexOf(STORAGE_SEGMENT)
  if (idx !== -1) {
    const path = normalized.substring(idx + STORAGE_SEGMENT.length)
    return path.startsWith(BUCKET_LEGADO) ? path : null
  }
  try {
    const u = new URL(normalized)
    if (!HOST_S3.test(u.hostname)) return null
    const path = decodeURIComponent(u.pathname.replace(/^\/+/, ''))
    return path && !path.includes('..') && !path.includes('%') ? path : null
  } catch {
    return null
  }
}

/**
 * URL optimizada para mostrar la imagen: `/api/img?p=…&w=N&h=N&q=N` si es del almacenamiento propio;
 * si no, la URL original.
 */
export function getOptimizedUrl(url?: string | null, { width, height, quality = 82 }: OptimizeOpts = {}) {
  if (!url) return ''
  const path = extractBucketPath(url)
  if (!path) return url
  const params = new URLSearchParams({ p: path, q: String(quality) })
  if (width)  params.set('w', String(width))
  if (height) params.set('h', String(height))
  return `/api/img?${params.toString()}`
}
