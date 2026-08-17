import { useState, useEffect } from 'react'
import { inventarioService } from '@/services/inventarioService'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)
const fmtDate = (ts) => ts ? String(ts).slice(0, 10) : '—'

const ABC_STYLE = {
  A: 'text-green-400 bg-green-400/10',
  B: 'text-blue-400 bg-blue-400/10',
  C: 'text-amber-400 bg-amber-400/10',
  '?': 'text-gray-400 bg-gray-400/10',
}

function KpiCard({ label, value, sub, color = 'var(--hc-accent)' }) {
  return (
    <div className="rounded-2xl p-5"
      style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
      <p className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>{label}</p>
      <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>{sub}</p>}
    </div>
  )
}

function ProductTable({ title, rows, emptyMsg, cols }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--hc-border)' }}>
      <div className="px-4 py-3" style={{ backgroundColor: 'var(--hc-surface)', borderBottom: '1px solid var(--hc-border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>{title}</p>
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--hc-muted)', backgroundColor: 'var(--hc-surface)' }}>
          {emptyMsg}
        </div>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full min-w-[500px] text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--hc-surface)', borderBottom: '1px solid var(--hc-border)' }}>
              {cols.map(c => (
                <th key={c.k} className="px-4 py-2 text-left text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ backgroundColor: 'var(--hc-surface)', borderTop: '1px solid var(--hc-border)' }}>
                {cols.map(c => (
                  <td key={c.k} className="px-4 py-2.5" style={{ color: c.color ?? 'var(--hc-text)' }}>
                    {c.render ? c.render(row[c.k], row) : row[c.k] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  )
}

export default function AdminInventario() {
  const [data, setData]       = useState(null)
  const [cargando, setCargando] = useState(true)
  const [analizando, setAnalizando] = useState(false)
  const [error, setError]     = useState(null)
  const [tab, setTab]         = useState('riesgo') // riesgo | lentos | abc

  async function cargar() {
    setCargando(true); setError(null)
    try {
      const { data: d } = await inventarioService.getDashboard()
      setData(d)
    } catch { setError('No se pudo cargar el análisis de inventario') }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, []) // eslint-disable-line react-hooks/set-state-in-effect -- carga al montar

  async function analizarAhora() {
    setAnalizando(true)
    try {
      await inventarioService.analizar()
      await cargar()
    } catch { setError('Error al ejecutar análisis') }
    finally { setAnalizando(false) }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>AI Smart Inventory</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
            Análisis ABC · pronóstico de demanda · alertas de stock
          </p>
        </div>
        <button type="button" onClick={analizarAhora} disabled={analizando || cargando}
          className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-80"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
          {analizando ? 'Analizando…' : '▶ Ejecutar análisis ahora'}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {cargando ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
        </div>
      ) : data ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard label="Productos activos"     value={data.totalActivos}   color="var(--hc-text)" />
            <KpiCard label="En riesgo (stock bajo)" value={data.enRiesgoCount}  color="#f87171" />
            <KpiCard label="Movimiento lento"       value={data.lentosCount}    color="#fbbf24" />
            <KpiCard label="Clase A (top ventas)"
              value={data.abcResumen?.find(r => r.clase === 'A')?.total ?? 0}
              color="#34d399" />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl w-fit"
            style={{ backgroundColor: 'var(--hc-bg)' }}>
            {[
              { id: 'riesgo', label: `En riesgo (${data.enRiesgoCount})` },
              { id: 'lentos', label: `Mov. lento (${data.lentosCount})` },
              { id: 'abc',    label: 'Clasificación ABC' },
            ].map(t => (
              <button type="button" key={t.id} onClick={() => setTab(t.id)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: tab === t.id ? 'var(--hc-surface)' : 'transparent',
                  color: tab === t.id ? 'var(--hc-text)' : 'var(--hc-muted)',
                  border: tab === t.id ? '1px solid var(--hc-border)' : '1px solid transparent',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tables */}
          {tab === 'riesgo' && (
            <ProductTable
              title="Productos con stock bajo o en reorden"
              rows={data.enRiesgo}
              emptyMsg="No hay productos con stock bajo. ¡Todo en orden!"
              cols={[
                { k: 'nombre_producto', label: 'Producto' },
                { k: 'clasificacion_abc', label: 'ABC',
                  render: (v) => <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ABC_STYLE[v ?? '?'] ?? ''}`}>{v ?? '?'}</span> },
                { k: 'stock_actual',  label: 'Stock actual',  color: '#f87171',
                  render: (v) => <span className="font-bold">{fmt(v)}</span> },
                { k: 'stock_minimo',  label: 'Stock mínimo',  color: 'var(--hc-muted)' },
                { k: 'demanda_diaria_avg', label: 'Demanda/día',
                  render: (v) => v ? Number(v).toFixed(1) : '0.0' },
              ]}
            />
          )}

          {tab === 'lentos' && (
            <ProductTable
              title="Productos sin ventas en los últimos 60 días"
              rows={data.lentos}
              emptyMsg="No hay productos con movimiento lento."
              cols={[
                { k: 'nombre_producto', label: 'Producto' },
                { k: 'clasificacion_abc', label: 'ABC',
                  render: (v) => <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ABC_STYLE[v ?? '?'] ?? ''}`}>{v ?? '?'}</span> },
                { k: 'stock_actual', label: 'Stock en bodega',
                  render: (v) => <span className="font-bold text-amber-400">{fmt(v)}</span> },
                { k: 'fecha_ultima_venta', label: 'Última venta',
                  render: (v) => fmtDate(v) },
              ]}
            />
          )}

          {tab === 'abc' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {['A', 'B', 'C'].map(clase => {
                  const item = data.abcResumen?.find(r => r.clase === clase)
                  const desc = { A: 'Top 70% de ingresos', B: '20% siguiente', C: '10% restante' }[clase]
                  return (
                    <div key={clase} className="rounded-2xl p-5 space-y-2"
                      style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold px-3 py-1 rounded-xl ${ABC_STYLE[clase]}`}>{clase}</span>
                        <div>
                          <p className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>{desc}</p>
                          <p className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>{item?.total ?? 0} productos</p>
                        </div>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                        {clase === 'A' && 'Alta prioridad — maximizar disponibilidad'}
                        {clase === 'B' && 'Media prioridad — seguimiento regular'}
                        {clase === 'C' && 'Baja prioridad — revisar si vale mantener'}
                      </p>
                    </div>
                  )
                })}
              </div>
              <div className="rounded-2xl p-4 text-sm"
                style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
                <strong style={{ color: 'var(--hc-text)' }}>Cómo funciona:</strong> El análisis clasifica tus productos según su
                contribución a los ingresos totales de los últimos 90 días. Los productos A generan el 70% de tus ingresos
                (Principio de Pareto). El análisis se ejecuta automáticamente cada día a las 4:00 AM.
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
