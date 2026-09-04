import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import facturaService from '@/services/facturaService'
import type { FacturaFiltros } from '@/services/facturaService'
import { empresaService } from '@/services/empresaService'
import { useToast } from '@/components/ui/Toast'
import type { Pagina } from '@/types/api'

type ComprobanteAdmin = {
  id: number | string
  fechaEmision?: string
  tipo?: string
  claveNumerica?: string
  estado?: string
  ambiente?: string
  totalFactura?: number | null
}

type EmpresaFiscal = {
  cedulaJuridica?: string | null
}

/** Par de tokens semánticos (--hc-*) por estado — reemplaza los colores Tailwind sueltos. */
const ESTADO_TOKENS: Record<string, { color: string; bg: string }> = {
  PENDIENTE: { color: 'var(--hc-warning)', bg: 'var(--hc-warning-bg)' },
  ENVIADO:   { color: 'var(--hc-accent)',  bg: '#EFF4FE' },
  ACEPTADO:  { color: 'var(--hc-success)', bg: 'var(--hc-success-bg)' },
  RECHAZADO: { color: 'var(--hc-danger)',  bg: 'var(--hc-danger-bg)' },
  ERROR:     { color: 'var(--hc-danger)',  bg: 'var(--hc-danger-bg)' },
}

const TIPO_LABELS: Record<string, string> = { '01': 'Factura', '04': 'Tiquete', '02': 'N.Débito', '03': 'N.Crédito' }

const fmt = (n: number | null | undefined) => n != null
  ? new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', minimumFractionDigits: 0 }).format(n)
  : '—'

const fmtDate = (s: string | undefined) => s
  ? new Date(s).toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' })
  : '—'

