import { useEffect, useState, useCallback } from 'react'
import Spinner from '@/components/ui/Spinner'
import { securityService } from '@/services/securityService'
import type { Id } from '@/types/api'
import { EVENT_LABEL, SEVERITY_COLOR, timeAgo, type SecurityDashboard, type SesionesActivas } from './securityHelpers'
import { Card, KpiCard, SeverityBadge } from './securityUi'

export default function DashboardTab({ period }: { period: string; onPeriodChange?: (period: string) => void }) {
  const [dash, setDash]       = useState<SecurityDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [sesiones, setSesiones] = useState<SesionesActivas | null>(null)
  const [resolving, setResolving] = useState<Id | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data }, { data: ses }] = await Promise.all([
        securityService.getDashboard(period),
        securityService.getSesionesActivas(),
      ])
      setDash(data as SecurityDashboard)
      setSesiones(ses as SesionesActivas)
    } catch { /* show nothing on fetch failure — loading state reset in finally */ }
    finally { setLoading(false) }
  }, [period])

  useEffect(() => { load() }, [load]) // eslint-disable-line react-hooks/set-state-in-effect -- carga al montar

  const handleResolve = async (id: Id) => {
    setResolving(id)
    try { await securityService.resolveAlert(id); await load() }
    catch { /* show nothing on fetch failure — loading state reset in finally */ } finally { setResolving(null) }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>
  if (!dash)   return null

  const { summary = {}, twoFactorAdoption = {}, eventsByType = {}, recentEvents = [], activeAlerts = [] } = dash

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Eventos totales"    value={summary.totalEvents} />
        <KpiCard label="Logins fallidos"    value={summary.failedLogins}    accent="var(--hc-warning)" />
        <KpiCard label="Tokens rechazados"  value={summary.tokenRejections}  accent="var(--hc-warning)" />
        <KpiCard label="Rate limits"        value={summary.rateLimitEvents}  accent="var(--hc-warning)" />
        <KpiCard label="Alertas activas"    value={summary.activeAlerts}
          accent={(summary.activeAlerts ?? 0) > 0 ? 'var(--hc-danger)' : undefined} />
        <KpiCard label="Sesiones (30 min)"  value={sesiones?.activas30min ?? '—'} accent="var(--hc-success)"
          sub={`${sesiones?.activas24h ?? '—'} en 24h`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 2FA */}
        <Card className="p-5 space-y-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Adopción 2FA</p>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold tabular-nums" style={{ color: 'var(--hc-success)' }}>
              {twoFactorAdoption.adoptionPercent ?? 0}%
            </span>
            <span className="text-sm mb-1" style={{ color: 'var(--hc-muted)' }}>
              {twoFactorAdoption.enabled ?? 0} / {twoFactorAdoption.total ?? 0} usuarios
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--hc-border)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${twoFactorAdoption.adoptionPercent ?? 0}%`, backgroundColor: 'var(--hc-success)' }} />
          </div>
        </Card>

        {/* Severidad */}
        <Card className="p-5 space-y-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Severidad</p>
          <div className="space-y-2">
            {['CRITICAL','HIGH','MEDIUM','LOW'].map(sev => {
              const c = SEVERITY_COLOR[sev]
              const n = dash.eventsBySeverity?.[sev] ?? 0
              return (
                <div key={sev} className="flex items-center justify-between">
                  <SeverityBadge severity={sev} />
                  <span className="text-sm font-bold tabular-nums" style={{ color: c.text }}>{n}</span>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Top tipos */}
        <Card className="p-5 space-y-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Top eventos</p>
          <div className="space-y-2">
            {Object.entries(eventsByType).slice(0, 6).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-xs truncate max-w-[170px]" style={{ color: 'var(--hc-muted)' }}>
                  {EVENT_LABEL[type] || type}
                </span>
                <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--hc-text)' }}>{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Alertas activas */}
      {activeAlerts.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid color-mix(in srgb, var(--hc-danger) 30%, transparent)', backgroundColor: 'color-mix(in srgb, var(--hc-danger) 5%, transparent)' }}>
          <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid color-mix(in srgb, var(--hc-danger) 20%, transparent)' }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--hc-danger)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--hc-danger)' }}>Alertas activas ({activeAlerts.length})</p>
          </div>
          <div className="divide-y" style={{ borderColor: 'color-mix(in srgb, var(--hc-danger) 15%, transparent)' }}>
            {activeAlerts.map(alert => (
              <div key={alert.id} className="px-5 py-3 flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SeverityBadge severity={alert.severity} />
                    <span className="text-xs font-mono" style={{ color: 'var(--hc-muted)' }}>{alert.alertType}</span>
                    <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>{timeAgo(alert.createdAt)}</span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--hc-text)' }}>{alert.message}</p>
                  {alert.ipAddress && <p className="text-xs font-mono" style={{ color: 'var(--hc-muted)' }}>IP: {alert.ipAddress}</p>}
                </div>
                <button type="button" onClick={() => handleResolve(alert.id)} disabled={resolving === alert.id}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 disabled:opacity-40"
                  style={{ backgroundColor: 'var(--hc-success-bg)', color: 'var(--hc-success)', border: '1px solid color-mix(in srgb, var(--hc-success) 30%, transparent)' }}>
                  {resolving === alert.id ? '...' : 'Resolver'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feed reciente */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--hc-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Feed de eventos recientes</p>
        </div>
        <div className="divide-y overflow-x-auto" style={{ borderColor: 'var(--hc-border)' }}>
          {recentEvents.length === 0
            ? <p className="px-5 py-8 text-sm text-center" style={{ color: 'var(--hc-muted)' }}>Sin eventos en este período</p>
            : recentEvents.map(ev => (
                <div key={ev.id} className="px-5 py-2.5 flex items-center gap-4 text-xs min-w-[640px]">
                  <span className="w-28 shrink-0 font-mono" style={{ color: 'var(--hc-muted)' }}>{timeAgo(ev.timestamp)}</span>
                  <SeverityBadge severity={ev.severity} />
                  <span className="w-44 shrink-0 font-mono truncate" style={{ color: 'var(--hc-text)' }}>{EVENT_LABEL[ev.eventType ?? ''] || ev.eventType}</span>
                  <span className="w-32 shrink-0 font-mono truncate" style={{ color: 'var(--hc-muted)' }}>{ev.ipAddress || '—'}</span>
                  <span className="truncate" style={{ color: 'var(--hc-muted)' }}>{ev.email || ev.endpoint || '—'}</span>
                </div>
              ))
          }
        </div>
      </Card>
    </div>
  )
}
