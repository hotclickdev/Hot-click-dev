import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { posService } from '@/services/posService'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)
const fmtDate = (d) => d ? new Date(d).toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' }) : '—'

const FILTROS = [
  { key: 'hoy',    label: 'Hoy' },
  { key: 'semana', label: '7 días' },
  { key: 'mes',    label: '30 días' },
  { key: 'todo',   label: 'Todo' },
]

function dentroDelFiltro(fechaStr, filtro) {
  if (filtro === 'todo') return true
  const fecha = new Date(fechaStr)
  const ahora = new Date()
  const diff  = (ahora - fecha) / 86400000
  if (filtro === 'hoy')    return diff < 1 && fecha.getDate() === ahora.getDate()
  if (filtro === 'semana') return diff <= 7
  if (filtro === 'mes')    return diff <= 30
  return true
}

export default function AdminPOSHistorial() {
  const [ventas, setVentas]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro]   = useState('hoy')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    posService.historial()
      .then(res => setVentas(res?.data ?? []))
      .catch(() => setVentas([]))
      .finally(() => setLoading(false))
  }, [])

  const ventasFiltradas = ventas.filter(v => dentroDelFiltro(v.fechaPedido, filtro))

  const totalVendido  = ventasFiltradas.reduce((s, v) => s + (v.totalPedido ?? 0), 0)
  const numTx         = ventasFiltradas.length
  const ticketPromedio = numTx > 0 ? Math.round(totalVendido / numTx) : 0

  const exportCSV = () => {
    const rows = [
      ['Ticket','Fecha','Cliente','Items','Método','Total'],
      ...ventasFiltradas.map(v => [
        v.numeroPedido,
        fmtDate(v.fechaPedido),
        v.usuarioFinal?.nombre ?? 'Mostrador',
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
          <Link to="/admin/pos" className="text-xs font-semibold" style={{ color: 'var(--hc-muted)' }}>← Volver al POS</Link>
          <h1 className="text-xl font-bold mt-1" style={{ color: 'var(--hc-text)' }}>Historial POS</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
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
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--hc-muted)' }}>
            CSV
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total vendido',   value: `₡${fmt(totalVendido)}`,   color: 'var(--hc-accent)' },
          { label: 'Transacciones',   value: numTx,                      color: 'var(--hc-text)' },
          { label: 'Ticket promedio', value: `₡${fmt(ticketPromedio)}`,  color: '#34d399' },
        ].map(k => (
          <div key={k.label} className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid rgba(255,255,255,0.06)' }}>
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
          <p className="text-sm">Sin ventas POS para este período</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                {['Hora','Cliente','Ítems','Método','Total'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium"
                    style={{ color: 'var(--hc-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ventasFiltradas.map(v => (
                <>
                  <tr key={v.id}
                    tabIndex={0}
                    onClick={() => setExpanded(expanded === v.id ? null : v.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setExpanded(expanded === v.id ? null : v.id)
                      }
                    }}
                    className="cursor-pointer transition-colors hover:bg-white/[0.02] border-t"
                    style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>
                      {fmtDate(v.fechaPedido)}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-text)' }}>
                      {v.usuarioFinal?.nombre ?? 'Mostrador'}
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
                    <tr key={`${v.id}-detail`} style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                      <td colSpan={5} className="px-6 py-3">
                        <div className="space-y-1">
                          {(v.items ?? []).map((item, i) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span style={{ color: 'var(--hc-muted)' }}>
                                {item.producto?.nombreProducto ?? 'Producto'} ×{item.cantidad}
                              </span>
                              <span style={{ color: 'var(--hc-text)' }}>₡{fmt(item.subtotalItem)}</span>
                            </div>
                          ))}
                          {v.descuentoTotal > 0 && (
                            <div className="flex justify-between text-xs">
                              <span style={{ color: '#f87171' }}>Descuento</span>
                              <span style={{ color: '#f87171' }}>-₡{fmt(v.descuentoTotal)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-xs font-bold pt-1 border-t"
                            style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                            <span style={{ color: 'var(--hc-text)' }}>Total</span>
                            <span style={{ color: 'var(--hc-accent)' }}>₡{fmt(v.totalPedido)}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
