import { useCallback, useEffect, useMemo, useState } from 'react'
import { productService } from '@/services/productService'
import {
  filtrarSistemaProductos,
  listaCategoriasDesdeRespuesta,
  listaProductosDesdeRespuesta,
  PAGE_SIZE,
} from './sistemaProductosHelpers'
import type { CategoriaAdmin } from '../productos/productosHelpers'
import type { Producto } from '@/types/producto'

const CARGA_MAX = 500

export type SistemaProductosPage = {
  products: Producto[]
  totalCatalogo: number
  total: number
  page: number
  setPage: (n: number | ((prev: number) => number)) => void
  loading: boolean
  loadError: boolean
  load: () => void
  search: string
  onSearch: (valor: string) => void
  filtro: string
  onFiltro: (valor: string) => void
  categoriaId: string
  onCategoria: (valor: string) => void
  categories: CategoriaAdmin[]
}

/**
 * Carga el catálogo del dueño y filtra en cliente (búsqueda / chips).
 */
export function useSistemaProductos(): SistemaProductosPage {
  const [products, setProducts] = useState<Producto[]>([])
  const [categories, setCategories] = useState<CategoriaAdmin[]>([])
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
      const pageData = listaProductosDesdeRespuesta(prods)
      setProducts(pageData)
      const cats = catsRes.data ?? []
      setCategories(listaCategoriasDesdeRespuesta(cats))
    } catch (err: unknown) {
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

  const onSearch = (valor: string) => { setSearch(valor); setPage(0) }
  const onFiltro = (valor: string) => { setFiltro(valor); setPage(0) }
  const onCategoria = (valor: string) => { setCategoriaId(valor); setPage(0) }

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
