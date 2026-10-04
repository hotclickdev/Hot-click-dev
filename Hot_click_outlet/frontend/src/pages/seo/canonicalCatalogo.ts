const CATALOGO = 'https://hotclick.lat/productos'

/** Si el filtro es solo una categoría con landing, la canónica es /comprar/{slug}. */
export function hrefCanonicalCatalogo(soloCategoria: boolean, slug: string | undefined, indexable: boolean) {
  if (soloCategoria && slug && indexable) return `https://hotclick.lat/comprar/${slug}`
  return CATALOGO
}
