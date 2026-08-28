import { useState, useEffect, useCallback, useRef, type Dispatch, type SetStateAction } from 'react'
import { productService, normalizeProduct } from '@/services/productService'
import { marcaService } from '@/services/marcaService'
import { convenioService, listaConvenios } from '@/services/convenioService'
import { colapsarGruposVariante } from './catalogoHelpers'
import { PAGE_SIZE } from './catalogoFiltros'
import type { Producto, ProductoBackend } from '@/types/producto'
import type { CatalogCategoria, CatalogConvenio, CatalogMarca } from './catalogoTipos'

type ToastCatalogo = (opts: { message: string; type?: 'success' | 'error' | 'warning' | 'info'; duration?: number }) => void

type PaginaProductos = {
  content?: unknown
  totalElements?: number
  totalPages?: number
}

function listaDesdeRespuesta(data: unknown): ProductoBackend[] {
  const pagina = data as PaginaProductos
  return (pagina.content ?? data ?? []) as ProductoBackend[]
}

/**
 * Fetch de productos, categorías, marcas y convenios del catálogo.
 */
export function useCatalogoFetch(
  toast: ToastCatalogo,
  page: number,
  setPage: Dispatch<SetStateAction<number>>,
) {
  const [products, setProducts] = useState<Producto[]>([])
  const [categories, setCategories] = useState<CatalogCategoria[]>([])
  const [marcas, setMarcas] = useState<CatalogMarca[]>([])
  const [loading, setLoading] = useState(true)
  const [, setTotalPages] = useState(1)
  const [convenios, setConvenios] = useState<CatalogConvenio[]>([])

  const fetchProducts = useCallback(async (p = 0) => {
    setLoading(true)
    try {
      const { data } = await productService.getAll(p, PAGE_SIZE)
      const content = colapsarGruposVariante(listaDesdeRespuesta(data).map(normalizeProduct) as Producto[])
      const pagina = data as PaginaProductos
      const safeTotal = pagina.totalElements != null
        ? Math.ceil(pagina.totalElements / PAGE_SIZE)
        : (pagina.totalPages ?? 1)
      const clampedTotal = Math.max(1, safeTotal)

      if (content.length === 0 && p > 0) {
        const { data: d0 } = await productService.getAll(0, PAGE_SIZE)
        const c0 = colapsarGruposVariante(listaDesdeRespuesta(d0).map(normalizeProduct) as Producto[])
        setProducts(c0)
        setTotalPages(clampedTotal)
        setPage(0)
      } else {
        setProducts(content)
        setTotalPages(clampedTotal)
        setPage(p)
      }
    } catch {
      toast({ message: 'Error al cargar productos', type: 'error' })
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [toast, setPage])

  const initialPageRef = useRef(page)
  useEffect(() => { fetchProducts(initialPageRef.current) }, [fetchProducts])

  useEffect(() => {
    productService.getCategories()
      .then(({ data }) => setCategories((data ?? []) as CatalogCategoria[]))
      .catch(() => toast({ message: 'Error al cargar categorías', type: 'error' }))
    marcaService.getPublicas().then((r) => {
      const data = r.data as { data?: unknown } | undefined
      const ms = data?.data ?? data ?? []
      setMarcas(Array.isArray(ms) ? ms as CatalogMarca[] : [])
    }).catch(() => toast({ message: 'Error al cargar marcas', type: 'error' }))
    convenioService.getPublicos()
      .then((r) => setConvenios(listaConvenios(r) as CatalogConvenio[]))
      .catch(() => toast({ message: 'Error al cargar convenios', type: 'error' }))
  }, [toast])

  return { products, categories, marcas, loading, convenios }
}
