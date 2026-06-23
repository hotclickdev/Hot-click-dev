import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { cotizacionService, labelEstado, formatMonto, ESTADOS_COTIZACION } from '@/services/cotizacionService'
import { useToast } from '@/components/ui/Toast'

const FILTROS = [{ value: '', label: 'Todas' }, ...ESTADOS_COTIZACION]

function KpiCard({ label, value, color }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-1 border"
      style={{ background: 'var(--hc-card)', borderColor: 'var(--hc-border)' }}>
      <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>{label}</span>
      <span className="text-3xl font-bold" style={{ color }}>{value}</span>
    </div>
  )
}

function EstadoBadge({ estado }) {
  const { label, color } = labelEstado(estado)
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}>
      {label}
    </span>
  )
}

export default function AdminCotizaciones() {
  const navigate  = useNavigate()
  const { toast } = useToast()
  const [cotizaciones, setCotizaciones] = useState([])
  const [kpis,         setKpis]         = useState({})
  const [filtro,       setFiltro]       = useState('')
  const [loading,      setLoading]      = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [lista, stats] = await Promise.all([
        cotizacionService.listar(filtro || undefined),
        cotizacionService.kpis(),
      ])
      setCotizaciones(lista)
      setKpis(stats)
    } catch {
      toast('Error al cargar cotizaciones', 'error')
    } finally {
      setLoading(false)
    }
  }, [filtro, toast])

  useEffect(() => { cargar() }, [cargar])

  async function handleEstado(id, estado) {
    try {
      await cotizacionService.cambiarEstado(id, estado)
      toast('Estado actualizado', 'success')
      cargar()
    } catch { toast('Error al cambiar estado', 'error') }
  }

  async function handleDuplicar(id) {
    try {
      await cotizacionService.duplicar(id)
      toast('Cotización duplicada', 'success')
      cargar()
    } catch { toast('Error al duplicar', 'error') }
  }

  async function handleEliminar(id) {
    if (!window.confirm('¿Eliminar esta cotización?')) return
    try {
      await cotizacionService.eliminar(id)
      toast('Cotización eliminada', 'success')
      cargar()
    } catch { toast('Error al eliminar', 'error') }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>Cotizaciones B2B</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--hc-muted)' }}>
            Propuestas comerciales para clientes empresariales
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/cotizaciones/nueva')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: 'var(--hc-accent)', color: '#fff' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
          Nueva cotización
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Borradores"  value={kpis.borrador  ?? 0} color="var(--hc-muted)" />
        <KpiCard label="Enviadas"    value={kpis.enviada   ?? 0} color="#3b82f6" />
        <KpiCard label="Aprobadas"   value={kpis.aprobada  ?? 0} color="#22c55e" />
        <KpiCard label="Rechazadas"  value={kpis.rechazada ?? 0} color="#ef4444" />
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {FILTROS.map(f => (
          <button key={f.value}
            onClick={() => setFiltro(f.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: filtro === f.value ? 'var(--hc-accent)' : 'var(--hc-card)',
              color:      filtro === f.value ? '#fff'             : 'var(--hc-muted)',
              border:     `1px solid ${filtro === f.value ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--hc-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--hc-card)', borderBottom: '1px solid var(--hc-border)' }}>
              {['N°', 'Cliente', 'Emisión', 'Vencimiento', 'Total', 'Estado', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--hc-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12" style={{ color: 'var(--hc-muted)' }}>
                  Cargando...
                </td>
              </tr>
            ) : cotizaciones.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12" style={{ color: 'var(--hc-muted)' }}>
                  No hay cotizaciones{filtro ? ` con estado "${labelEstado(filtro).label}"` : ''}.
                </td>
              </tr>
            ) : cotizaciones.map((c, i) => (
              <tr key={c.id}
                className="transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                style={{ borderBottom: i < cotizaciones.length - 1 ? '1px solid var(--hc-border)' : 'none' }}
                onClick={() => navigate(`/admin/cotizaciones/${c.id}`)}>
                <td className="px-4 py-3 font-mono font-medium" style={{ color: 'var(--hc-accent)' }}>
                  {c.numeroCotizacion}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium" style={{ color: 'var(--hc-text)' }}>
                    {c.cliente?.nombreComercial ?? c.nombreCliente ?? '—'}
                  </div>
                  {c.cliente?.cedulaJuridica && (
                    <div className="text-xs" style={{ color: 'var(--hc-muted)' }}>{c.cliente.cedulaJuridica}</div>
                  )}
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--hc-muted)' }}>
                  {c.fechaEmision ?? '—'}
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--hc-muted)' }}>
                  {c.fechaVencimiento ?? '—'}
                </td>
                <td className="px-4 py-3 font-semibold" style={{ color: 'var(--hc-text)' }}>
                  {formatMonto(c.total, c.moneda)}
                </td>
                <td className="px-4 py-3">
                  <EstadoBadge estado={c.estadoCotizacion} />
                </td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1 justify-end">

                    {/* Cambiar estado rápido */}
                    <select
                      value={c.estadoCotizacion}
                      onChange={e => handleEstado(c.id, e.target.value)}
                      className="text-xs rounded-lg px-2 py-1 border"
                      style={{ background: 'var(--hc-card)', color: 'var(--hc-text)', borderColor: 'var(--hc-border)' }}>
                      {ESTADOS_COTIZACION.map(e => (
                        <option key={e.value} value={e.value}>{e.label}</option>
                      ))}
                    </select>

                    {/* Duplicar */}
                    <button onClick={() => handleDuplicar(c.id)}
                      title="Duplicar"
                      className="p-1.5 rounded-lg transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                      style={{ color: 'var(--hc-muted)' }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                      </svg>
                    </button>

                    {/* Enlace público */}
                    <button
                      onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/cotizacion/${c.tokenPublico}`); toast('Enlace copiado', 'success') }}
                      title="Copiar enlace público"
                      className="p-1.5 rounded-lg transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                      style={{ color: 'var(--hc-muted)' }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                      </svg>
                    </button>

                    {/* WhatsApp */}
                    <a href={`https://wa.me/${c.cliente?.telefono?.replace(/\D/g,'')}?text=${encodeURIComponent(`Estimado/a, adjunto cotización ${c.numeroCotizacion}: ${window.location.origin}/cotizacion/${c.tokenPublico}`)}`}
                      target="_blank" rel="noreferrer"
                      title="WhatsApp"
                      className="p-1.5 rounded-lg transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                      style={{ color: '#22c55e' }}>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.121 1.532 5.853L.057 23.447a.75.75 0 00.92.92l5.65-1.473A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.9 0-3.687-.497-5.232-1.367l-.374-.22-3.882 1.012 1.037-3.784-.242-.389A9.956 9.956 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                      </svg>
                    </a>

                    {/* Eliminar */}
                    <button onClick={() => handleEliminar(c.id)}
                      title="Eliminar"
                      className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                      style={{ color: '#ef4444' }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
