import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import Spinner from '@/components/ui/Spinner'
import { securityService } from '@/services/securityService'

const PERIODS = [
  { value: '1h',  label: '1h'   },
  { value: '24h', label: '24h'  },
  { value: '7d',  label: '7 días' },
  { value: '30d', label: '30 días' },
]

const SEVERITY_COLOR = {
  LOW:      { bg: 'rgba(34,197,94,0.12)',   text: '#4ade80', border: 'rgba(34,197,94,0.25)'  },
  MEDIUM:   { bg: 'rgba(234,179,8,0.12)',   text: '#facc15', border: 'rgba(234,179,8,0.25)'  },
  HIGH:     { bg: 'rgba(249,115,22,0.12)',  text: '#fb923c', border: 'rgba(249,115,22,0.25)' },
  CRITICAL: { bg: 'rgba(239,68,68,0.12)',   text: '#f87171', border: 'rgba(239,68,68,0.25)'  },
}

const EVENT_LABEL = {
  LOGIN_SUCCESS:               'Login exitoso',
  LOGIN_FAILED:                'Login fallido',
  LOGIN_BLOCKED:               'Login bloqueado',
  LOGOUT:                      'Logout',
  PASSWORD_RESET_REQUEST:      'Reset contraseña solicitado',
  PASSWORD_RESET_SUCCESS:      'Reset contraseña exitoso',
  PASSWORD_CHANGED:            'Contraseña cambiada',
  TWO_FA_SETUP:                '2FA configurado',
  TWO_FA_ENABLED:              '2FA activado',
  TWO_FA_DISABLED:             '2FA desactivado',
  TWO_FA_FAILED:               '2FA fallido',
  OTP_SENT:                    'OTP enviado',
  OTP_VERIFIED:                'OTP verificado',
  TOKEN_REJECTED:              'Token rechazado',
  TOKEN_EXPIRED:               'Token expirado',
  TOKEN_REFRESH:               'Token refrescado',
  PERMISSION_DENIED:           'Permiso denegado',
  RATE_LIMIT_TRIGGERED:        'Rate limit',
  UPLOAD_REJECTED:             'Upload rechazado',
  SUSPICIOUS_ACTIVITY:         'Actividad sospechosa',
  BRUTE_FORCE_DETECTED:        'Brute force',
  OTP_ABUSE_DETECTED:          'OTP abuse',
  JWT_SCANNING_DETECTED:       'JWT scanning',
  CREDENTIAL_STUFFING_DETECTED:'Credential stuffing',
  REGISTRATION_SUCCESS:        'Registro exitoso',
  REGISTRATION_FAILED:         'Registro fallido',
  ADMIN_ACTION:                'Acción admin',
}

function SeverityBadge({ severity }) {
  const c = SEVERITY_COLOR[severity] || SEVERITY_COLOR.LOW
  return (
    <span className="px-2 py-0.5 rounded-md text-xs font-semibold"
      style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {severity}
    </span>
  )
}

function KpiCard({ label, value, sub, accent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 flex flex-col gap-1"
      style={{ backgroundColor: 'var(--hc-card)', border: '1px solid var(--hc-border)' }}>
      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>{label}</p>
      <p className="text-3xl font-bold tabular-nums" style={{ color: accent || 'var(--hc-text)' }}>{value ?? '—'}</p>
      {sub && <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{sub}</p>}
    </motion.div>
  )
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return `hace ${s}s`
  const m = Math.floor(s / 60)
  if (m < 60)  return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24)  return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

