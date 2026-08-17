import { useCallback } from 'react'
import { cuponService } from '@/services/cuponService'
import { PAGE_SIZE } from './cuponesHelpers'

/**
 * Handlers carga y paginación cupones — bit-idéntico al original.
 * @param {object} deps
 */
export function useAdminCuponesActions(deps) {
  const {
    showToast,
    filter,
    setStats,
    setCupones,
    setTotal,
    setPage,
    setFilter,
    setSearch,
    setLoading,
  } = deps

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await cuponService.getEstadisticas()
      setStats(data.data)
    } catch { /* ok */ }
  }, [setStats])

  const fetchCupones = useCallback(async (p = 0, f = undefined) => {
    setLoading(true)
    try {
      const params = { page: p, size: PAGE_SIZE }
      if (f !== undefined) params.usado = f
      const { data } = await cuponService.getAll(params)
      setCupones(data.data.content)
      setTotal(data.data.totalElements)
    } catch { showToast('Error cargando cupones', 'error') }
    finally { setLoading(false) }
  }, [setCupones, setLoading, setTotal, showToast])

  const applyFilter = useCallback((val) => {
    setFilter(val)
    setPage(0)
    setSearch('')
    fetchCupones(0, val)
  }, [fetchCupones, setFilter, setPage, setSearch])

  const goPage = useCallback((p) => {
    setPage(p)
    fetchCupones(p, filter)
  }, [fetchCupones, filter, setPage])

  return {
    fetchStats,
    fetchCupones,
    applyFilter,
    goPage,
  }
}
