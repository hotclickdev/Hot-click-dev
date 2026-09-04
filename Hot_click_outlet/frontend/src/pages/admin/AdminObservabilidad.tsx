import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { observabilidadService } from '@/services/observabilidadService'
import TrustGlyph from '@/components/ui/TrustGlyph'

type ColorKpi = 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'gray'

type DashboardObservabilidad = {
  empresas?: { total?: number; activas?: number; trial?: number; vencidas?: number }
  pedidos?: { total?: number; pendientes?: number; enPreparacion?: number; enviados?: number }
  pagos?: { capturados?: number; pendientes?: number; fallidos?: number }
  productos?: { total?: number }
  usuarios?: { activos?: number; pendientes?: number }
  seguridad?: {
    eventosTotal24h?: number
    eventosCriticos24h?: number
    intentosLogin24h?: number
    rateLimitHits24h?: number
    alertasAbiertas?: number
    alertasCriticas?: number
  }
  webhooks?: { pendientes?: number }
  ia?: { mes?: number | string; anio?: number | string; tokensMes?: number; llamadasMes?: number }
  baseDeDatos?: { tamano?: string; tamanoBytes?: number }
  generadoEn?: string
}

const fmt = (n: number | string | null | undefined) => typeof n === 'number' ? n.toLocaleString('es-CR') : (n ?? '—')

function KpiCard({ label, value, sub, color = 'gray', icono }: {
  label: string
  value?: number | string | null
  sub?: string
  color?: ColorKpi
  icono?: string
}) {
  const colors: Record<ColorKpi, string> = {
    green:  'border-[var(--hc-success)]/25 bg-[var(--hc-success-bg)]',
    red:    'border-[var(--hc-danger)]/25 bg-[var(--hc-danger-bg)]',
    amber:  'border-[var(--hc-warning)]/25 bg-[var(--hc-warning-bg)]',
    blue:   'border-[var(--hc-info)]/25 bg-[var(--hc-info-bg)]',
    purple: 'border-[var(--hc-blue-200)] bg-[var(--hc-blue-50)]',
    gray:   'border-[var(--hc-border)] bg-[var(--hc-surface)]',
  }
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--hc-text-disabled)]">{label}</p>
        {icono && (
          <span className="text-[var(--hc-text-disabled)]">
            <TrustGlyph tipo={icono} className="w-4 h-4" />
          </span>
        )}
      </div>
      <p className="mt-2 text-3xl font-bold text-[var(--hc-text)]">{fmt(value)}</p>
      {sub && <p className="mt-1 text-xs text-[var(--hc-muted)]">{sub}</p>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--hc-text-disabled)]">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {children}
      </div>
    </div>
  )
}

