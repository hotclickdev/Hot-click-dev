import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { cuponService } from '@/services/cuponService'
import type { JsonBody } from '@/types/api'
import { PAGE_SIZE, type CuponAdmin, type CuponesStats, type FiltroCupon } from './cuponesHelpers'

type ShowToast = (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void

type AdminCuponesActionsDeps = {
  showToast: ShowToast
  filter: FiltroCupon
  setStats: Dispatch<SetStateAction<CuponesStats | null>>
  setCupones: Dispatch<SetStateAction<CuponAdmin[]>>
  setTotal: Dispatch<SetStateAction<number>>
  setPage: Dispatch<SetStateAction<number>>
  setFilter: Dispatch<SetStateAction<FiltroCupon>>
  setSearch: Dispatch<SetStateAction<string>>
  setLoading: Dispatch<SetStateAction<boolean>>
}

type CuponesPageEnvelope = {
  data?: {
    content?: CuponAdmin[]
    totalElements?: number
  }
}

export function useAdminCuponesActions(deps: AdminCuponesActionsDeps) {
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
      setStats((data as { data?: CuponesStats }).data as CuponesStats)
    } catch { /* ok */ }
  }, [setStats])

  const fetchCupones = useCallback(async (p = 0, f: FiltroCupon = undefined) => {
    setLoading(true)
    try {
      const params: JsonBody = { page: p, size: PAGE_SIZE }
      if (f !== undefined) params.usado = f
      const { data } = await cuponService.getAll(params)
      const pageData = (data as CuponesPageEnvelope).data
      setCupones(pageData?.content as CuponAdmin[])
      setTotal(pageData?.totalElements as number)
    } catch { showToast('Error cargando cupones', 'error') }
    finally { setLoading(false) }
  }, [setCupones, setLoading, setTotal, showToast])

  const applyFilter = useCallback((val: FiltroCupon) => {
    setFilter(val)
    setPage(0)
    setSearch('')
    fetchCupones(0, val)
  }, [fetchCupones, setFilter, setPage, setSearch])

  const goPage = useCallback((p: number) => {
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
