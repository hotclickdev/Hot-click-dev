import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Spinner from '@/components/ui/Spinner'
import { orderService } from '@/services/orderService'
import { formatPrice, formatDate } from '@/utils/format'
import ImportExportBar from '@/components/admin/ImportExportBar'

const QUICK_DAYS = [0, 7, 30, -1]

function toISO(d) { return d.toISOString().slice(0, 10) }

function KPI({ label, value, sub, color = '#4ade80' }) {
  return (
    <div className="bg-[#111114] border border-white/8 rounded-2xl p-5">
      <p className="text-xs text-[#8e8e9a] mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{formatPrice(value)}</p>
      {sub && <p className="text-xs text-[#8e8e9a] mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminFinanzas() {
  const { t } = useTranslation()
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [quick, setQuick]     = useState(30)
  const [desde, setDesde]     = useState('')
  const [hasta, setHasta]     = useState('')

  useEffect(() => {
    applyQuick(30)
    orderService.getAll()
      .then(({ data }) => {
        const raw = data?.data ?? data
        const all = Array.isArray(raw) ? raw : raw?.content ?? []
        setPedidos(all.filter(p => {
          const e = p.estado ?? p.estadoPedido
          return e === 'ENTREGADO' || e === 'COMPLETADO'
        }))
      })
      .finally(() => setLoading(false))
  }, [])

  const applyQuick = (days) => {
    setQuick(days)
    if (days === -1) { setDesde(''); setHasta(''); return }
    const end   = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    setDesde(toISO(start))
    setHasta(toISO(end))
  }

  const filtered = useMemo(() => pedidos.filter((p) => {
    const fecha = (p.fechaCreacion ?? p.fechaPedido ?? '').slice(0, 10)
    if (desde && fecha < desde) return false
    if (hasta && fecha > hasta) return false
    return true
  }), [pedidos, desde, hasta])

  const totalProductos = filtered.reduce((s, p) => s + (p.subtotal ?? ((p.total ?? p.totalPedido ?? 0) - (p.costoEnvio ?? 0))), 0)
  const totalEnvio     = filtered.reduce((s, p) => s + (p.costoEnvio ?? 0), 0)
  const totalCobrado   = filtered.reduce((s, p) => s + (p.total ?? p.totalPedido ?? 0), 0)

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[#e8e8ed]">{t('adminFinanzas.title')}</h1>
            <p className="text-sm text-[#8e8e9a] mt-1">{t('adminFinanzas.subtitle')}</p>
          </div>
          <ImportExportBar
            exportOnly
            data={filtered.map((p) => ({
              id: p.id,
              fecha: (p.fechaCreacion ?? p.fechaPedido ?? '').slice(0, 10),
              cliente: p.nombreCliente ?? '',
              subtotalProductos: p.subtotal ?? ((p.total ?? p.totalPedido ?? 0) - (p.costoEnvio ?? 0)),
              costoEnvio: p.costoEnvio ?? 0,
              totalCobrado: p.total ?? p.totalPedido ?? 0,
            }))}
            columns={['id','fecha','cliente','subtotalProductos','costoEnvio','totalCobrado']}
            filename="finanzas"
            sheetName="Finanzas"
          />
        </div>

        {/* Período */}
        <div className="flex flex-wrap gap-2">
          {QUICK_DAYS.map((days) => {
            const labelKey = days === 0 ? 'today' : days === 7 ? 'days7' : days === 30 ? 'days30' : 'all'
            return (
              <button key={days} onClick={() => applyQuick(days)}
                className="px-3 py-1.5 rounded-lg text-sm transition-all"
                style={{
                  backgroundColor: quick === days ? 'var(--hc-accent)' : 'color-mix(in srgb, var(--hc-text) 5%, transparent)',
                  color: quick === days ? 'white' : 'var(--hc-muted)',
                  border: `1px solid ${quick === days ? 'color-mix(in srgb, var(--hc-accent) 40%, transparent)' : 'var(--hc-border)'}`,
                }}>
                {t(`adminFinanzas.${labelKey}`)}
              </button>
            )
          })}
          <input type="date" value={desde} onChange={e => { setDesde(e.target.value); setQuick(-1) }}
            className="h-9 px-3 rounded-xl text-sm text-[#e8e8ed] focus:outline-none"
            />
          <input type="date" value={hasta} onChange={e => { setHasta(e.target.value); setQuick(-1) }}
            className="h-9 px-3 rounded-xl text-sm text-[#e8e8ed] focus:outline-none"
            />
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KPI
                label={t('adminFinanzas.kpiProducts')}
                value={totalProductos}
                sub={t('adminFinanzas.delivered', { count: filtered.length })}
                color="#4ade80"
              />
              <KPI
                label={t('adminFinanzas.kpiShipping')}
                value={totalEnvio}
                sub={t('adminFinanzas.shippingCount', { count: filtered.filter(p => (p.costoEnvio ?? 0) > 0).length })}
                color="#f59e0b"
              />
              <KPI
                label={t('adminFinanzas.kpiTotal')}
                value={totalCobrado}
                sub={t('adminFinanzas.productsPlusShipping')}
                color="#4f7cff"
              />
            </div>

            {/* Tabla */}
            <div>
              <h2 className="text-base font-semibold text-[#e8e8ed] mb-3">
                {t('adminFinanzas.tableTitle')} <span className="text-[#8e8e9a] text-sm font-normal">({filtered.length})</span>
              </h2>

              {filtered.length === 0 ? (
                <div className="bg-[#111114] border border-white/8 rounded-2xl p-10 text-center space-y-2">
                  <p className="text-[#e8e8ed] font-medium">Sin ventas en este período</p>
                  <p className="text-sm text-[#8e8e9a] max-w-sm mx-auto">
                    Las ventas aparecen aquí cuando un pedido se marca como <strong className="text-[#4ade80]">Entregado</strong> o <strong className="text-[#a855f7]">Completado</strong>.
                  </p>
                  <Link to="/admin/pedidos" className="inline-block text-xs text-[#4f7cff] hover:underline mt-1">
                    Ver pedidos pendientes →
                  </Link>
                </div>
              ) : (
                <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[700px]">
                      <thead>
                        <tr className="border-b border-white/8">
                          {[t('adminFinanzas.colId'), t('adminFinanzas.colClient'), t('adminFinanzas.colDate'), t('adminFinanzas.colProducts'), t('adminFinanzas.colShipping'), t('adminFinanzas.colTotal')].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#8e8e9a]">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filtered.map((p) => {
                          const envio      = p.costoEnvio ?? 0
                          const productos  = p.subtotal ?? (p.total ?? p.totalPedido ?? 0) - envio
                          const esRetiro   = p.metodoEnvio !== 'ENVIO_A_DOMICILIO'
                          const cliente    = p.usuarioFinal?.nombre ?? p.nombreCliente ?? '—'
                          return (
                            <tr key={p.id} className="hover:bg-white/3 transition-colors">
                              <td className="px-4 py-3 font-mono text-xs text-[#8e8e9a]">#{p.id}</td>
                              <td className="px-4 py-3 text-[#e8e8ed]">
                                <p className="font-medium truncate" title={cliente}>{cliente}</p>
                                <p className="text-[11px] text-[#8e8e9a]">{esRetiro ? t('adminFinanzas.pickup') : t('adminFinanzas.delivery')}</p>
                              </td>
                              <td className="px-4 py-3 text-xs text-[#8e8e9a]">
                                {(p.fechaCreacion ?? p.fechaPedido) ? formatDate(p.fechaCreacion ?? p.fechaPedido) : '—'}
                              </td>
                              <td className="px-4 py-3 font-semibold text-[#4ade80]">
                                {formatPrice(productos)}
                              </td>
                              <td className="px-4 py-3">
                                {envio > 0 ? (
                                  <span className="font-semibold text-amber-400">{formatPrice(envio)}</span>
                                ) : (
                                  <span className="text-[#8e8e9a]/40 text-xs">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 font-bold text-[#4f7cff]">
                                {formatPrice(p.total ?? p.totalPedido ?? 0)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      {/* Totales */}
                      <tfoot>
                        <tr style={{ borderTop: '2px solid var(--hc-border)' }}>
                          <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider">
                            {t('adminFinanzas.periodTotals')}
                          </td>
                          <td className="px-4 py-3 font-bold text-[#4ade80]">{formatPrice(totalProductos)}</td>
                          <td className="px-4 py-3 font-bold text-amber-400">{formatPrice(totalEnvio)}</td>
                          <td className="px-4 py-3 font-bold text-[#4f7cff]">{formatPrice(totalCobrado)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
