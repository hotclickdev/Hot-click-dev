import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import useUiStore from '@/store/uiStore'
import { productService, normalizeProduct } from '@/services/productService'
import { marcaService } from '@/services/marcaService'
import { analytics } from '@/utils/analytics'
import {
  getRecent,
  saveRecent,
  getProductCache,
  setProductCache,
  getBrandCache,
  setBrandCache,
  RECENT_KEY,
} from './searchPanelHelpers'

/** Estado y handlers del panel de búsqueda — bit-idéntico al original. */
export function useSearchPanel() {
  const searchOpen = useUiStore((s) => s.searchOpen)
  const setSearchOpen = useUiStore((s) => s.setSearchOpen)
  const navigate = useNavigate()
  const location = useLocation()

  const [query, setQuery] = useState('')
  const [allProducts, setAllProducts] = useState(getProductCache() ?? [])
  const [allBrands, setAllBrands] = useState(getBrandCache() ?? [])
  const [loading, setLoading] = useState(false)
  const [recent, setRecent] = useState([])
  const inputRef = useRef(null)
  const analyticsTimer = useRef(null)

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
        const products = (data.content ?? data ?? []).map(normalizeProduct)
        setProductCache(products)
        setAllProducts(products)
      }) : Promise.resolve(),
      needsBrands ? marcaService.getPublicas().then((r) => {
        const brands = r.data?.data ?? r.data ?? []
        setBrandCache(Array.isArray(brands) ? brands : [])
        setAllBrands(getBrandCache())
      }) : Promise.resolve(),
    ])
      .catch(() => {})
      .finally(() => {
        setLoading(false)
        setTimeout(() => inputRef.current?.focus(), 60)
      })
  }, [searchOpen])

  useEffect(() => {
    if (!searchOpen) return
    const handler = (e) => { if (e.key === 'Escape') setSearchOpen(false) }
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
    clearTimeout(analyticsTimer.current)
    if (query.trim().length > 1) {
      analyticsTimer.current = setTimeout(() => {
        analytics.searchQuery(query.trim(), productResults.length)
      }, 900)
    }
    return () => clearTimeout(analyticsTimer.current)
  }, [query, productResults.length])

  const brandProductCount = useMemo(() => {
    if (!brandResults.length) return {}
    return Object.fromEntries(
      brandResults.map((b) => [b.id, allProducts.filter((p) => String(p.marcaId) === String(b.id)).length])
    )
  }, [brandResults, allProducts])

  const hasResults = brandResults.length > 0 || productResults.length > 0

  const close = () => setSearchOpen(false)

  const selectBrand = (brand) => {
    saveRecent(brand.nombreMarca)
    close()
    navigate(`/productos?marcaId=${brand.id}`)
  }

  const selectProduct = (product) => {
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
