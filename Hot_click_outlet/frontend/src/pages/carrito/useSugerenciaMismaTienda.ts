import { useEffect, useMemo, useState } from 'react'
import tiendaService from '@/services/tiendaService'
import { esProductoCotizable } from '@/utils/precioProducto'
import type { PaqueteCompra } from '@/pages/checkout/paquetesCompra'
import type { ItemCarrito } from '@/types/carrito'
import type { Producto } from '@/types/producto'

const PRODUCTOS_POR_TIENDA = 8

export type SugerenciaTienda = { clave: string; producto: Producto }

function slugDe(paquete: PaqueteCompra<ItemCarrito>): string | null {
  return paquete.items.find((item) => item.empresaSlug)?.empresaSlug ?? null
}

function elegible(producto: Producto, idsEnCarrito: Set<unknown>): boolean {
  return !idsEnCarrito.has(producto.id) && (producto.stock ?? 0) > 0 && !esProductoCotizable(producto)
}

/** Figma `37:1595`: un producto más de una tienda del pedido, cuyo envío ya está pagado. */
export function useSugerenciaMismaTienda(paquetes: PaqueteCompra<ItemCarrito>[]): SugerenciaTienda | null {
  const [catalogos, setCatalogos] = useState<Record<string, Producto[]>>({})
  const slugs = useMemo(
    () => paquetes.map(slugDe).filter((slug): slug is string => slug != null),
    [paquetes],
  )
  const clavesSlugs = slugs.join('|')

  useEffect(() => {
    const faltantes = clavesSlugs.split('|').filter((slug) => slug && !(slug in catalogos))
    if (faltantes.length === 0) return
    let cancelado = false
    Promise.all(faltantes.map(async (slug) => {
      const pagina: { content?: (Producto | null)[] } = await tiendaService.getProductos(slug, { size: PRODUCTOS_POR_TIENDA })
      return [slug, (pagina.content ?? []).filter((p): p is Producto => p != null)] as const
    }))
      .then((resultados) => {
        if (!cancelado) setCatalogos((previos) => ({ ...previos, ...Object.fromEntries(resultados) }))
      })
      .catch((error: unknown) => console.error('No se pudieron cargar productos de las tiendas del pedido', error))
    return () => { cancelado = true }
  }, [clavesSlugs, catalogos])

  return primeraSugerencia(paquetes, catalogos)
}

function primeraSugerencia(
  paquetes: PaqueteCompra<ItemCarrito>[],
  catalogos: Record<string, Producto[]>,
): SugerenciaTienda | null {
  const idsEnCarrito = new Set<unknown>(paquetes.flatMap((p) => p.items.map((item) => item.id)))
  for (const paquete of paquetes) {
    const slug = slugDe(paquete)
    const producto = slug ? catalogos[slug]?.find((p) => elegible(p, idsEnCarrito)) : undefined
    if (producto) return { clave: paquete.clave, producto }
  }
  return null
}
