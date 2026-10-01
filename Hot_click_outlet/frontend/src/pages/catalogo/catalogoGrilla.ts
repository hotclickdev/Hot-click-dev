/**
 * Grilla de tarjetas del catálogo (Figma `26:722`, `43:1530`, `30:1824`): pistas fijas de 167 px,
 * como la tarjeta de Figma. Móvil: 2 columnas repartidas en el ancho (en Figma van a 0 y 191 de 358).
 * Desde `sm`: tantas columnas de 167 como quepan, alineadas a la izquierda, 16 px entre columnas y 20 entre filas
 * (desktop `30:1963`: flex-wrap con gap 20/16). En móvil 12 px entre filas (`43:1575`).
 */
export const CLASE_GRILLA_TARJETAS =
  'grid grid-cols-[repeat(2,minmax(0,167px))] justify-between gap-y-3 sm:grid-cols-[repeat(auto-fill,167px)] sm:justify-start sm:gap-x-4 sm:gap-y-5'
