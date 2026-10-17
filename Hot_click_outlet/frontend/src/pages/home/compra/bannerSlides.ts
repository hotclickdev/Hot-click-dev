import type { Producto } from '@/types/producto'
import type { NegocioDestacado } from '@/services/negocioService'
import { fotoProducto } from '@/components/comprador/productCardHelpers'
import { textoPrecioProducto } from '@/utils/precioProducto'

/** D3: máximo de elementos en «Negocio destacado» y en «Producto destacado». */
export const MAX_POR_BLOQUE = 5
/** Autoavance por elemento (HANDOFF §7). */
export const ROTACION_MS = 6000
/** Tras un toque, hover o swipe, el carrusel se reanuda solo después de este tiempo sin interacción. */
export const REANUDAR_MS = 10_000
/** Swipe: umbral horizontal en px. */
export const UMBRAL_SWIPE = 40

export type TipoBloque = 'descubri' | 'negocio' | 'producto'

export type ElementoCarrusel = {
  clave: string
  titulo: string
  /** Línea de detalle ya armada; vacía oculta la línea. */
  detalle: string
  /** Único destino: /descubri, /tienda/<slug> o /productos/<id>. Nunca contacto del vendedor. */
  to: string
  /** null → placeholder de marca. */
  foto: string | null
}

export type BloqueCarrusel = {
  tipo: TipoBloque
  elementos: ElementoCarrusel[]
  /** Solo Descubrí: hasta 2 fotos del catálogo, de ilustración. */
  fotos?: string[]
}

export type Posicion = { bloque: number; elemento: number }

const conTexto = (v: string | null | undefined) => (v ?? '').trim()

/** `{categoria} · {provincia}`; si falta uno, solo el otro; si faltan los dos, vacío. */
export function detalleNegocio(n: Pick<NegocioDestacado, 'categoria' | 'provincia'>): string {
  return [conTexto(n.categoria), conTexto(n.provincia)].filter(Boolean).join(' · ')
}

/** `{negocio} · ₡{precio}` con el precio real del producto. */
export function detalleProducto(p: Producto): string {
  const negocio = conTexto(p.empresaNombre)
  const precio = textoPrecioProducto(p)
  return [negocio, precio].filter(Boolean).join(' · ')
}

/** 1 o 2 iniciales para el monograma del placeholder. */
export function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w))
  const letras = palabras.slice(0, 2).map((w) => [...w.replace(/[^\p{L}\p{N}]/gu, '')][0] ?? '')
  return letras.join('').toLocaleUpperCase('es-CR') || 'H'
}

/**
 * Arma los bloques del carrusel (HANDOFF §5). Puro y con tests.
 * - Productos: solo `GET /productos/destacados`, únicos por id, orden admin, tope 5.
 * - Negocios: únicos por slug, orden del backend, tope 5.
 * - D2: un negocio del bloque 2 no aparece como dueño de un producto del bloque 3, salvo que eso deje vacío el bloque 3.
 * - Descubrí: 2 fotos del catálogo que no estén en los bloques 2 ni 3.
 * - Sin catálogo no hay carrusel (lista vacía). Se omite el bloque que queda vacío.
 */
export function armarBloques(
  productosDestacados: Producto[],
  negociosDestacados: NegocioDestacado[],
  catalogo: Producto[],
): BloqueCarrusel[] {
  if (catalogo.length === 0 && productosDestacados.length === 0) return []

  const usadosNeg = new Set<string>()
  const negocios: ElementoCarrusel[] = []
  for (const n of negociosDestacados) {
    const slug = conTexto(n.slug)
    const nombre = conTexto(n.nombre)
    if (!slug || !nombre || usadosNeg.has(slug)) continue
    if (negocios.length >= MAX_POR_BLOQUE) break
    usadosNeg.add(slug)
    negocios.push({
      clave: `negocio:${slug}`,
      titulo: nombre,
      detalle: detalleNegocio(n),
      to: `/tienda/${encodeURIComponent(slug)}`,
      foto: conTexto(n.logoUrl) || conTexto(n.fotoPortada) || null,
    })
  }

  const validos: Producto[] = []
  const vistos = new Set<string>()
  for (const p of productosDestacados) {
    if (p?.id == null || !conTexto(p.nombre) || vistos.has(String(p.id))) continue
    vistos.add(String(p.id))
    validos.push(p)
  }
  const aElemento = (p: Producto): ElementoCarrusel => ({
    clave: `producto:${String(p.id)}`,
    titulo: p.nombre.trim(),
    detalle: detalleProducto(p),
    to: `/productos/${encodeURIComponent(String(p.id))}`,
    foto: fotoProducto(p),
  })
  let productos = validos.filter((p) => !usadosNeg.has(conTexto(p.empresaSlug))).slice(0, MAX_POR_BLOQUE)
  // Excepción documentada (§5): si D2 deja vacío el bloque 3, se relaja la regla de negocio.
  if (productos.length === 0 && validos.length > 0) productos = validos.slice(0, MAX_POR_BLOQUE)
  const usadosProd = new Set(productos.map((p) => String(p.id)))

  const fotos: string[] = []
  for (const p of catalogo) {
    const foto = fotoProducto(p)
    if (p?.id == null || usadosProd.has(String(p.id)) || !foto || fotos.includes(foto)) continue
    fotos.push(foto)
    if (fotos.length >= 2) break
  }

  const bloques: BloqueCarrusel[] = [{
    tipo: 'descubri',
    elementos: [{ clave: 'descubri', titulo: '', detalle: '', to: '/descubri', foto: fotos[0] ?? null }],
    fotos,
  }]
  if (negocios.length > 0) bloques.push({ tipo: 'negocio', elementos: negocios })
  if (productos.length > 0) bloques.push({ tipo: 'producto', elementos: productos.map(aElemento) })
  return bloques
}

/** Orden del autoavance: elementos del bloque → siguiente bloque → del último vuelve al primero. */
export function siguiente(bloques: BloqueCarrusel[], pos: Posicion): Posicion {
  const actual = bloques[pos.bloque]
  if (!actual) return { bloque: 0, elemento: 0 }
  if (pos.elemento + 1 < actual.elementos.length) return { bloque: pos.bloque, elemento: pos.elemento + 1 }
  return { bloque: (pos.bloque + 1) % bloques.length, elemento: 0 }
}

/** Inverso de {@link siguiente}: el anterior va al último elemento del bloque previo. */
export function anterior(bloques: BloqueCarrusel[], pos: Posicion): Posicion {
  if (!bloques[pos.bloque]) return { bloque: 0, elemento: 0 }
  if (pos.elemento > 0) return { bloque: pos.bloque, elemento: pos.elemento - 1 }
  const previo = (pos.bloque - 1 + bloques.length) % bloques.length
  return { bloque: previo, elemento: Math.max(0, bloques[previo].elementos.length - 1) }
}

/** Swipe válido: horizontal, más allá del umbral y más horizontal que vertical. */
export function direccionSwipe(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) < UMBRAL_SWIPE || Math.abs(dx) <= Math.abs(dy)) return 0
  return dx < 0 ? 1 : -1
}
