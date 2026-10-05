import { productService, normalizeProduct } from '@/services/productService'
import { marcaService } from '@/services/marcaService'
import type { Producto, ProductoBackend } from '@/types/producto'
import { TAMANO_BUSQUEDA } from '@/pages/catalogo/buscarExplorar'
import { getBrandCache, getProductCache, setBrandCache, setProductCache, type MarcaBusqueda } from './searchPanelHelpers'

let vuelo: Promise<void> | null = null

function productosDesdeRespuesta(data: unknown): Producto[] {
  const pagina = data as { content?: unknown }
  const fuente = pagina.content ?? data ?? []
  if (!Array.isArray(fuente)) return []
  return fuente.map((item) => normalizeProduct(item as ProductoBackend) as Producto)
}

function marcasDesdeRespuesta(data: unknown): MarcaBusqueda[] {
  const envelope = data as { data?: unknown }
  const brands = envelope?.data ?? data ?? []
  return Array.isArray(brands) ? brands as MarcaBusqueda[] : []
}

/** Una sola carga de productos y marcas para el panel y el desplegable del header. */
export function asegurarCatalogoBusqueda(): Promise<void> {
  if (getProductCache() && getBrandCache()) return Promise.resolve()
  if (vuelo) return vuelo
  vuelo = Promise.all([
    getProductCache()
      ? Promise.resolve()
      : productService.getAll(0, TAMANO_BUSQUEDA).then(({ data }) => { setProductCache(productosDesdeRespuesta(data)) }),
    getBrandCache()
      ? Promise.resolve()
      : marcaService.getPublicas().then((respuesta) => { setBrandCache(marcasDesdeRespuesta(respuesta.data)) }),
  ])
    .then(() => undefined)
    .catch((err: unknown) => { console.error('[busqueda] productos/marcas', err) })
    .finally(() => { vuelo = null })
  return vuelo
}
