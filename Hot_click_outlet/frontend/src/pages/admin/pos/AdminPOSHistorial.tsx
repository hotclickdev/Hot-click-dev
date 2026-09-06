import { Fragment, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { posService } from '@/services/posService'
import TextoFlecha from '@/components/ui/TextoFlecha'
import ThemeToggle from '@/components/ui/ThemeToggle'
import type { Id } from '@/types/api'
import type { PosVenta } from './posHelpers'
import PosReporteModal from './PosReporteModal'

const fmt = (n: number | null | undefined) => new Intl.NumberFormat('es-CR').format(n ?? 0)

function dentroDelFiltro(fechaStr: string | number | Date | undefined, filtro: string) {
  if (filtro === 'todo') return true
  const fecha = new Date(fechaStr as string | number | Date)
  const ahora = new Date()
  const diff  = (ahora.getTime() - fecha.getTime()) / 86400000
  if (filtro === 'hoy')    return diff < 1 && fecha.getDate() === ahora.getDate()
  if (filtro === 'semana') return diff <= 7
  if (filtro === 'mes')    return diff <= 30
  return true
}

export default function AdminPOSHistorial() {
  const { t, i18n } = useTranslation()
  const [ventas, setVentas]   = useState<PosVenta[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro]   = useState('hoy')
  const [expanded, setExpanded] = useState<Id | null | undefined>(null)
  const [reporteAbierto, setReporteAbierto] = useState(false)

  const localeFecha = i18n.language?.startsWith('en') ? 'en-CR' : i18n.language?.startsWith('pt') ? 'pt-BR' : 'es-CR'
  const fmtDate = (d: string | number | Date | null | undefined) =>
    d ? new Date(d).toLocaleString(localeFecha, { dateStyle: 'short', timeStyle: 'short' }) : '—'

  const FILTROS = [
    { key: 'hoy',    label: t('pos.historial.filtroHoy') },
    { key: 'semana', label: t('pos.historial.filtroSemana') },
    { key: 'mes',    label: t('pos.historial.filtroMes') },
    { key: 'todo',   label: t('pos.historial.filtroTodo') },
  ] as const

  useEffect(() => {
    posService.historial()
      .then((res: unknown) => setVentas((res as PosVenta | { data?: PosVenta[] } | null | undefined)?.data as PosVenta[] ?? []))
      .catch(() => setVentas([]))
      .finally(() => setLoading(false))
  }, [])

  const ventasFiltradas = ventas.filter(v => dentroDelFiltro(v.fechaPedido, filtro))

  const totalVendido  = ventasFiltradas.reduce((s, v) => s + (v.totalPedido ?? 0), 0)
  const numTx         = ventasFiltradas.length
  const ticketPromedio = numTx > 0 ? Math.round(totalVendido / numTx) : 0

  const exportCSV = () => {
    const rows = [
      [
        t('pos.historial.csvTicket'),
        t('pos.historial.csvFecha'),
        t('pos.historial.csvCliente'),
        t('pos.historial.csvItems'),
        t('pos.historial.csvMetodo'),
        t('pos.historial.csvTotal'),
      ],
      ...ventasFiltradas.map(v => [
        v.numeroPedido,
        fmtDate(v.fechaPedido),
        v.usuarioFinal?.nombre ?? t('pos.historial.mostrador'),
        (v.items ?? []).length,
        v.metodoPago,
        v.totalPedido,
      ])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
    a.download = `ventas-pos-${filtro}.csv`
    a.click()
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to="/admin/pos" className="text-xs font-semibold" style={{ color: 'var(--hc-muted)' }}>
            <TextoFlecha dir="atras">{t('pos.common.volverAlPos')}</TextoFlecha>
          </Link>
          <h1 className="text-xl font-bold mt-1" style={{ color: 'var(--hc-text)' }}>{t('pos.historial.title')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle className="min-h-11 min-w-11 flex shrink-0 items-center justify-center" />
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--hc-border)' }}>
            {FILTROS.map(f => (
              <button type="button" key={f.key} onClick={() => setFiltro(f.key)}
                className="px-3 py-1.5 text-xs font-medium transition-all"
                style={{
                  backgroundColor: filtro === f.key ? 'var(--hc-accent)' : 'var(--hc-surface)',
                  color: filtro === f.key ? '#fff' : 'var(--hc-muted)',
                }}>
                {f.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={exportCSV}
            className="px-3 py-1.5 rounded-xl text-xs font-medium transition-opacity hover:opacity-70"
            style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}>
            {t('pos.historial.csv')}
          </button>
          <button
            type="button"
            onClick={() => setReporteAbierto(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium transition-opacity hover:opacity-70"
            style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}
            aria-label={t('pos.reporte.botonAria')}
          >
            {t('pos.header.reportar')}
          </button>
        </div>
      </div>

      <PosReporteModal
        open={reporteAbierto}
        onClose={() => setReporteAbierto(false)}
        pasoActual="historial"
      />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t('pos.historial.totalVendido'),   value: `₡${fmt(totalVendido)}`,   color: 'var(--hc-accent)' },
          { label: t('pos.historial.transacciones'),   value: numTx,                      color: 'var(--hc-text)' },
          { label: t('pos.historial.ticketPromedio'), value: `₡${fmt(ticketPromedio)}`,  color: '#34d399' },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
            <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{k.label}</p>
            <p className="text-xl font-black mt-1" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--hc-accent)', borderTopColor: 'transparent' }}/>
        </div>
      ) : ventasFiltradas.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--hc-muted)' }}>
          <p className="text-sm">{t('pos.historial.sinVentas')}</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--hc-border)' }}>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--hc-surface-2)' }}>
                {[
                  t('pos.historial.colHora'),
                  t('pos.historial.colCliente'),
                  t('pos.historial.colItems'),
                  t('pos.historial.colMetodo'),
                  t('pos.historial.colTotal'),
                ].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium"
                    style={{ color: 'var(--hc-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ventasFiltradas.map(v => (
                <Fragment key={v.id}>
                  <tr
                    tabIndex={0}
                    onClick={() => setExpanded(expanded === v.id ? null : v.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setExpanded(expanded === v.id ? null : v.id)
                      }
                    }}
                    className="cursor-pointer transition-colors hover:bg-white/[0.02] border-t"
                    style={{ borderColor: 'var(--hc-border)' }}>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>
                      {fmtDate(v.fechaPedido)}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-text)' }}>
                      {v.usuarioFinal?.nombre ?? t('pos.historial.mostrador')}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>
                      {(v.items ?? []).length}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ backgroundColor: 'rgba(23,71,168,0.12)', color: 'var(--hc-accent)' }}>
                        {v.metodoPago}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-xs" style={{ color: 'var(--hc-text)' }}>
                      ₡{fmt(v.totalPedido)}
                    </td>
                  </tr>
                  {expanded === v.id && (
                    <tr key={`${v.id}-detail`} style={{ backgroundColor: 'var(--hc-surface-2)' }}>
                      <td colSpan={5} className="px-6 py-3">
                        <div className="space-y-1">
                          {(v.items ?? []).map((item, i) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span style={{ color: 'var(--hc-muted)' }}>
                                {item.producto?.nombreProducto ?? t('pos.historial.producto')} ×{item.cantidad}
                              </span>
                              <span style={{ color: 'var(--hc-text)' }}>₡{fmt(item.subtotalItem)}</span>
                            </div>
                          ))}
                          {(v.descuentoTotal ?? 0) > 0 && (
                            <div className="flex justify-between text-xs">
                              <span style={{ color: '#f87171' }}>{t('pos.historial.descuento')}</span>
                              <span style={{ color: '#f87171' }}>-₡{fmt(v.descuentoTotal)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-xs font-bold pt-1 border-t"
                            style={{ borderColor: 'var(--hc-border)' }}>
                            <span style={{ color: 'var(--hc-text)' }}>{t('pos.common.total')}</span>
                            <span style={{ color: 'var(--hc-accent)' }}>₡{fmt(v.totalPedido)}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
