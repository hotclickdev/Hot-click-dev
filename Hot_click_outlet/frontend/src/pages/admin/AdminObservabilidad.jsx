import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'

const fmt = (n) => typeof n === 'number' ? n.toLocaleString('es-CR') : (n ?? '—')

function KpiCard({ label, value, sub, color = 'gray', icon }) {
  const colors = {
    green:  'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30',
    red:    'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30',
    amber:  'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
    blue:   'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30',
    purple: 'border-[var(--hc-blue-200)] bg-[var(--hc-blue-50)] dark:border-[var(--hc-blue-800)] dark:bg-[var(--hc-blue-900)]/30',
    gray:   'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900',
  }
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{fmt(value)}</p>
      {sub && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {children}
      </div>
    </div>
  )
}

export default function AdminObservabilidad() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  const cargar = useCallback(() => {
    setLoading(true)
    api.get('/admin/observabilidad')
      .then(({ data: d }) => {
        setData(d)
        setLastUpdate(new Date().toLocaleTimeString('es-CR'))
        setError(null)
      })
      .catch(() => setError('No se pudieron cargar las métricas'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    cargar()
    const interval = setInterval(cargar, 60_000) // refresco cada 60s
    return () => clearInterval(interval)
  }, [cargar])

  if (loading && !data) return (
    <div className="flex items-center justify-center py-24 text-sm text-gray-400">
      Cargando métricas…
    </div>
  )

  if (error) return (
    <div className="mx-auto max-w-2xl p-8 text-center">
      <p className="text-red-500">{error}</p>
      <button onClick={cargar} className="mt-4 rounded-lg bg-[var(--hc-primary)] px-4 py-2 text-sm text-white hover:bg-[var(--hc-primary-hover)]">
        Reintentar
      </button>
    </div>
  )

  const d = data

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Observabilidad — Plataforma HotClick
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Métricas en tiempo real del SaaS multi-tenant. Solo visible para ADMIN.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs text-gray-400">Actualizado: {lastUpdate}</span>
          )}
          <button
            onClick={cargar}
            disabled={loading}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400"
          >
            {loading ? 'Actualizando…' : 'Refrescar'}
          </button>
        </div>
      </div>

      {/* Empresas */}
      <Section title="Empresas">
        <KpiCard label="Total"    value={d.empresas?.total}    icon="🏢" color="gray" />
        <KpiCard label="Activas"  value={d.empresas?.activas}  icon="✅" color="green" />
        <KpiCard label="Trial"    value={d.empresas?.trial}    icon="⏳" color="amber" />
        <KpiCard label="Vencidas" value={d.empresas?.vencidas} icon="🔴" color="red" />
      </Section>

      {/* Pedidos */}
      <Section title="Pedidos">
        <KpiCard label="Total histórico"  value={d.pedidos?.total}         icon="📦" color="gray" />
        <KpiCard label="Pendientes"       value={d.pedidos?.pendientes}     icon="🕐" color="amber" />
        <KpiCard label="En preparación"   value={d.pedidos?.enPreparacion}  icon="🔧" color="blue" />
        <KpiCard label="Enviados"         value={d.pedidos?.enviados}       icon="🚚" color="green" />
      </Section>

      {/* Pagos */}
      <Section title="Pagos">
        <KpiCard label="Capturados"  value={d.pagos?.capturados} icon="💳" color="green" />
        <KpiCard label="Pendientes"  value={d.pagos?.pendientes} icon="⏳" color="amber" />
        <KpiCard label="Fallidos"    value={d.pagos?.fallidos}   icon="❌" color="red" />
        <KpiCard label="Productos"   value={d.productos?.total}  icon="🛍️" color="gray" />
      </Section>

      {/* Usuarios */}
      <Section title="Usuarios">
        <KpiCard label="Activos"    value={d.usuarios?.activos}    icon="👤" color="green" />
        <KpiCard label="Pendientes" value={d.usuarios?.pendientes} icon="⏳" color="amber" />
      </Section>

      {/* Seguridad */}
      <Section title="Seguridad (últimas 24h)">
        <KpiCard
          label="Eventos totales"
          value={d.seguridad?.eventosTotal24h}
          icon="🔍"
          color="gray"
        />
        <KpiCard
          label="Eventos críticos"
          value={d.seguridad?.eventosCriticos24h}
          icon="🚨"
          color={d.seguridad?.eventosCriticos24h > 0 ? 'red' : 'green'}
        />
        <KpiCard
          label="Fallos de login"
          value={d.seguridad?.intentosLogin24h}
          icon="🔐"
          color={d.seguridad?.intentosLogin24h > 50 ? 'red' : 'gray'}
        />
        <KpiCard
          label="Rate limit hits"
          value={d.seguridad?.rateLimitHits24h}
          icon="🛑"
          color={d.seguridad?.rateLimitHits24h > 100 ? 'amber' : 'gray'}
        />
        <KpiCard
          label="Alertas abiertas"
          value={d.seguridad?.alertasAbiertas}
          icon="⚠️"
          color={d.seguridad?.alertasAbiertas > 0 ? 'red' : 'green'}
          sub={`${d.seguridad?.alertasCriticas ?? 0} críticas`}
        />
        <KpiCard
          label="Webhooks pendientes"
          value={d.webhooks?.pendientes}
          icon="🔔"
          color={d.webhooks?.pendientes > 0 ? 'amber' : 'green'}
        />
      </Section>

      {/* IA */}
      <Section title={`Consumo IA — ${d.ia?.mes}/${d.ia?.anio}`}>
        <KpiCard
          label="Tokens del mes"
          value={d.ia?.tokensMes}
          icon="🤖"
          color="purple"
          sub="entrada + salida"
        />
        <KpiCard
          label="Llamadas a la API"
          value={d.ia?.llamadasMes}
          icon="📡"
          color="purple"
        />
      </Section>

      {/* Base de datos */}
      <Section title="Infraestructura">
        <KpiCard
          label="Tamaño BD"
          value={d.baseDeDatos?.tamano}
          icon="🗄️"
          color="blue"
          sub={d.baseDeDatos?.tamanoBytes
            ? `${(d.baseDeDatos.tamanoBytes / 1024 / 1024).toFixed(1)} MB`
            : undefined}
        />
      </Section>

      {/* Footer */}
      <p className="text-right text-xs text-gray-300 dark:text-gray-600">
        Generado: {d.generadoEn ? new Date(d.generadoEn).toLocaleString('es-CR') : '—'}
      </p>
    </div>
  )
}
