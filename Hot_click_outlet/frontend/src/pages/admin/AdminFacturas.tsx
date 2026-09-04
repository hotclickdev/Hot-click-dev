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

const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  ENVIADO:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  ACEPTADO:   'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  RECHAZADO:  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  ERROR:      'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
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
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div>
          <label htmlFor="facturas-estado" className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Estado</label>
          <select id="facturas-estado" value={estado} onChange={(e) => setEstado(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800">
            <option value="">Todos</option>
            {Object.keys(ESTADO_COLORS).map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="facturas-desde" className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Desde</label>
          <input id="facturas-desde" type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800" />
        </div>
        <div>
          <label htmlFor="facturas-hasta" className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Hasta</label>
          <input id="facturas-hasta" type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800" />
        </div>
        <button type="button" onClick={aplicarFiltros}
          className="rounded-lg px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--hc-accent, #2563eb)' }}
        >Filtrar</button>
        {hayFiltrosActivos && (
          <button type="button" onClick={limpiarFiltros}
            className="rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >Limpiar</button>
        )}
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">Cargando…</div>
        ) : comprobantes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-gray-500 dark:text-gray-400">No hay comprobantes emitidos</p>
            <p className="mt-1 text-xs text-gray-400">
              Usa el botón "Emitir" en un pedido entregado para comenzar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px] text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-left">Clave</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Ambiente</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {comprobantes.map(cf => (
                  <tr key={cf.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {fmtDate(cf.fechaEmision)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                      {TIPO_LABELS[cf.tipo ?? ''] ?? cf.tipo}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                      {cf.claveNumerica?.substring(0, 20)}…
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ESTADO_COLORS[cf.estado ?? ''] ?? ''}`}>
                        {cf.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                        cf.ambiente === 'PROD'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {cf.ambiente}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-gray-200">
                      {fmt(cf.totalFactura)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {total > 20 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-gray-700">
            <p className="text-xs text-gray-500">
              Página {page + 1} de {Math.ceil(total / 20)}
            </p>
            <div className="flex gap-2">
              <button type="button"
                onClick={() => cargar(page - 1, filtrosActuales())}
                disabled={page === 0}
                className="rounded-lg border px-3 py-1 text-xs disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
              >Anterior</button>
              <button type="button"
                onClick={() => cargar(page + 1, filtrosActuales())}
                disabled={(page + 1) * 20 >= total}
                className="rounded-lg border px-3 py-1 text-xs disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
              >Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
