import { useCallback, useEffect, useMemo, useState } from 'react'
import { productService } from '@/services/productService'
import { filtrarSistemaProductos, PAGE_SIZE } from './sistemaProductosHelpers'

const CARGA_MAX = 500

/**
 * Carga el catálogo del dueño y filtra en cliente (búsqueda / chips).
 */
export function useSistemaProductos() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [categoriaId, setCategoriaId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const [prodsRes, catsRes] = await Promise.all([
        productService.adminGetAll(0, CARGA_MAX),
        productService.getCategories().catch(() => ({ data: [] })),
      ])
      const prods = prodsRes.data
      const pageData = prods.content ?? prods ?? []
      setProducts(Array.isArray(pageData) ? pageData : [])
      const cats = catsRes.data ?? []
      setCategories(Array.isArray(cats) ? cats : [])
    } catch (err) {
      console.error('[SistemaProductos] carga', err)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load]) // eslint-disable-line react-hooks/set-state-in-effect -- carga al montar

  const filtrados = useMemo(
    () => filtrarSistemaProductos(products, { search, filtro, categoriaId }),
    [products, search, filtro, categoriaId],
  )

  const total = filtrados.length
  const desde = page * PAGE_SIZE
  const pagina = filtrados.slice(desde, desde + PAGE_SIZE)

  const onSearch = (valor) => { setSearch(valor); setPage(0) }
  const onFiltro = (valor) => { setFiltro(valor); setPage(0) }
  const onCategoria = (valor) => { setCategoriaId(valor); setPage(0) }

  return {
    products: pagina,
    totalCatalogo: products.length,
    total,
    page,
    setPage,
    loading,
    loadError,
    load,
    search,
    onSearch,
    filtro,
    onFiltro,
    categoriaId,
    onCategoria,
    categories,
  }
}
