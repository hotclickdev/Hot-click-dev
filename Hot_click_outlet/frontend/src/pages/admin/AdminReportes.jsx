import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import AdminLayout from '@/layouts/AdminLayout'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import { ventaService } from '@/services/orderService'
import { formatPrice, formatDate } from '@/utils/format'

const QUICK = [
  { label: 'Hoy', days: 0 },
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '3 meses', days: 90 },
  { label: 'Todo', days: -1 },
]

function toISO(date) { return date.toISOString().slice(0, 10) }

export default function AdminReportes() {
  const { t } = useTranslation()
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)
  const [quick, setQuick] = useState(30)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [metodoPago, setMetodoPago] = useState('')
  const [estado, setEstado] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    ventaService.getAll()
      .then(({ data }) => setVentas(Array.isArray(data) ? data : data?.content ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const applyQuick = (days) => {
    setQuick(days)
    if (days === -1) { setDesde(''); setHasta(''); return }
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    setDesde(toISO(start))
    setHasta(toISO(end))
  }

  const filtered = useMemo(() => {
    return ventas.filter((v) => {
      const fecha = (v.fechaCreacion ?? '').slice(0, 10)
      if (desde && fecha < desde) return false
      if (hasta && fecha > hasta) return false
      if (metodoPago && v.metodoPago !== metodoPago) return false
      if (estado && v.estado !== estado) return false
      if (search) {
        const q = search.toLowerCase()
        const name = (v.nombreCliente ?? v.cliente?.nombre ?? '').toLowerCase()
        if (!name.includes(q) && !String(v.id).includes(q)) return false
      }
      return true
    })
  }, [ventas, desde, hasta, metodoPago, estado, search])

  const totalIngresos = filtered
    .filter((v) => v.estado === 'COMPLETADO' || v.estado === 'ENTREGADO')
    .reduce((s, v) => s + (v.total ?? 0), 0)
  const completadas = filtered.filter((v) => v.estado === 'COMPLETADO' || v.estado === 'ENTREGADO').length
  const ticketPromedio = completadas > 0 ? totalIngresos / completadas : 0

  const metodos = [...new Set(ventas.map((v) => v.metodoPago).filter(Boolean))]
  const estados = [...new Set(ventas.map((v) => v.estado).filter(Boolean))]

  const exportCSV = () => {
    const header = 'ID,Cliente,Total,Método,Estado,Fecha'
    const rows = filtered.map((v) =>
      [v.id, v.nombreCliente ?? v.cliente?.nombre ?? '', v.total ?? 0, v.metodoPago ?? '', v.estado ?? '', (v.fechaCreacion ?? '').slice(0, 10)].join(',')
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `ventas-${toISO(new Date())}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[#e8e8ed]">{t('admin.reportes.title')}</h1>
            <p className="text-sm text-[#8e8e9a] mt-1">{t('admin.reportes.generate')}</p>
          </div>
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-[#8e8e9a] hover:text-white hover:bg-white/10 transition-all disabled:opacity-40"
          >
            ↓ {t('admin.reportes.download')}
          </button>
        </div>

        {/* Quick filters */}
        <div className="flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button
              key={q.days}
              onClick={() => applyQuick(q.days)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                quick === q.days
                  ? 'bg-[#4f7cff] text-white'
                  : 'bg-white/5 border border-white/10 text-[#8e8e9a] hover:text-white'
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* Advanced filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#8e8e9a]">{t('admin.reportes.from')}</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => { setDesde(e.target.value); setQuick(-1) }}
              className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#8e8e9a]">{t('admin.reportes.to')}</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => { setHasta(e.target.value); setQuick(-1) }}
              className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#8e8e9a]">{t('admin.reportes.type')}</label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60"
            >
              <option value="">Todos</option>
              {metodos.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#8e8e9a]">{t('admin.orders.status')}</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60"
            >
              <option value="">Todos</option>
              {estados.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <input
          type="text"
          placeholder={t('common.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm h-9 px-4 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm placeholder:text-[#8e8e9a]/60 focus:outline-none focus:border-[#4f7cff]/60"
        />

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Ventas en período', value: filtered.length, color: 'text-[#e8e8ed]' },
            { label: 'Ingresos (completadas)', value: formatPrice(totalIngresos), color: 'text-emerald-400' },
            { label: 'Completadas', value: completadas, color: 'text-[#4f7cff]' },
            { label: 'Ticket promedio', value: formatPrice(ticketPromedio), color: 'text-purple-400' },
          ].map((c) => (
            <div key={c.label} className="bg-[#111114] border border-white/8 rounded-2xl p-4">
              <p className="text-xs text-[#8e8e9a] mb-1">{c.label}</p>
              <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : (
          <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8">
                    {['#', t('admin.orders.client'), t('admin.orders.total'), t('admin.reportes.type'), t('admin.orders.date'), t('admin.orders.status')].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#8e8e9a] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-[#8e8e9a]">{t('common.noData')}</td></tr>
                  ) : filtered.map((v) => (
                    <tr key={v.id} className="hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3 text-[#8e8e9a] text-xs font-mono">#{v.id}</td>
                      <td className="px-4 py-3 text-[#e8e8ed]">{v.nombreCliente ?? v.cliente?.nombre ?? '—'}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-400">{formatPrice(v.total ?? 0)}</td>
                      <td className="px-4 py-3 text-[#8e8e9a] text-xs">{v.metodoPago ?? '—'}</td>
                      <td className="px-4 py-3 text-[#8e8e9a] text-xs">{v.fechaCreacion ? formatDate(v.fechaCreacion) : '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={v.estado === 'COMPLETADO' || v.estado === 'ENTREGADO' ? 'success' : 'warning'}>
                          {v.estado ?? '—'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length > 0 && (
              <div className="px-4 py-3 border-t border-white/8 text-xs text-[#8e8e9a]">
                {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
