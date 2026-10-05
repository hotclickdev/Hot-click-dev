import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import useUiStore from '@/store/uiStore'
import useChatStore from '@/store/chatStore'
import { filtrarProductosConsulta, LARGO_MAXIMO_CONSULTA, recortarConsulta, sugerenciasBusqueda } from '@/pages/catalogo/buscarExplorar'
import { RUTA_BUSCAR_FOTO } from '@/pages/buscar/rutasBuscar'
import { analytics } from '@/utils/analytics'
import { asegurarCatalogoBusqueda } from './searchPanelCatalogo'
import { useBuscarNegocios } from '@/components/comprador/negocios/useBuscarNegocios'
import { rutaTienda } from '@/components/comprador/negocios/negociosPublicos'
import type { NegocioPublico } from '@/services/negocioService'
import type { Producto } from '@/types/producto'
import {
  getRecent,
  saveRecent,
  getProductCache,
  getBrandCache,
  RECENT_KEY,
  type MarcaBusqueda,
} from './searchPanelHelpers'

const FILTER_DEBOUNCE_MS = 300

/** Estado y handlers del panel de búsqueda híbrida: productos en vivo, sugerencias, asistente y foto. */
export function useSearchPanel() {
  const searchOpen = useUiStore((s) => s.searchOpen)
  const setSearchOpen = useUiStore((s) => s.setSearchOpen)
  const navigate = useNavigate()
  const location = useLocation()

  const [query, setQueryState] = useState('')
  const setQuery = (valor: string) => setQueryState(valor.slice(0, LARGO_MAXIMO_CONSULTA))
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [allProducts, setAllProducts] = useState<Producto[]>(getProductCache() ?? [])
  const [allBrands, setAllBrands] = useState<MarcaBusqueda[]>(getBrandCache() ?? [])
  const [loading, setLoading] = useState(false)
  const [recent, setRecent] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const analyticsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setSearchOpen(false) }, [location.pathname])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), FILTER_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (!searchOpen) { setQueryState(''); setDebouncedQuery(''); return }
    setRecent(getRecent())

    const cachedProducts = getProductCache()
    const cachedBrands = getBrandCache()
    const needsProducts = !cachedProducts
    const needsBrands = !cachedBrands

    if (cachedProducts) setAllProducts(cachedProducts)
    if (cachedBrands) setAllBrands(cachedBrands)

    if (!needsProducts && !needsBrands) {
      setTimeout(() => inputRef.current?.focus(), 60)
      return
    }

    setLoading(true)
    void asegurarCatalogoBusqueda().finally(() => {
      setAllProducts(getProductCache() ?? [])
      setAllBrands(getBrandCache() ?? [])
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 60)
    })
  }, [searchOpen])

  useEffect(() => {
    if (!searchOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSearchOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [searchOpen, setSearchOpen])

  const q = debouncedQuery.trim().toLowerCase()

  const brandResults = useMemo(() => {
    if (!q) return []
    return allBrands.filter((b) => b.nombreMarca?.toLowerCase().includes(q)).slice(0, 3)
  }, [q, allBrands])

  const todosLosResultados = useMemo(
    () => filtrarProductosConsulta(allProducts, debouncedQuery),
    [debouncedQuery, allProducts],
  )
  const productResults = useMemo(() => todosLosResultados.slice(0, 6), [todosLosResultados])

  useEffect(() => {
    clearTimeout(analyticsTimer.current ?? undefined)
    if (debouncedQuery.trim().length > 1) {
      analyticsTimer.current = setTimeout(() => {
        analytics.searchQuery(debouncedQuery.trim(), productResults.length)
      }, 900)
    }
    return () => clearTimeout(analyticsTimer.current ?? undefined)
  }, [debouncedQuery, productResults.length])

  const brandProductCount = useMemo(() => {
    if (!brandResults.length) return {} as Record<string, number>
    return Object.fromEntries(
      brandResults.map((b) => [b.id, allProducts.filter((p) => String(p.marcaId) === String(b.id)).length])
    )
  }, [brandResults, allProducts])

  // Negocios por nombre o slug (backend, sin tildes): van arriba de los productos.
  const { negocios: negocioResults, cargando: cargandoNegocios } = useBuscarNegocios(searchOpen ? debouncedQuery : '')

  const sugerencias = useMemo(() => sugerenciasBusqueda(debouncedQuery, allProducts), [debouncedQuery, allProducts])

  const hasResults = brandResults.length > 0 || productResults.length > 0 || negocioResults.length > 0

  const close = () => setSearchOpen(false)

  const preguntarAsistente = () => {
    const texto = recortarConsulta(query)
    close()
    useChatStore.getState().open(texto || null)
  }

  const buscarConFoto = () => {
    close()
    navigate(RUTA_BUSCAR_FOTO)
  }

  const elegirSugerencia = (texto: string) => {
    const segura = recortarConsulta(texto)
    if (segura) saveRecent(segura)
    close()
    navigate(`/productos?search=${encodeURIComponent(segura)}`)
  }

  const selectBrand = (brand: MarcaBusqueda) => {
    saveRecent(brand.nombreMarca as string)
    close()
    navigate(`/productos?marcaId=${brand.id}`)
  }

  const selectNegocio = (negocio: NegocioPublico) => {
    saveRecent(recortarConsulta(query) || negocio.nombre)
    close()
    navigate(rutaTienda(negocio))
  }

  const selectProduct = (product: Producto) => {
    saveRecent(recortarConsulta(query) || product.nombre)
    close()
    navigate(`/productos/${product.id}`)
  }

  const viewAll = () => {
    const trimmed = recortarConsulta(query)
    if (trimmed) saveRecent(trimmed)
    close()
    navigate(trimmed ? `/productos?search=${encodeURIComponent(trimmed)}` : '/productos')
  }

  const clearRecent = () => {
    localStorage.removeItem(RECENT_KEY)
    setRecent([])
  }

  return {
    searchOpen,
    query,
    setQuery,
    loading,
    recent,
    inputRef,
    brandResults,
    productResults,
    negocioResults,
    cargandoNegocios,
    totalResultados: todosLosResultados.length,
    brandProductCount,
    hasResults,
    sugerencias,
    preguntarAsistente,
    buscarConFoto,
    elegirSugerencia,
    close,
    selectBrand,
    selectProduct,
    selectNegocio,
    viewAll,
    clearRecent,
  }
}

export type SearchPanelModel = ReturnType<typeof useSearchPanel>
