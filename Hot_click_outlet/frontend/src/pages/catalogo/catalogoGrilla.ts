/**
 * Grilla de tarjetas del catálogo (Figma `26:722`, `43:1530`, `30:1824`): pistas fijas de 167 px,
 * como la tarjeta de Figma. Móvil: 2 columnas repartidas en el ancho (en Figma van a 0 y 191 de 358).
 * Desde `sm`: tantas columnas de 167 como quepan, alineadas a la izquierda y con 16 px entre ellas.
 */
export const CLASE_GRILLA_TARJETAS =
  'grid grid-cols-[repeat(2,minmax(0,167px))] justify-between gap-y-4 sm:grid-cols-[repeat(auto-fill,167px)] sm:justify-start sm:gap-x-4'
