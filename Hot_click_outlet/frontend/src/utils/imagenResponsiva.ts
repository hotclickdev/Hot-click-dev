/**
 * Imágenes responsivas para fotos de catálogo. Hoy solo Unsplash permite pedir otro ancho y
 * formato por la URL (`w`, `auto=format` → WebP/AVIF según el navegador). Para otras fuentes
 * (S3) devuelve `undefined` y el navegador usa el `src` original.
 */
const ANCHOS = [200, 400, 800] as const

export function srcSetResponsivo(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return undefined
  }
  if (u.hostname !== 'images.unsplash.com') return undefined
  return ANCHOS.map((w) => {
    const c = new URL(u.toString())
    c.searchParams.set('w', String(w))
    c.searchParams.set('auto', 'format')
    if (!c.searchParams.has('q')) c.searchParams.set('q', '75')
    return `${c.toString()} ${w}w`
  }).join(', ')
}

/** Tarjeta: 2 columnas en celular, ~240 px en escritorio. */
export const SIZES_TARJETA = '(max-width: 640px) 50vw, 240px'