export default function AdminSecurityCenter() {
  const [period, setPeriod]     = useState('24h')
  const [dash, setDash]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [resolving, setResolving] = useState(null)

  // Events tab state
  const [tab, setTab]           = useState('dashboard')
  const [evPage, setEvPage]     = useState(0)
  const [evData, setEvData]     = useState(null)
  const [evLoading, setEvLoading] = useState(false)
  const [evType, setEvType]     = useState('')
  const [evSev, setEvSev]       = useState('')

  const loadDashboard = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await securityService.getDashboard(period)
      setDash(data)
    } catch (e) {
      setError(e?.response?.data?.message || 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }, [period])

  const loadEvents = useCallback(async (page = 0) => {
    setEvLoading(true)
    try {
      const { data } = await securityService.getEvents({
        page, size: 20,
        type: evType || undefined,
        severity: evSev || undefined,
        period: '7d',
      })
      setEvData(data)
      setEvPage(page)
    } catch {}
    finally { setEvLoading(false) }
  }, [evType, evSev])

  useEffect(() => { loadDashboard() }, [loadDashboard])
  useEffect(() => { if (tab === 'events') loadEvents(0) }, [tab, loadEvents])

  const handleResolve = async (id) => {
    setResolving(id)
    try {
      await securityService.resolveAlert(id)
      await loadDashboard()
    } catch {}
    finally { setResolving(null) }
  }

  const { summary = {}, twoFactorAdoption = {}, eventsByType = {},
          recentEvents = [], activeAlerts = [] } = dash || {}

  return (
    <>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>
              Security Center
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--hc-muted)' }}>
              Observabilidad de seguridad en tiempo real — solo ADMIN_IT
            </p>
          </div>
          <div className="flex gap-2">
            {PERIODS.map(p => (
              <button key={p.value}
                onClick={() => setPeriod(p.value)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: period === p.value ? 'var(--hc-accent)' : 'var(--hc-card)',
                  color: period === p.value ? '#fff' : 'var(--hc-muted)',
                  border: '1px solid var(--hc-border)',
                }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl w-fit"
          style={{ backgroundColor: 'var(--hc-card)', border: '1px solid var(--hc-border)' }}>
          {[['dashboard','Dashboard'],['events','Eventos'],['alerts','Alertas']].map(([v,l]) => (
            <button key={v} onClick={() => setTab(v)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: tab === v ? 'var(--hc-accent)' : 'transparent',
                color: tab === v ? '#fff' : 'var(--hc-muted)',
              }}>
              {l}
              {v === 'alerts' && summary.activeAlerts > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold"
                  style={{ backgroundColor: '#ef4444', color: '#fff' }}>
                  {summary.activeAlerts}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── DASHBOARD TAB ── */}
        {tab === 'dashboard' && (
          <>
            {loading && <div className="flex justify-center py-16"><Spinner /></div>}
            {error   && <p className="text-center py-8" style={{ color: '#f87171' }}>{error}</p>}

            {dash && !loading && (
              <>
                {/* KPI row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  <KpiCard label="Eventos totales"   value={summary.totalEvents}    />
                  <KpiCard label="Logins fallidos"   value={summary.failedLogins}   accent="#fb923c" />
                  <KpiCard label="Tokens rechazados" value={summary.tokenRejections} accent="#facc15" />
                  <KpiCard label="Rate limits"       value={summary.rateLimitEvents} accent="#fb923c" />
                  <KpiCard label="Alertas activas"   value={summary.activeAlerts}   accent={summary.activeAlerts > 0 ? '#f87171' : undefined} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* 2FA adoption */}
                  <div className="rounded-2xl p-5 space-y-3"
                    style={{ backgroundColor: 'var(--hc-card)', border: '1px solid var(--hc-border)' }}>
                    <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Adopción 2FA</p>
                    <div className="flex items-end gap-3">
                      <span className="text-4xl font-bold tabular-nums" style={{ color: '#4ade80' }}>
                        {twoFactorAdoption.adoptionPercent ?? 0}%
                      </span>
                      <span className="text-sm mb-1" style={{ color: 'var(--hc-muted)' }}>
                        {twoFactorAdoption.enabled ?? 0} / {twoFactorAdoption.total ?? 0} usuarios activos
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--hc-border)' }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${twoFactorAdoption.adoptionPercent ?? 0}%`, backgroundColor: '#4ade80' }} />
                    </div>
                  </div>

                  {/* Severity breakdown */}
                  <div className="rounded-2xl p-5 space-y-3"
                    style={{ backgroundColor: 'var(--hc-card)', border: '1px solid var(--hc-border)' }}>
                    <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Severidad (período)</p>
                    <div className="space-y-2">
                      {['CRITICAL','HIGH','MEDIUM','LOW'].map(sev => {
                        const c = SEVERITY_COLOR[sev]
                        const n = summary[`${sev.toLowerCase()}Events`] ??
                                  (dash.eventsBySeverity?.[sev] ?? 0)
                        return (
                          <div key={sev} className="flex items-center justify-between">
                            <SeverityBadge severity={sev} />
                            <span className="text-sm font-bold tabular-nums" style={{ color: c.text }}>{n}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Top event types */}
                  <div className="rounded-2xl p-5 space-y-3"
                    style={{ backgroundColor: 'var(--hc-card)', border: '1px solid var(--hc-border)' }}>
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
                  </div>
                </div>

                {/* Active alerts */}
                {activeAlerts.length > 0 && (
                  <div className="rounded-2xl overflow-hidden"
                    style={{ border: '1px solid rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.05)' }}>
                    <div className="px-5 py-3 flex items-center gap-2"
                      style={{ borderBottom: '1px solid rgba(239,68,68,0.2)' }}>
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <p className="text-sm font-semibold text-red-400">
                        Alertas activas ({activeAlerts.length})
                      </p>
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
                            {alert.ipAddress && (
                              <p className="text-xs font-mono" style={{ color: 'var(--hc-muted)' }}>IP: {alert.ipAddress}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleResolve(alert.id)}
                            disabled={resolving === alert.id}
                            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                            style={{ backgroundColor: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>
                            {resolving === alert.id ? '...' : 'Resolver'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent events feed */}
                <div className="rounded-2xl overflow-hidden"
                  style={{ backgroundColor: 'var(--hc-card)', border: '1px solid var(--hc-border)' }}>
                  <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--hc-border)' }}>
                    <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Feed de eventos recientes</p>
                  </div>
                  <div className="divide-y overflow-x-auto" style={{ borderColor: 'var(--hc-border)' }}>
                    {recentEvents.length === 0 && (
                      <p className="px-5 py-8 text-sm text-center" style={{ color: 'var(--hc-muted)' }}>
                        Sin eventos registrados en este período
                      </p>
                    )}
                    {recentEvents.map(ev => (
                      <div key={ev.id} className="px-5 py-2.5 flex items-center gap-4 text-xs min-w-[640px]">
                        <span className="w-28 shrink-0 font-mono" style={{ color: 'var(--hc-muted)' }}>
                          {timeAgo(ev.timestamp)}
                        </span>
                        <SeverityBadge severity={ev.severity} />
                        <span className="w-44 shrink-0 font-mono truncate" style={{ color: 'var(--hc-text)' }}>
                          {EVENT_LABEL[ev.eventType] || ev.eventType}
                        </span>
                        <span className="w-32 shrink-0 font-mono truncate" style={{ color: 'var(--hc-muted)' }}>
                          {ev.ipAddress || '—'}
                        </span>
                        <span className="truncate" style={{ color: 'var(--hc-muted)' }}>
                          {ev.email || ev.endpoint || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ── EVENTS TAB ── */}
        {tab === 'events' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <select value={evType} onChange={e => { setEvType(e.target.value); setEvPage(0) }}
                className="px-3 py-2 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--hc-card)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}>
                <option value="">Todos los tipos</option>
                {Object.keys(EVENT_LABEL).map(k => <option key={k} value={k}>{EVENT_LABEL[k]}</option>)}
              </select>
              <select value={evSev} onChange={e => { setEvSev(e.target.value); setEvPage(0) }}
                className="px-3 py-2 rounded-lg text-sm"
                style={{ backgroundColor: 'var(--hc-card)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}>
                <option value="">Todas las severidades</option>
                {['LOW','MEDIUM','HIGH','CRITICAL'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => loadEvents(0)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
                Filtrar
              </button>
            </div>

            {evLoading && <div className="flex justify-center py-10"><Spinner /></div>}

            {evData && !evLoading && (
              <>
                <div className="rounded-2xl overflow-hidden overflow-x-auto"
                  style={{ backgroundColor: 'var(--hc-card)', border: '1px solid var(--hc-border)' }}>
                  <table className="w-full text-xs min-w-[700px]">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
                        {['Timestamp','Tipo','Severidad','IP','Email','Endpoint'].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-semibold uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--hc-border)' }}>
                      {evData.content.map(ev => (
                        <tr key={ev.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-2.5 font-mono whitespace-nowrap" style={{ color: 'var(--hc-muted)' }}>
                            {new Date(ev.timestamp).toLocaleString('es-CR')}
                          </td>
                          <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--hc-text)' }}>
                            {EVENT_LABEL[ev.eventType] || ev.eventType}
                          </td>
                          <td className="px-4 py-2.5"><SeverityBadge severity={ev.severity} /></td>
                          <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--hc-muted)' }}>{ev.ipAddress || '—'}</td>
                          <td className="px-4 py-2.5 truncate max-w-[160px]" style={{ color: 'var(--hc-muted)' }}>{ev.email || '—'}</td>
                          <td className="px-4 py-2.5 font-mono truncate max-w-[160px]" style={{ color: 'var(--hc-muted)' }}>{ev.endpoint || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {evData.content.length === 0 && (
                    <p className="px-5 py-8 text-sm text-center" style={{ color: 'var(--hc-muted)' }}>Sin eventos</p>
                  )}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between">
                  <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                    {evData.totalElements} eventos · pág {evData.page + 1} de {evData.totalPages || 1}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => loadEvents(evPage - 1)} disabled={evPage === 0}
                      className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-40"
                      style={{ backgroundColor: 'var(--hc-card)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}>
                      ← Anterior
                    </button>
                    <button onClick={() => loadEvents(evPage + 1)} disabled={evPage >= (evData.totalPages - 1)}
                      className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-40"
                      style={{ backgroundColor: 'var(--hc-card)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}>
                      Siguiente →
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ALERTS TAB ── */}
        {tab === 'alerts' && (
          <AlertsTab onResolve={handleResolve} resolving={resolving} />
        )}
      </div>
    </>
  )
}

function AlertsTab({ onResolve, resolving }) {
  const [alerts, setAlerts]   = useState([])
  const [resolved, setResolved] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await securityService.getAlerts(resolved)
      setAlerts(data)
    } catch {}
    finally { setLoading(false) }
  }, [resolved])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[false, true].map(v => (
          <button key={String(v)} onClick={() => setResolved(v)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: resolved === v ? 'var(--hc-accent)' : 'var(--hc-card)',
              color: resolved === v ? '#fff' : 'var(--hc-muted)',
              border: '1px solid var(--hc-border)',
            }}>
            {v ? 'Resueltas' : 'Activas'}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-10"><Spinner /></div>}

      {!loading && alerts.length === 0 && (
        <p className="text-center py-12 text-sm" style={{ color: 'var(--hc-muted)' }}>
          {resolved ? 'Sin alertas resueltas' : '✓ Sin alertas activas'}
        </p>
      )}

      <div className="space-y-3">
        {alerts.map(alert => (
          <div key={alert.id} className="rounded-2xl p-4 space-y-2"
            style={{
              backgroundColor: 'var(--hc-card)',
              border: `1px solid ${SEVERITY_COLOR[alert.severity]?.border || 'var(--hc-border)'}`,
            }}>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={alert.severity} />
                  <span className="text-xs font-mono font-semibold" style={{ color: 'var(--hc-text)' }}>
                    {alert.alertType}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                    {timeAgo(alert.createdAt)}
                  </span>
                  {alert.resolved && (
                    <span className="text-xs px-2 py-0.5 rounded-md"
                      style={{ backgroundColor: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}>
                      Resuelta
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>{alert.message}</p>
                {alert.details && (
                  <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{alert.details}</p>
                )}
                <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'var(--hc-muted)' }}>
                  {alert.ipAddress && <span className="font-mono">IP: {alert.ipAddress}</span>}
                  {alert.userId    && <span>userId: {alert.userId}</span>}
                  {alert.resolvedAt && <span>Resuelta: {new Date(alert.resolvedAt).toLocaleString('es-CR')}</span>}
                </div>
              </div>

              {!alert.resolved && (
                <button onClick={async () => { await onResolve(alert.id); load() }}
                  disabled={resolving === alert.id}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ backgroundColor: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>
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
