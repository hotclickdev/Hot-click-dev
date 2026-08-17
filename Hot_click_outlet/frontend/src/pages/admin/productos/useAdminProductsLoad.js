import { useCallback, useRef } from 'react'
import { productService } from '@/services/productService'
import { warehouseService } from '@/services/orderService'
import { marcaService } from '@/services/marcaService'
import { PROD_PAGE_SIZE } from './productosHelpers'

/**
 * Carga paginada de productos, categorías, bodegas y marcas.
 * @param {object} deps
 */
export function useAdminProductsLoad(deps) {
  const {
    prodPage,
    setLoading,
    setLoadError,
    setProducts,
    setTotalProds,
    setCategories,
    setBodegas,
    setMarcas,
  } = deps

  const loadIdRef = useRef(0)

  const load = useCallback(async (page = prodPage) => {
    const id = ++loadIdRef.current
    setLoading(true)
    setLoadError(false)
    try {
      const [prodsRes, catsRes, bodsRes, marcsRes] = await Promise.allSettled([
        productService.adminGetAll(page, PROD_PAGE_SIZE),
        productService.getCategories(),
        warehouseService.getAll(),
        marcaService.getAll(),
      ])
      if (id !== loadIdRef.current) return
      if (prodsRes.status === 'rejected') throw prodsRes.reason
      const prods = prodsRes.value.data
      const cats = catsRes.status === 'fulfilled' ? (catsRes.value.data ?? []) : []
      const bods = bodsRes.status === 'fulfilled' ? (bodsRes.value.data ?? []) : []
      const marcsR = marcsRes.status === 'fulfilled' ? (marcsRes.value.data ?? []) : []
      const pageData = prods.content ?? prods ?? []
      setProducts(pageData)
      setTotalProds(prods.totalElements ?? pageData.length)
      setCategories(cats ?? [])
      setBodegas(Array.isArray(bods) ? bods : bods?.content ?? [])
      setMarcas(Array.isArray(marcsR) ? marcsR : [])
    } catch {
      if (id === loadIdRef.current) setLoadError(true)
    } finally {
      if (id === loadIdRef.current) setLoading(false)
    }
  }, [
    prodPage,
    setLoading,
    setLoadError,
    setProducts,
    setTotalProds,
    setCategories,
    setBodegas,
    setMarcas,
  ])

  return { load }
}
