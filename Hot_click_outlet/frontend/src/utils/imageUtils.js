// Supabase Storage Image Transformation utility
//
// Transforms public storage URLs to use the Supabase Image Transformation API,
// which resizes images on-the-fly and converts them to WebP/AVIF.
//
// REQUIRES: Supabase Pro plan (or higher).
// To enable, add VITE_SUPABASE_TRANSFORMS=true to your .env file.
// Without it, all functions return the original URL unchanged.
//
// Docs: https://supabase.com/docs/guides/storage/serving/image-transformations

const TRANSFORMS_ENABLED = import.meta.env.VITE_SUPABASE_TRANSFORMS === 'true'
const STORAGE_SEGMENT = '/storage/v1/object/public/'
const RENDER_SEGMENT  = '/storage/v1/render/image/public/'

/**
 * Returns an optimized Supabase Storage URL with resize + format params.
 * Falls back to the original URL when transforms are disabled or the URL
 * is not from Supabase Storage.
 *
 * @param {string} url      - Original Supabase public URL
 * @param {object} options
 * @param {number} [options.width]    - Target width in px
 * @param {number} [options.height]   - Target height in px
 * @param {number} [options.quality=80] - 1-100 (default 80)
 * @param {string} [options.format='webp'] - 'webp' | 'avif' | 'origin'
 * @returns {string}
 */
export function getOptimizedUrl(url, { width, height, quality = 80, format = 'webp' } = {}) {
  if (!url) return ''
  if (!TRANSFORMS_ENABLED || !url.includes(STORAGE_SEGMENT)) return url

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
