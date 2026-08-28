import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import { useAdminCuponesActions } from './cupones/useAdminCuponesActions'
import CuponesTable from './cupones/CuponesTable'
import type { CuponAdmin, CuponesStats, FiltroCupon } from './cupones/cuponesHelpers'

export default function AdminCupones() {
  const { showToast } = useToast()
  const [stats, setStats]       = useState<CuponesStats | null>(null)
  const [cupones, setCupones]   = useState<CuponAdmin[]>([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(0)
  const [filter, setFilter]     = useState<FiltroCupon>(undefined)
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')

  const { fetchStats, fetchCupones, applyFilter, goPage } = useAdminCuponesActions({
    showToast,
    filter,
    setStats,
    setCupones,
    setTotal,
    setPage,
    setFilter,
    setSearch,
    setLoading,
  })

  useEffect(() => {
    fetchStats() // eslint-disable-line react-hooks/set-state-in-effect -- carga al montar
    fetchCupones(0, undefined)
  }, [fetchStats, fetchCupones])

  const visible = search.trim()
    ? cupones.filter(c =>
        c.codigo.includes(search.toUpperCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase()))
    : cupones

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--hc-text)' }}>Cupones de descuento</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
          Códigos generados desde el popup de bienvenida. Un uso por cuenta.
        </p>
      </div>

      <CuponesTable
        stats={stats}
        filter={filter}
        search={search}
        loading={loading}
        visible={visible}
        page={page}
        total={total}
        onApplyFilter={applyFilter}
        onSearch={setSearch}
        onGoPage={goPage}
      />
    </div>
  )
}
