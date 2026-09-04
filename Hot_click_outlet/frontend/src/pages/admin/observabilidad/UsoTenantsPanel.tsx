import { useCallback, useEffect, useState } from 'react'
import { observabilidadService } from '@/services/observabilidadService'
import { formatoColon } from '@/theme/formatoColon'
import UsoTenantsTabla from './UsoTenantsTabla'
import UsoTenantDetalle from './UsoTenantDetalle'
import {
  detalleUsoDesdeRespuesta,
  MESES_USO,
  rankingDesdeRespuesta,
  type OrdenUsoTenant,
  type UsoTenantFila,
  type UsoTenantsRanking,
} from './usoTenantHelpers'

export default function UsoTenantsPanel() {
  const ahora = new Date()
  const [anio, setAnio] = useState(ahora.getFullYear())
  const [mes, setMes] = useState(ahora.getMonth() + 1)
  const [ranking, setRanking] = useState<UsoTenantsRanking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orden, setOrden] = useState<OrdenUsoTenant>('gmv')
  const [detalle, setDetalle] = useState<UsoTenantFila | null>(null)
  const [detalleLoading, setDetalleLoading] = useState(false)

  const cargar = useCallback(() => {
    setLoading(true)
    observabilidadService.getUsoTenants({ anio, mes })
      .then(({ data: d }) => {
        setRanking(rankingDesdeRespuesta(d))
        setError(null)
      })
      .catch(() => setError('No se pudo cargar el uso por tenant'))
      .finally(() => setLoading(false))
  }, [anio, mes])

  useEffect(() => {
    cargar() // eslint-disable-line react-hooks/set-state-in-effect -- carga al montar y al cambiar período
  }, [cargar])

  const verDetalle = (empresaId: number) => {
    setDetalleLoading(true)
    observabilidadService.getUsoTenant(empresaId, { anio, mes })
      .then(({ data: d }) => setDetalle(detalleUsoDesdeRespuesta(d)))
      .catch(() => setError('No se pudo cargar el detalle del tenant'))
      .finally(() => setDetalleLoading(false))
  }

  const r = ranking?.resumen

  return (
    <section className="space-y-4" aria-labelledby="uso-tenants-titulo">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="uso-tenants-titulo" className="text-sm font-semibold uppercase tracking-wider text-gray-400">
            Uso por tenant
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            GMV entregado, pedidos y créditos de IA. Una consulta agregada, sin N+1.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="uso-mes">Mes</label>
          <select id="uso-mes" value={mes} onChange={(e) => setMes(Number(e.target.value))}
            className="min-h-11 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900">
            {MESES_USO.map((nombre, i) => (
              <option key={nombre} value={i + 1}>{nombre}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="uso-anio">Año</label>
          <select id="uso-anio" value={anio} onChange={(e) => setAnio(Number(e.target.value))}
            className="min-h-11 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900">
            {[ahora.getFullYear(), ahora.getFullYear() - 1, ahora.getFullYear() - 2].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button type="button" onClick={cargar} disabled={loading}
            className="min-h-11 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400">
            {loading ? 'Cargando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {r && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiUso label="Tenants" value={r.tenants} />
          <KpiUso label="GMV histórico" value={formatoColon(r.gmvTotal)} />
          <KpiUso label="Pedidos" value={r.pedidosTotal.toLocaleString('es-CR')} />
          <KpiUso label="Tokens del mes" value={r.tokensMesTotal.toLocaleString('es-CR')} />
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40">
          <span>{error}</span>
          <button type="button" onClick={cargar} className="min-h-11 font-medium underline">Reintentar</button>
        </div>
      )}

      <UsoTenantsTabla
        ranking={ranking}
        loading={loading}
        orden={orden}
        onOrden={setOrden}
        onVer={verDetalle}
      />

      <UsoTenantDetalle
        fila={detalle}
        loading={detalleLoading}
        onClose={() => setDetalle(null)}
      />
    </section>
  )
}

function KpiUso({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}
