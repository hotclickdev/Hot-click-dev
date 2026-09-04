import { useEffect, useState, useCallback } from 'react'
import Spinner from '@/components/ui/Spinner'
import { securityService } from '@/services/securityService'
import type { Id } from '@/types/api'
import { SEVERITY_COLOR, timeAgo, type SecurityAlert } from './securityHelpers'
import { SeverityBadge } from './securityUi'

export default function AlertasTab() {
  const [alerts, setAlerts]     = useState<SecurityAlert[]>([])
  const [resolved, setResolved] = useState(false)
  const [loading, setLoading]   = useState(true)
  const [resolving, setResolving] = useState<Id | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const { data } = await securityService.getAlerts(resolved); setAlerts(data as SecurityAlert[]) }
    catch { /* show nothing on fetch failure — loading state reset in finally */ } finally { setLoading(false) }
  }, [resolved])

  useEffect(() => { load() }, [load]) // eslint-disable-line react-hooks/set-state-in-effect -- carga al montar

  const handleResolve = async (id: Id) => {
    setResolving(id)
    try { await securityService.resolveAlert(id); await load() }
    catch { /* show nothing on fetch failure — loading state reset in finally */ } finally { setResolving(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {([[false, 'Activas'], [true, 'Resueltas']] as [boolean, string][]).map(([v, label]) => (
          <button type="button" key={String(v)} onClick={() => setResolved(v)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ backgroundColor: resolved === v ? 'var(--hc-accent)' : 'var(--hc-card)', color: resolved === v ? '#fff' : 'var(--hc-muted)', border: '1px solid var(--hc-border)' }}>
            {label}
          </button>
        ))}
      </div>
      {loading && <div className="flex justify-center py-10"><Spinner /></div>}
      {!loading && alerts.length === 0 && (
        <p className="text-center py-12 text-sm" style={{ color: 'var(--hc-muted)' }}>
          {resolved ? 'Sin alertas resueltas' : 'Sin alertas activas'}
        </p>
      )}
      <div className="space-y-3">
        {alerts.map(alert => (
          <div key={alert.id} className="rounded-2xl p-4 space-y-2"
            style={{ backgroundColor: 'var(--hc-card)', border: `1px solid ${SEVERITY_COLOR[alert.severity ?? '']?.border || 'var(--hc-border)'}` }}>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={alert.severity} />
                  <span className="text-xs font-mono font-semibold" style={{ color: 'var(--hc-text)' }}>{alert.alertType}</span>
                  <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>{timeAgo(alert.createdAt)}</span>
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>{alert.message}</p>
                {alert.details && <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{alert.details}</p>}
                <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'var(--hc-muted)' }}>
                  {alert.ipAddress && <span className="font-mono">IP: {alert.ipAddress}</span>}
                  {alert.userId && <span>userId: {alert.userId}</span>}
                </div>
              </div>
              {!alert.resolved && (
                <button type="button" onClick={() => handleResolve(alert.id)} disabled={resolving === alert.id}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 disabled:opacity-40"
                  style={{ backgroundColor: 'var(--hc-success-bg)', color: 'var(--hc-success)', border: '1px solid color-mix(in srgb, var(--hc-success) 30%, transparent)' }}>
                  {resolving === alert.id ? '...' : 'Resolver'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tab Sentry ────────────────────────────────────────────────────────────────
