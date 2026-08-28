import type { Producto } from '@/types/producto'

/**
 * Chips del asesor de ficha. No mostrar "Alexa" en un taladro.
 */
export function chipsAsesorProducto(product: Producto | null | undefined): string[] {
  const texto = textoFicha(product)
  if (esHerramienta(texto)) {
    return [
      '¿Sirve para madera y concreto?',
      '¿Cómo se usa?',
      '¿Es fácil de instalar?',
      '¿Tiene garantía?',
      '¿Vale la pena?',
    ]
  }
  if (esSmartHome(texto)) {
    return [
      '¿Compatible con Alexa?',
      '¿Cómo se configura?',
      '¿Cómo se usa?',
      '¿Tiene garantía?',
      '¿Vale la pena?',
    ]
  }
  if (esMueble(texto)) {
    return [
      '¿Para qué espacio es ideal?',
      '¿Cómo se arma?',
      '¿Qué medidas tiene?',
      '¿Tiene garantía?',
      '¿Vale la pena?',
    ]
  }
  return [
    '¿Para qué sirve exactamente?',
    '¿Cómo se usa?',
    '¿Tiene garantía?',
    '¿Vale la pena?',
  ]
}

function textoFicha(p: Producto | null | undefined) {
  if (!p) return ''
  return [
    p.nombre, p.tags, p.categoriaNombre, p.especificaciones,
    p.comoUsar, p.descripcionCorta, p.descripcionLarga, p.descripcion,
  ].filter(Boolean).join(' ').toLowerCase()
}

function esHerramienta(t: string) {
  return /\b(taladro|herramienta|sierra|lija|broca|concreto|madera|atornillador|martillo)\b/.test(t)
}

function esSmartHome(t: string) {
  return /\b(alexa|google home|wifi|wi-fi|smart|inteligente|zigbee|homekit)\b/.test(t)
}

function esMueble(t: string) {
  return /\b(mueble|sofá|sofa|silla|mesa|estante|rack|cama|colchón|colchon)\b/.test(t)
}