export default function AdminObservabilidad() {
  const [data, setData]       = useState<DashboardObservabilidad | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)

  const cargar = useCallback(() => {
    setLoading(true)
    observabilidadService.getDashboard()
      .then(({ data: d }) => {
        setData(d as DashboardObservabilidad)
        setLastUpdate(new Date().toLocaleTimeString('es-CR'))
        setError(null)
      })
      .catch(() => setError('No se pudieron cargar las métricas'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    cargar() // eslint-disable-line react-hooks/set-state-in-effect -- carga al montar
    const interval = setInterval(cargar, 60_000) // refresco cada 60s
    return () => clearInterval(interval)
  }, [cargar])

  if (loading && !data) return (
    <div className="flex items-center justify-center py-24 text-sm text-[var(--hc-text-disabled)]">
      Cargando métricas…
    </div>
  )

  if (error) return (
    <div className="mx-auto max-w-2xl p-8 text-center">
      <p className="text-[var(--hc-danger)]">{error}</p>
      <button type="button" onClick={cargar} className="mt-4 rounded-lg bg-[var(--hc-primary)] px-4 py-2 text-sm text-white hover:bg-[var(--hc-primary-hover)]">
        Reintentar
      </button>
    </div>
  )

  if (!data) return null

  const d = data

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--hc-text)]">
            Observabilidad — Plataforma HotClick
          </h1>
          <p className="text-sm text-[var(--hc-muted)]">
            Métricas en tiempo real del SaaS multi-tenant. Solo visible para ADMIN.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs text-[var(--hc-text-disabled)]">Actualizado: {lastUpdate}</span>
          )}
          <button type="button"
            onClick={cargar}
            disabled={loading}
            className="rounded-lg border border-[var(--hc-border)] px-3 py-1.5 text-xs font-medium text-[var(--hc-muted)] hover:bg-[var(--hc-surface-2)] disabled:opacity-40"
          >
            {loading ? 'Actualizando…' : 'Refrescar'}
          </button>
        </div>
      </div>

      {/* Empresas */}
      <Section title="Empresas">
        <KpiCard label="Total"    value={d.empresas?.total}    icono="edificio" color="gray" />
        <KpiCard label="Activas"  value={d.empresas?.activas}  icono="check" color="green" />
        <KpiCard label="Trial"    value={d.empresas?.trial}    icono="reloj" color="amber" />
        <KpiCard label="Vencidas" value={d.empresas?.vencidas} icono="error" color="red" />
      </Section>

      {/* Pedidos */}
      <Section title="Pedidos">
        <KpiCard label="Total histórico"  value={d.pedidos?.total}         icono="paquete" color="gray" />
        <KpiCard label="Pendientes"       value={d.pedidos?.pendientes}     icono="reloj" color="amber" />
        <KpiCard label="En preparación"   value={d.pedidos?.enPreparacion}  icono="lista" color="blue" />
        <KpiCard label="Enviados"         value={d.pedidos?.enviados}       icono="envio" color="green" />
      </Section>

      {/* Pagos */}
      <Section title="Pagos">
        <KpiCard label="Capturados"  value={d.pagos?.capturados} icono="tarjeta" color="green" />
        <KpiCard label="Pendientes"  value={d.pagos?.pendientes} icono="reloj" color="amber" />
        <KpiCard label="Fallidos"    value={d.pagos?.fallidos}   icono="error" color="red" />
        <KpiCard label="Productos"   value={d.productos?.total}  icono="bolsa" color="gray" />
      </Section>

      {/* Usuarios */}
      <Section title="Usuarios">
        <KpiCard label="Activos"    value={d.usuarios?.activos}    icono="clientes" color="green" />
        <KpiCard label="Pendientes" value={d.usuarios?.pendientes} icono="reloj" color="amber" />
      </Section>

      {/* Seguridad */}
      <Section title="Seguridad (últimas 24h)">
        <KpiCard
          label="Eventos totales"
          value={d.seguridad?.eventosTotal24h}
          icono="buscar"
          color="gray"
        />
        <KpiCard
          label="Eventos críticos"
          value={d.seguridad?.eventosCriticos24h}
          icono="alerta"
          color={(d.seguridad?.eventosCriticos24h ?? 0) > 0 ? 'red' : 'green'}
        />
        <KpiCard
          label="Fallos de login"
          value={d.seguridad?.intentosLogin24h}
          icono="candado"
          color={(d.seguridad?.intentosLogin24h ?? 0) > 50 ? 'red' : 'gray'}
        />
        <KpiCard
          label="Rate limit hits"
          value={d.seguridad?.rateLimitHits24h}
          icono="alerta"
          color={(d.seguridad?.rateLimitHits24h ?? 0) > 100 ? 'amber' : 'gray'}
        />
        <KpiCard
          label="Alertas abiertas"
          value={d.seguridad?.alertasAbiertas}
          icono="alerta"
          color={(d.seguridad?.alertasAbiertas ?? 0) > 0 ? 'red' : 'green'}
          sub={`${d.seguridad?.alertasCriticas ?? 0} críticas`}
        />
        <KpiCard
          label="Webhooks pendientes"
          value={d.webhooks?.pendientes}
          icono="campana"
          color={(d.webhooks?.pendientes ?? 0) > 0 ? 'amber' : 'green'}
        />
      </Section>

      {/* IA */}
      <Section title={`Consumo IA — ${d.ia?.mes}/${d.ia?.anio}`}>
        <KpiCard
          label="Tokens del mes"
          value={d.ia?.tokensMes}
          icono="sparkle"
          color="purple"
          sub="entrada + salida"
        />
        <KpiCard
          label="Llamadas a la API"
          value={d.ia?.llamadasMes}
          icono="sparkle"
          color="purple"
        />
      </Section>

      {/* Base de datos */}
      <Section title="Infraestructura">
        <KpiCard
          label="Tamaño BD"
          value={d.baseDeDatos?.tamano}
          icono="lista"
          color="blue"
          sub={d.baseDeDatos?.tamanoBytes
            ? `${(d.baseDeDatos.tamanoBytes / 1024 / 1024).toFixed(1)} MB`
            : undefined}
        />
      </Section>

      {/* Footer */}
      <p className="text-right text-xs text-[var(--hc-text-disabled)]">
        Generado: {d.generadoEn ? new Date(d.generadoEn).toLocaleString('es-CR') : '—'}
      </p>
    </div>
  )
}
