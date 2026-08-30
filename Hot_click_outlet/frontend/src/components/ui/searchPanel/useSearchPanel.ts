import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import useUiStore from '@/store/uiStore'
import { productService, normalizeProduct } from '@/services/productService'
import { marcaService } from '@/services/marcaService'
import { analytics } from '@/utils/analytics'
import type { Producto, ProductoBackend } from '@/types/producto'
import {
  getRecent,
  saveRecent,
  getProductCache,
  setProductCache,
  getBrandCache,
  setBrandCache,
  RECENT_KEY,
  type MarcaBusqueda,
} from './searchPanelHelpers'

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

/** Estado y handlers del panel de búsqueda — bit-idéntico al original. */
export function useSearchPanel() {
  const searchOpen = useUiStore((s) => s.searchOpen)
  const setSearchOpen = useUiStore((s) => s.setSearchOpen)
  const navigate = useNavigate()
  const location = useLocation()

  const [query, setQuery] = useState('')
  const [allProducts, setAllProducts] = useState<Producto[]>(getProductCache() ?? [])
  const [allBrands, setAllBrands] = useState<MarcaBusqueda[]>(getBrandCache() ?? [])
  const [loading, setLoading] = useState(false)
  const [recent, setRecent] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const analyticsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setSearchOpen(false) }, [location.pathname])

  useEffect(() => {
    if (!searchOpen) { setQuery(''); return }
    setRecent(getRecent())

    const needsProducts = !getProductCache()
    const needsBrands = !getBrandCache()

    if (!needsProducts && !needsBrands) {
      setTimeout(() => inputRef.current?.focus(), 60)
      return
    }

    setLoading(true)
    Promise.all([
      needsProducts ? productService.getAll(0, 200).then(({ data }) => {
        const products = productosDesdeRespuesta(data)
        setProductCache(products)
        setAllProducts(products)
      }) : Promise.resolve(),
      needsBrands ? marcaService.getPublicas().then((r) => {
        const brands = marcasDesdeRespuesta(r.data)
        setBrandCache(brands)
        setAllBrands(getBrandCache() ?? [])
      }) : Promise.resolve(),
    ])
      .catch((err: unknown) => { console.error('[useSearchPanel] productos/marcas', err) })
      .finally(() => {
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

  const q = query.trim().toLowerCase()

  const brandResults = useMemo(() => {
    if (!q) return []
    return allBrands.filter((b) => b.nombreMarca?.toLowerCase().includes(q)).slice(0, 3)
  }, [q, allBrands])

  const productResults = useMemo(() => {
    if (!q) return []
    return allProducts
      .filter((p) =>
        p.nombre?.toLowerCase().includes(q) ||
        p.categoriaNombre?.toLowerCase().includes(q) ||
        p.marcaNombre?.toLowerCase().includes(q) ||
        p.descripcion?.toLowerCase().includes(q)
      )
      .slice(0, 6)
  }, [q, allProducts])

  useEffect(() => {
    clearTimeout(analyticsTimer.current ?? undefined)
    if (query.trim().length > 1) {
      analyticsTimer.current = setTimeout(() => {
        analytics.searchQuery(query.trim(), productResults.length)
      }, 900)
    }
    return () => clearTimeout(analyticsTimer.current ?? undefined)
  }, [query, productResults.length])

  const brandProductCount = useMemo(() => {
    if (!brandResults.length) return {} as Record<string, number>
    return Object.fromEntries(
      brandResults.map((b) => [b.id, allProducts.filter((p) => String(p.marcaId) === String(b.id)).length])
    )
  }, [brandResults, allProducts])

  const hasResults = brandResults.length > 0 || productResults.length > 0

  const close = () => setSearchOpen(false)

  const selectBrand = (brand: MarcaBusqueda) => {
    saveRecent(brand.nombreMarca as string)
    close()
    navigate(`/productos?marcaId=${brand.id}`)
  }

  const selectProduct = (product: Producto) => {
    saveRecent(query.trim() || product.nombre)
    close()
    navigate(`/productos/${product.id}`)
  }

  const viewAll = () => {
    const trimmed = query.trim()
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
    brandProductCount,
    hasResults,
    close,
    selectBrand,
    selectProduct,
    viewAll,
    clearRecent,
  }
}

export type SearchPanelModel = ReturnType<typeof useSearchPanel>
