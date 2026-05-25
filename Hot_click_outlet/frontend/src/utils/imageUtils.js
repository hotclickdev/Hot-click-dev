// Supabase Storage Image Transformation utility
//
// When VITE_SUPABASE_TRANSFORMS=true (Supabase Pro), rewrites URLs to use the
// Image Transformation API for on-the-fly resize + WebP conversion.
//
// When transforms are disabled (default / free tier), the original Supabase
// public URL is returned directly. The bucket HOT_CLICK is public so <img>
// tags can load cross-origin images without CORS or ORB issues.

const TRANSFORMS_ENABLED = import.meta.env.VITE_SUPABASE_TRANSFORMS === 'true'
const STORAGE_SEGMENT = '/storage/v1/object/public/'
const RENDER_SEGMENT  = '/storage/v1/render/image/public/'

/** Strips render/image URLs back to the plain public storage URL. */
function normalizeUrl(url) {
  if (!url) return url
  const idx = url.indexOf(RENDER_SEGMENT)
  if (idx !== -1) {
    let path = url.substring(idx + RENDER_SEGMENT.length)
    const qIdx = path.indexOf('?')
    if (qIdx !== -1) path = path.substring(0, qIdx)
    const base = url.substring(0, idx)
    return base + STORAGE_SEGMENT + path
  }
  return url
}

/**
 * Returns an image URL suitable for display.
 *
 * - Transforms enabled: Supabase Image Transformation API (resize + WebP)
 * - Transforms disabled: original Supabase public URL (bucket is public)
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

  if (!TRANSFORMS_ENABLED) return normalizeUrl(url)

  const normalized = normalizeUrl(url)
  if (!normalized.includes(STORAGE_SEGMENT)) return normalized
  const renderUrl = normalized.replace(STORAGE_SEGMENT, RENDER_SEGMENT)
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
