// Supabase Storage Image Transformation utility
//
// When VITE_SUPABASE_TRANSFORMS=true (Supabase Pro), rewrites URLs to use the
// Image Transformation API for on-the-fly resize + WebP conversion.
//
// When transforms are disabled (default / free tier), images are served via the
// local /api/img proxy. This avoids cross-origin / ORB issues that occur when
// the browser fetches Supabase Storage URLs directly from the Render domain.

const TRANSFORMS_ENABLED = import.meta.env.VITE_SUPABASE_TRANSFORMS === 'true'
const STORAGE_SEGMENT = '/storage/v1/object/public/'
const RENDER_SEGMENT  = '/storage/v1/render/image/public/'

/** Returns a same-origin proxy URL for any Supabase Storage URL. */
function toProxyUrl(url) {
  if (!url || url.startsWith('/api/img')) return url

  // Handle regular object/public URLs
  let idx = url.indexOf(STORAGE_SEGMENT)
  if (idx !== -1) {
    const storagePath = url.substring(idx + STORAGE_SEGMENT.length)
    return `/api/img?p=${encodeURIComponent(storagePath)}`
  }

  // Handle render/image URLs (stored in DB by old builds with transforms enabled)
  // Strip query params (quality, format, width) and convert to proxy URL
  idx = url.indexOf(RENDER_SEGMENT)
  if (idx !== -1) {
    let storagePath = url.substring(idx + RENDER_SEGMENT.length)
    const qIdx = storagePath.indexOf('?')
    if (qIdx !== -1) storagePath = storagePath.substring(0, qIdx)
    return `/api/img?p=${encodeURIComponent(storagePath)}`
  }

  return url
}

/**
 * Returns an image URL suitable for display.
 *
 * - Transforms enabled: Supabase Image Transformation API (resize + WebP)
 * - Transforms disabled: same-origin proxy (/api/img) — avoids CORS/ORB
 *
 * @param {string} url      - Original Supabase public URL (or any URL)
 * @param {object} options
 * @param {number} [options.width]
 * @param {number} [options.height]
 * @param {number} [options.quality=80]
 * @param {string} [options.format='webp']
 * @returns {string}
 */
export function getOptimizedUrl(url, { width, height, quality = 80, format = 'webp' } = {}) {
  if (!url) return ''

  if (!TRANSFORMS_ENABLED) return toProxyUrl(url)

  if (!url.includes(STORAGE_SEGMENT)) return url
  const renderUrl = url.replace(STORAGE_SEGMENT, RENDER_SEGMENT)
  const params = new URLSearchParams({ quality: String(quality), format })
  if (width)  params.set('width',  String(width))
  if (height) params.set('height', String(height))
  return `${renderUrl}?${params.toString()}`
}

/**
 * Generates a srcset string for responsive images using Supabase transforms.
 * Returns empty string when transforms are disabled.
 *
 * @param {string} url
 * @param {number[]} widths - Array of breakpoint widths, e.g. [400, 800, 1200]
 * @param {number} [quality=80]
 * @returns {string}
 */
export function getSrcSet(url, widths, quality = 80) {
  if (!TRANSFORMS_ENABLED || !url || !url.includes(STORAGE_SEGMENT)) return ''
  return widths
    .map((w) => `${getOptimizedUrl(url, { width: w, quality })} ${w}w`)
    .join(', ')
}
