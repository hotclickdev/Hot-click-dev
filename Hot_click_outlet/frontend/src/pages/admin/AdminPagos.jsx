import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import api from '@/services/api'
import ImportExportBar from '@/components/admin/ImportExportBar'
import { paymentService } from '@/services/paymentService'

const PROVEEDORES  = ['', 'PAYPAL', 'SINPE', 'PAYXPERT']
const ESTADOS_PAGO = ['', 'CAPTURADO', 'PENDIENTE', 'FALLIDO', 'CANCELADO']

const BADGE = {
  CAPTURADO: 'bg-green-500/15 text-green-400 border-green-500/30',
  PENDIENTE: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  FALLIDO:   'bg-red-500/15 text-red-400 border-red-500/30',
  CANCELADO: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
}

const BADGE_WH = {
  true:  'bg-green-500/15 text-green-400 border-green-500/30',
  false: 'bg-red-500/15 text-red-400 border-red-500/30',
}

function formatCRC(n) {
  if (!n) return '₡0'
  return '₡' + Number(n).toLocaleString('es-CR')
}

export default function AdminPagos() {
  const { t } = useTranslation()
  const [tab, setTab]               = useState('pagos')

  // ── Pagos ────────────────────────────────────────────────────────
  const [pagos, setPagos]           = useState([])
  const [kpis, setKpis]             = useState(null)
  const [filtProv, setFiltProv]     = useState('')
  const [filtEstado, setFiltEstado] = useState('')
  const [pagePage, setPagePage]     = useState(0)
  const [pageTotal, setPageTotal]   = useState(0)
  const [loadingP, setLoadingP]     = useState(false)

  // ── Webhooks ─────────────────────────────────────────────────────
  const [webhooks, setWebhooks]     = useState([])
  const [filtProc, setFiltProc]     = useState('')   // '' | 'true' | 'false'
  const [whPage, setWhPage]         = useState(0)
  const [whTotal, setWhTotal]       = useState(0)
  const [loadingW, setLoadingW]     = useState(false)
  const [actionLoading, setActionLoading] = useState(null) // pagoId procesándose

  const fetchKpis = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/pagos/kpis')
      setKpis(data)
    } catch { /* silencioso */ }
  }, [])

  const fetchPagos = useCallback(async () => {
    setLoadingP(true)
    try {
      const params = new URLSearchParams({ page: pagePage, size: 20 })
      if (filtProv)   params.set('proveedor',  filtProv)
      if (filtEstado) params.set('estadoPago', filtEstado)
      const { data } = await api.get(`/admin/pagos?${params}`)
      setPagos(data.content ?? [])
      setPageTotal(data.totalPages ?? 0)
    } catch { setPagos([]) } finally { setLoadingP(false) }
  }, [pagePage, filtProv, filtEstado])

  const fetchWebhooks = useCallback(async () => {
    setLoadingW(true)
    try {
      const params = new URLSearchParams({ page: whPage, size: 20 })
      if (filtProc !== '') params.set('procesado', filtProc)
      const { data } = await api.get(`/admin/webhooks?${params}`)
      setWebhooks(data.content ?? [])
      setWhTotal(data.totalPages ?? 0)
    } catch { setWebhooks([]) } finally { setLoadingW(false) }
  }, [whPage, filtProc])

  useEffect(() => { fetchKpis() }, [fetchKpis])
  useEffect(() => { fetchPagos() }, [fetchPagos])
  useEffect(() => { fetchWebhooks() }, [fetchWebhooks])

  const handleConfirmarSinpe = async (pagoId) => {
    if (!window.confirm('¿Confirmar este pago SINPE? Se marcará como CAPTURADO y se procesará el pedido.')) return
    setActionLoading(pagoId)
    try {
      await paymentService.confirmarSinpe(pagoId)
      await fetchPagos()
      await fetchKpis()
    } catch (err) {
      alert(err.response?.data?.message || 'Error confirmando pago SINPE')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRechazarSinpe = async (pagoId) => {
    if (!window.confirm('¿Rechazar este pago SINPE? Se liberará el stock reservado y se notificará al cliente.')) return
    setActionLoading(pagoId)
    try {
      await paymentService.rechazarSinpe(pagoId)
      await fetchPagos()
      await fetchKpis()
    } catch (err) {
      alert(err.response?.data?.message || 'Error rechazando pago SINPE')
    } finally {
      setActionLoading(null)
    }
  }

  const handleFiltProv   = (v) => { setFiltProv(v);   setPagePage(0) }
  const handleFiltEstado = (v) => { setFiltEstado(v); setPagePage(0) }
  const handleFiltProc   = (v) => { setFiltProc(v);   setWhPage(0) }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-[#e8e8ed]">{t('admin.pagos.title')} &amp; {t('admin.pagos.webhooks')}</h1>
          <ImportExportBar
            exportOnly
            data={tab === 'pagos'
              ? pagos.map((p) => ({
                  id: p.id, pedidoId: p.pedidoId ?? '', proveedor: p.proveedor ?? '',
                  estado: p.estadoPago ?? '', monto: p.monto ?? 0,
                  moneda: p.moneda ?? '', fecha: (p.fechaPago ?? p.createdAt ?? '').slice(0, 10),
                }))
              : webhooks.map((w) => ({
                  id: w.id, proveedor: w.proveedor ?? '', evento: w.evento ?? '',
                  procesado: w.procesado ? 'SI' : 'NO', fecha: (w.createdAt ?? '').slice(0, 10),
                }))}
            columns={tab === 'pagos'
              ? ['id','pedidoId','proveedor','estado','monto','moneda','fecha']
              : ['id','proveedor','evento','procesado','fecha']}
            filename={tab === 'pagos' ? 'pagos' : 'webhooks'}
            sheetName={tab === 'pagos' ? 'Pagos' : 'Webhooks'}
          />
        </div>

        {/* KPIs */}
        {kpis && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <KpiCard label="Total pagos"        value={kpis.total}     />
            <KpiCard label="Tasa de éxito"      value={`${kpis.tasaExito}%`} color="text-green-400" />
            <KpiCard label="Pendientes"         value={kpis.pendientes} color="text-yellow-400" />
            <KpiCard label="Webhooks con error" value={kpis.webhooksErr} color={kpis.webhooksErr > 0 ? 'text-red-400' : 'text-green-400'} />
          </div>
        )}

        {kpis && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <KpiCard label="Capturados"  value={kpis.capturados} color="text-green-400" />
            <KpiCard label="Fallidos"    value={kpis.fallidos}   color="text-red-400" />
            <KpiCard label="PayPal"      value={kpis.paypal} />
            <KpiCard label="SINPE"       value={kpis.sinpe}  color="text-emerald-400" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-white/8">
          {[
            { key: 'pagos',    label: t('admin.pagos.title') },
            { key: 'webhooks', label: t('admin.pagos.webhooks') },
          ].map((tabItem) => (
            <button
              key={tabItem.key}
              onClick={() => setTab(tabItem.key)}
              className={`px-5 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                tab === tabItem.key
                  ? 'border-[#4f7cff] text-[#4f7cff]'
                  : 'border-transparent text-[#8e8e9a] hover:text-[#e8e8ed]'
              }`}
            >
              {tabItem.label}
            </button>
          ))}
        </div>

        {/* ── Tab Pagos ──────────────────────────────────────────── */}
        {tab === 'pagos' && (
          <>
            {/* Filtros */}
            <div className="flex flex-wrap gap-3 mb-4">
              <Select value={filtProv} onChange={handleFiltProv}
                options={PROVEEDORES.map(p => ({ value: p, label: p || t('admin.pagos.provider') }))} />
              <Select value={filtEstado} onChange={handleFiltEstado}
                options={ESTADOS_PAGO.map(e => ({ value: e, label: e || t('admin.pagos.status') }))} />
              <button onClick={fetchPagos}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/8 text-[#8e8e9a] hover:text-[#e8e8ed] text-sm transition-colors">
                {t('common.retry')}
              </button>
            </div>

            {loadingP ? (
              <div className="text-center py-16 text-[#8e8e9a]">{t('common.loading')}</div>
            ) : pagos.length === 0 ? (
              <div className="text-center py-16 text-[#8e8e9a]">{t('common.noData')}</div>
            ) : (
              <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[800px]">
                    <thead>
                      <tr className="border-b border-white/8 bg-white/3">
                        {['Pedido', 'Proveedor', 'Estado', 'Monto', 'Usuario', 'Token', 'Fecha', 'Acciones'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[#8e8e9a] font-medium text-xs">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagos.map((p) => (
                        <tr key={p.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                          <td className="px-4 py-3 font-mono text-[#e8e8ed] text-xs">{p.numeroPedido}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
                              p.proveedor === 'PAYPAL'
                                ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                                : p.proveedor === 'SINPE'
                                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                  : 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                            }`}>{p.proveedor}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${BADGE[p.estadoPago] ?? ''}`}>
                              {p.estadoPago}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#4f7cff] font-semibold">{formatCRC(p.monto)}</td>
                          <td className="px-4 py-3 text-[#8e8e9a] text-xs" title={p.correoUsuario}><span className="truncate block max-w-[220px]">{p.correoUsuario}</span></td>
                          <td className="px-4 py-3 font-mono text-[#8e8e9a] text-[10px]"
                              title={p.merchantToken}>{p.merchantToken?.slice(0, 16)}…</td>
                          <td className="px-4 py-3 text-[#8e8e9a] text-xs whitespace-nowrap">{p.fechaCreacion}</td>
                          <td className="px-4 py-3">
                            {p.proveedor === 'SINPE' && p.estadoPago === 'PENDIENTE' && (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => handleConfirmarSinpe(p.id)}
                                  disabled={actionLoading === p.id}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-50 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
                                >
                                  {actionLoading === p.id ? '…' : 'Confirmar'}
                                </button>
                                <button
                                  onClick={() => handleRechazarSinpe(p.id)}
                                  disabled={actionLoading === p.id}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-50 bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25"
                                >
                                  Rechazar
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={pagePage} totalPages={pageTotal} onPage={setPagePage} />
              </div>
            )}
          </>
        )}

        {/* ── Tab Webhooks ────────────────────────────────────────── */}
        {tab === 'webhooks' && (
          <>
            <div className="flex flex-wrap gap-3 mb-4">
              <Select value={filtProc} onChange={handleFiltProc}
                options={[
                  { value: '',      label: 'Todos' },
                  { value: 'true',  label: 'Procesados' },
                  { value: 'false', label: 'Con error' },
                ]} />
              <button onClick={fetchWebhooks}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/8 text-[#8e8e9a] hover:text-[#e8e8ed] text-sm transition-colors">
                Actualizar
              </button>
            </div>

            {loadingW ? (
              <div className="text-center py-16 text-[#8e8e9a]">{t('common.loading')}</div>
            ) : webhooks.length === 0 ? (
              <div className="text-center py-16 text-[#8e8e9a]">{t('common.noData')}</div>
            ) : (
              <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[860px]">
                    <thead>
                      <tr className="border-b border-white/8 bg-white/3">
                        {['Token / ID evento', 'Tipo', 'IP origen', 'Estado', 'Error', 'Recibido', 'Procesado en'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[#8e8e9a] font-medium text-xs">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {webhooks.map((w) => (
                        <tr key={w.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                          <td className="px-4 py-3 font-mono text-[#e8e8ed] text-[10px]" title={w.merchantToken}>
                            {w.merchantToken?.slice(0, 16)}…
                          </td>
                          <td className="px-4 py-3 text-[#8e8e9a] text-xs">{w.eventoTipo}</td>
                          <td className="px-4 py-3 text-[#8e8e9a] text-xs">{w.ipOrigen}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${BADGE_WH[w.procesado]}`}>
                              {w.procesado ? 'OK' : 'Error'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-red-400 text-xs" title={w.errorProcesamiento ?? ''}>
                            <span className="truncate block max-w-[280px]">{w.errorProcesamiento ?? '—'}</span>
                          </td>
                          <td className="px-4 py-3 text-[#8e8e9a] text-xs whitespace-nowrap">{w.fechaRecepcion}</td>
                          <td className="px-4 py-3 text-[#8e8e9a] text-xs whitespace-nowrap">{w.procesadoEn ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={whPage} totalPages={whTotal} onPage={setWhPage} />
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

// ── Componentes auxiliares ──────────────────────────────────────────

function KpiCard({ label, value, color = 'text-[#e8e8ed]' }) {
  return (
    <div className="bg-[#111114] border border-white/8 rounded-xl p-4">
      <p className="text-[#8e8e9a] text-xs mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
    </div>
  )
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 rounded-lg bg-[#111114] border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff] transition-colors"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function Pagination({ page, totalPages, onPage }) {
  const { t } = useTranslation()
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-white/8">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 0}
        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/8 text-[#8e8e9a] text-sm disabled:opacity-30 transition-colors"
      >
        ← {t('common.previous')}
      </button>
      <span className="text-[#8e8e9a] text-xs">{page + 1} / {totalPages}</span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages - 1}
        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/8 text-[#8e8e9a] text-sm disabled:opacity-30 transition-colors"
      >
        {t('common.next')} →
      </button>
    </div>
  )
}
