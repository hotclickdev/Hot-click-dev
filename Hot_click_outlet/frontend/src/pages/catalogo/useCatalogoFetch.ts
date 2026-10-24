import { useState, useEffect, useCallback, useRef, type Dispatch, type SetStateAction } from 'react'
import { productService, normalizeProduct } from '@/services/productService'
import { marcaService } from '@/services/marcaService'
import { colapsarGruposVariante } from './catalogoHelpers'
import type { Producto, ProductoBackend } from '@/types/producto'
import type { CatalogCategoria, CatalogMarca } from './catalogoTipos'

/** Tope del backend (MAX_PAGE_SIZE_PUBLIC) por request. */
export const CATALOGO_LOTE = 50
/** Techo de seguridad: 40 lotes = 2000 productos. */
export const CATALOGO_MAX_LOTES = 40

/** Máximo de requests de lotes en vuelo a la vez. */
export const CATALOGO_CONCURRENCIA = 4

/** Map async con a lo sumo `limite` tareas en vuelo; conserva el orden de `items`. */
export async function mapConConcurrencia<T, R>(
  items: T[], limite: number, fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, limite), items.length) }, worker))
  return out
}

/**
 * Trae el catálogo público completo en lotes. Filtros, facetas y conteos se calculan en el
 * cliente: con una sola página (24) /productos?cat=X mostraba 0 aunque la categoría tuviera productos.
 */
export async function cargarCatalogoCompleto(
  getPage: (page: number, size: number) => Promise<{ data: unknown }>,
): Promise<ProductoBackend[]> {
  const { data } = await getPage(0, CATALOGO_LOTE)
  const primera = listaDesdeRespuesta(data)
  const total = (data as PaginaProductos).totalElements
  const lotes = Math.min(CATALOGO_MAX_LOTES, total != null ? Math.ceil(total / CATALOGO_LOTE) : 1)
  const resto = await mapConConcurrencia(
    Array.from({ length: Math.max(0, lotes - 1) }, (_, i) => i + 1),
    CATALOGO_CONCURRENCIA,
    (pg) => getPage(pg, CATALOGO_LOTE),
  )
  return [...primera, ...resto.flatMap((r) => listaDesdeRespuesta(r.data))]
}

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
 * Fetch de productos, categorías y marcas del catálogo.
 * Carga el catálogo público completo (en lotes) para filtrar en el cliente.
 */
export function useCatalogoFetch(
  toast: ToastCatalogo,
  page: number,
  setPage: Dispatch<SetStateAction<number>>,
  sort = 'default',
) {
  const [products, setProducts] = useState<Producto[]>([])
  const [categories, setCategories] = useState<CatalogCategoria[]>([])
  const [marcas, setMarcas] = useState<CatalogMarca[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const paraVos = sort === 'para_vos'

  const fetchProducts = useCallback(async (p = 0) => {
    setLoading(true)
    try {
      const todos = await cargarCatalogoCompleto((pg, size) => productService.getAll(pg, size))
      setProducts(colapsarGruposVariante(todos.map(normalizeProduct) as Producto[]))
      setError(false)
      setPage(paraVos ? 0 : p)
    } catch {
      toast({ message: 'Error al cargar productos', type: 'error' })
      setError(true)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [toast, setPage, paraVos])

  const initialPageRef = useRef(page)
  const sortRef = useRef(sort)
  useEffect(() => {
    if (sortRef.current !== sort) {
      sortRef.current = sort
      fetchProducts(paraVos ? 0 : initialPageRef.current)
      return
    }
    fetchProducts(initialPageRef.current)
  }, [fetchProducts, sort, paraVos])

  useEffect(() => {
    productService.getCategories()
      .then(({ data }) => setCategories((data ?? []) as CatalogCategoria[]))
      .catch(() => toast({ message: 'Error al cargar categorías', type: 'error' }))
    marcaService.getPublicas().then((r) => {
      const data = r.data as { data?: unknown } | undefined
      const ms = data?.data ?? data ?? []
      setMarcas(Array.isArray(ms) ? ms as CatalogMarca[] : [])
    }).catch(() => toast({ message: 'Error al cargar marcas', type: 'error' }))
  }, [toast])

  const retry = useCallback(() => fetchProducts(page), [fetchProducts, page])

  return { products, categories, marcas, loading, error, retry }
}
