import type { Producto } from '@/types/producto'
import type { NegocioPublico } from '@/services/negocioService'
import { fotoProducto } from '@/components/comprador/productCardHelpers'

/** Máximo de slides por tipo (emprendimientos, productos, negocios). */
export const SLIDES_POR_TIPO = 4

export type SlideBanner = {
  clave: string
  etiqueta: string
  cta: string
  /** Destino único del slide: /tienda/<slug> o /productos/<id>. */
  to: string
  titulo: string
  detalle?: string
  foto: string | null
}

/** Un slide por negocio: su nombre, su foto (producto propio o logo) y el clic solo a su tienda. */
export function slidesNegocios(etiqueta: string, cta: string, negocios: NegocioPublico[], productos: Producto[]): SlideBanner[] {
  const out: SlideBanner[] = []
  const vistos = new Set<string>()
  for (const n of negocios) {
    const slug = n.slug?.trim()
    if (!slug || !n.nombre || vistos.has(slug)) continue
    vistos.add(slug)
    const prod = productos.find((p) => p.empresaSlug === slug && fotoProducto(p))
    out.push({
      clave: `${etiqueta}:${slug}`,
      etiqueta,
      cta,
      to: `/tienda/${encodeURIComponent(slug)}`,
      titulo: n.nombre,
      detalle: n.categoria || prod?.categoriaNombre || undefined,
      foto: n.logoUrl || (prod && fotoProducto(prod)) || null,
    })
    if (out.length >= SLIDES_POR_TIPO) break
  }
  return out
}

/** Un slide por producto con foto: nombre, negocio y el clic solo a su ficha. */
export function slidesProductos(etiqueta: string, cta: string, productos: Producto[]): SlideBanner[] {
  const out: SlideBanner[] = []
  const vistos = new Set<string>()
  for (const p of productos) {
    const foto = fotoProducto(p)
    if (p.id == null || !foto || !p.nombre || vistos.has(String(p.id))) continue
    vistos.add(String(p.id))
    out.push({
      clave: `${etiqueta}:${String(p.id)}`,
      etiqueta,
      cta,
      to: `/productos/${encodeURIComponent(String(p.id))}`,
      titulo: p.nombre,
      detalle: [p.empresaNombre ?? p.bodegaNombre, p.categoriaNombre].filter(Boolean).join(' · ') || undefined,
      foto,
    })
    if (out.length >= SLIDES_POR_TIPO) break
  }
  return out
}