export default function AdminFacturas() {
  const { showToast } = useToast()
  const [comprobantes, setComprobantes] = useState<ComprobanteAdmin[]>([])
  const [total, setTotal]               = useState(0)
  const [page, setPage]                 = useState(0)
  const [loading, setLoading]           = useState(true)
  const [empresa, setEmpresa]           = useState<EmpresaFiscal | null>(null)
  const [estado, setEstado]             = useState('')
  const [fechaDesde, setFechaDesde]     = useState('')
  const [fechaHasta, setFechaHasta]     = useState('')

  const cargar = async (p = 0, filtros: FacturaFiltros = {}) => {
    setLoading(true)
    try {
      const { data } = await facturaService.listar(p, 20, filtros)
      const pagina = data as Pagina<ComprobanteAdmin>
      setComprobantes(pagina.content ?? [])
      setTotal(pagina.totalElements ?? 0)
      setPage(p)
    } catch { showToast('Error cargando comprobantes', 'error') }
    finally { setLoading(false) }
  }

  const filtrosActuales = (): FacturaFiltros => ({
    estado: estado || undefined,
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
  })

  useEffect(() => {
    cargar(0) // eslint-disable-line react-hooks/set-state-in-effect -- carga al montar
    empresaService.getPerfil().then(r => {
      const payload: unknown = (r.data as { data?: unknown } | undefined)?.data ?? r.data
      setEmpresa(payload as EmpresaFiscal)
    }).catch(() => { /* ok */ })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- carga al montar

  const aplicarFiltros = () => { cargar(0, filtrosActuales()) }
  const limpiarFiltros = () => {
    setEstado(''); setFechaDesde(''); setFechaHasta('')
    cargar(0)
  }
  const hayFiltrosActivos = !!(estado || fechaDesde || fechaHasta)

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Comprobantes Electrónicos
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {total} comprobante{total === 1 ? '' : 's'} emitidos
          </p>
        </div>
      </div>

      {/* Banner — cédula no configurada */}
      {empresa !== null && !empresa.cedulaJuridica && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div className="text-sm">
            <p className="font-semibold text-red-800 dark:text-red-300">Cédula jurídica no configurada</p>
            <p className="text-red-700 dark:text-red-400 mt-0.5">
              Para emitir comprobantes electrónicos debés ingresar tu cédula jurídica en{' '}
              <Link to="/admin/config-fiscal" className="underline font-medium">Configuración Fiscal</Link>.
              Solo emprendimientos inscritos en Tributación Directa pueden facturar electrónicamente.
            </p>
          </div>
        </div>
      )}

      {/* Aviso sandbox */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
        <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <div className="text-sm">
          <p className="font-medium text-amber-800 dark:text-amber-300">Modo Sandbox activo</p>
          <p className="text-amber-700 dark:text-amber-400">
            Configura las credenciales de Hacienda en{' '}
            <a href="/admin/config-fiscal" className="underline">Configuración Fiscal</a>{' '}
            para activar el modo producción.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl p-4"
        style={{ border: '1px solid var(--hc-border)', background: 'var(--hc-surface)', boxShadow: 'var(--hc-shadow-1)' }}>
        <div>
          <label htmlFor="facturas-estado" className="mb-1 block text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--hc-muted)' }}>Estado</label>
          <select id="facturas-estado" value={estado} onChange={(e) => setEstado(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-sm"
            style={{ border: '1px solid var(--hc-border)', background: 'var(--hc-surface)', color: 'var(--hc-text)', fontFamily: 'var(--hc-font-text)' }}>
            <option value="">Todos</option>
            {Object.keys(ESTADO_TOKENS).map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="facturas-desde" className="mb-1 block text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--hc-muted)' }}>Desde</label>
          <input id="facturas-desde" type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-sm"
            style={{ border: '1px solid var(--hc-border)', background: 'var(--hc-surface)', color: 'var(--hc-text)', fontFamily: 'var(--hc-font-text)' }} />
        </div>
        <div>
          <label htmlFor="facturas-hasta" className="mb-1 block text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--hc-muted)' }}>Hasta</label>
          <input id="facturas-hasta" type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-sm"
            style={{ border: '1px solid var(--hc-border)', background: 'var(--hc-surface)', color: 'var(--hc-text)', fontFamily: 'var(--hc-font-text)' }} />
        </div>
        <button type="button" onClick={aplicarFiltros}
          className="rounded-lg px-4 py-1.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--hc-primary)', fontFamily: 'var(--hc-font-text)' }}
        >Filtrar</button>
        {hayFiltrosActivos && (
          <button type="button" onClick={limpiarFiltros}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold hover:opacity-80"
            style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-muted)', fontFamily: 'var(--hc-font-text)' }}
          >Limpiar</button>
        )}
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid var(--hc-border)', background: 'var(--hc-surface)', boxShadow: 'var(--hc-shadow-1)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm" style={{ color: 'var(--hc-text-disabled)' }}>Cargando…</div>
        ) : comprobantes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p style={{ color: 'var(--hc-muted)' }}>No hay comprobantes emitidos</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--hc-text-disabled)' }}>
              Usa el botón "Emitir" en un pedido entregado para comenzar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px] text-sm">
              <thead style={{ borderBottom: '1px solid var(--hc-border)', background: 'var(--hc-surface-2)' }}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--hc-muted)' }}>Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--hc-muted)' }}>Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--hc-muted)' }}>Clave</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--hc-muted)' }}>Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--hc-muted)' }}>Ambiente</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--hc-muted)' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {comprobantes.map(cf => {
                  const estadoTok = ESTADO_TOKENS[cf.estado ?? '']
                  const prod = cf.ambiente === 'PROD'
                  return (
                    <tr key={cf.id} style={{ borderTop: '1px solid var(--hc-border)' }}>
                      <td className="px-4 py-3" style={{ color: 'var(--hc-muted)' }}>
                        {fmtDate(cf.fechaEmision)}
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--hc-text)' }}>
                        {TIPO_LABELS[cf.tipo ?? ''] ?? cf.tipo}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ fontFamily: 'var(--hc-font-mono)', color: 'var(--hc-muted)' }}>
                        {cf.claveNumerica?.substring(0, 20)}…
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2 py-0.5 text-xs font-semibold"
                          style={{ color: estadoTok?.color ?? 'var(--hc-muted)', background: estadoTok?.bg ?? 'var(--hc-surface-2)' }}>
                          {cf.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded px-1.5 py-0.5 text-xs font-semibold"
                          style={{
                            color: prod ? 'var(--hc-success)' : 'var(--hc-muted)',
                            background: prod ? 'var(--hc-success-bg)' : 'var(--hc-surface-2)',
                          }}>
                          {cf.ambiente}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold" style={{ color: 'var(--hc-text)', fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(cf.totalFactura)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {total > 20 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--hc-border)' }}>
            <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
              Página {page + 1} de {Math.ceil(total / 20)}
            </p>
            <div className="flex gap-2">
              <button type="button"
                onClick={() => cargar(page - 1, filtrosActuales())}
                disabled={page === 0}
                className="rounded-lg px-3 py-1 text-xs disabled:opacity-40 hover:opacity-80"
                style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
              >Anterior</button>
              <button type="button"
                onClick={() => cargar(page + 1, filtrosActuales())}
                disabled={(page + 1) * 20 >= total}
                className="rounded-lg px-3 py-1 text-xs disabled:opacity-40 hover:opacity-80"
                style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
              >Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
