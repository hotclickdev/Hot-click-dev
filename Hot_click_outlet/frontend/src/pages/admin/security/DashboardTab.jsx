import { useEffect, useState, useCallback } from 'react'
import Spinner from '@/components/ui/Spinner'
import { securityService } from '@/services/securityService'
import { EVENT_LABEL, SEVERITY_COLOR, timeAgo } from './securityHelpers'
import { Card, KpiCard, SeverityBadge } from './securityUi'

export default function DashboardTab({ period }) {
  const [dash, setDash]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [sesiones, setSesiones] = useState(null)
  const [resolving, setResolving] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data }, { data: ses }] = await Promise.all([
        securityService.getDashboard(period),
        securityService.getSesionesActivas(),
      ])
      setDash(data)
      setSesiones(ses)
    } catch { /* show nothing on fetch failure — loading state reset in finally */ }
    finally { setLoading(false) }
  }, [period])

  useEffect(() => { load() }, [load]) // eslint-disable-line react-hooks/set-state-in-effect -- carga al montar

  const handleResolve = async (id) => {
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
        <KpiCard label="Logins fallidos"    value={summary.failedLogins}    accent="#E5A93D" />
        <KpiCard label="Tokens rechazados"  value={summary.tokenRejections}  accent="#facc15" />
        <KpiCard label="Rate limits"        value={summary.rateLimitEvents}  accent="#E5A93D" />
        <KpiCard label="Alertas activas"    value={summary.activeAlerts}
          accent={summary.activeAlerts > 0 ? '#f87171' : undefined} />
        <KpiCard label="Sesiones (30 min)"  value={sesiones?.activas30min ?? '—'} accent="#4ade80"
          sub={`${sesiones?.activas24h ?? '—'} en 24h`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 2FA */}
        <Card className="p-5 space-y-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Adopción 2FA</p>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold tabular-nums" style={{ color: '#4ade80' }}>
              {twoFactorAdoption.adoptionPercent ?? 0}%
            </span>
            <span className="text-sm mb-1" style={{ color: 'var(--hc-muted)' }}>
              {twoFactorAdoption.enabled ?? 0} / {twoFactorAdoption.total ?? 0} usuarios
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--hc-border)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${twoFactorAdoption.adoptionPercent ?? 0}%`, backgroundColor: '#4ade80' }} />
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
          style={{ border: '1px solid rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.05)' }}>
          <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(239,68,68,0.2)' }}>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <p className="text-sm font-semibold text-red-400">Alertas activas ({activeAlerts.length})</p>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(239,68,68,0.15)' }}>
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
                  style={{ backgroundColor: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>
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
                  <span className="w-44 shrink-0 font-mono truncate" style={{ color: 'var(--hc-text)' }}>{EVENT_LABEL[ev.eventType] || ev.eventType}</span>
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
