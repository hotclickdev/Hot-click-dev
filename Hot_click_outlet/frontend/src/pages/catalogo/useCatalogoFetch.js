import { useState, useEffect, useCallback, useRef } from 'react'
import { productService, normalizeProduct } from '@/services/productService'
import { marcaService } from '@/services/marcaService'
import { convenioService, listaConvenios } from '@/services/convenioService'
import { colapsarGruposVariante } from './catalogoHelpers'
import { PAGE_SIZE } from './catalogoFiltros'

/**
 * Fetch de productos, categorías, marcas y convenios del catálogo.
 */
export function useCatalogoFetch(toast, page, setPage) {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [marcas, setMarcas] = useState([])
  const [loading, setLoading] = useState(true)
  const [, setTotalPages] = useState(1)
  const [convenios, setConvenios] = useState([])

  const fetchProducts = useCallback(async (p = 0) => {
    setLoading(true)
    try {
      const { data } = await productService.getAll(p, PAGE_SIZE)
      const content = colapsarGruposVariante((data.content ?? data ?? []).map(normalizeProduct))
      const safeTotal = data.totalElements != null
        ? Math.ceil(data.totalElements / PAGE_SIZE)
        : (data.totalPages ?? 1)
      const clampedTotal = Math.max(1, safeTotal)

      if (content.length === 0 && p > 0) {
        const { data: d0 } = await productService.getAll(0, PAGE_SIZE)
        const c0 = colapsarGruposVariante((d0.content ?? d0 ?? []).map(normalizeProduct))
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
      .then(({ data }) => setCategories(data ?? []))
      .catch(() => toast({ message: 'Error al cargar categorías', type: 'error' }))
    marcaService.getPublicas().then((r) => {
      const ms = r.data?.data ?? r.data ?? []
      setMarcas(Array.isArray(ms) ? ms : [])
    }).catch(() => toast({ message: 'Error al cargar marcas', type: 'error' }))
    convenioService.getPublicos()
      .then((r) => setConvenios(listaConvenios(r)))
      .catch(() => toast({ message: 'Error al cargar convenios', type: 'error' }))
  }, [toast])

  return { products, categories, marcas, loading, convenios }
}
