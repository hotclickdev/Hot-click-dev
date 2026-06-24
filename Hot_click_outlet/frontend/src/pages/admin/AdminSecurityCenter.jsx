import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import Spinner from '@/components/ui/Spinner'
import { securityService } from '@/services/securityService'

// ── Constantes ──────────────────────────────────────────────────────────────

const PERIODS = [
  { value: '1h',  label: '1h'    },
  { value: '24h', label: '24h'   },
  { value: '7d',  label: '7 días'},
  { value: '30d', label: '30 días'},
]

const SEVERITY_COLOR = {
  LOW:      { bg: 'rgba(34,197,94,0.12)',   text: '#4ade80', border: 'rgba(34,197,94,0.25)'  },
  MEDIUM:   { bg: 'rgba(234,179,8,0.12)',   text: '#facc15', border: 'rgba(234,179,8,0.25)'  },
  HIGH:     { bg: 'rgba(229,169,61,0.12)',  text: '#E5A93D', border: 'rgba(229,169,61,0.25)' },
  CRITICAL: { bg: 'rgba(239,68,68,0.12)',   text: '#f87171', border: 'rgba(239,68,68,0.25)'  },
}

const EVENT_LABEL = {
  LOGIN_SUCCESS: 'Login exitoso', LOGIN_FAILED: 'Login fallido', LOGIN_BLOCKED: 'Login bloqueado',
  LOGOUT: 'Logout', PASSWORD_RESET_REQUEST: 'Reset contraseña', PASSWORD_RESET_SUCCESS: 'Reset exitoso',
  PASSWORD_CHANGED: 'Contraseña cambiada', TWO_FA_SETUP: '2FA configurado', TWO_FA_ENABLED: '2FA activado',
  TWO_FA_DISABLED: '2FA desactivado', TWO_FA_FAILED: '2FA fallido', OTP_SENT: 'OTP enviado',
  OTP_VERIFIED: 'OTP verificado', TOKEN_REJECTED: 'Token rechazado', TOKEN_EXPIRED: 'Token expirado',
  TOKEN_REFRESH: 'Token refrescado', PERMISSION_DENIED: 'Permiso denegado',
  RATE_LIMIT_TRIGGERED: 'Rate limit', UPLOAD_REJECTED: 'Upload rechazado',
  SUSPICIOUS_ACTIVITY: 'Actividad sospechosa', BRUTE_FORCE_DETECTED: 'Brute force',
  OTP_ABUSE_DETECTED: 'OTP abuse', JWT_SCANNING_DETECTED: 'JWT scanning',
  CREDENTIAL_STUFFING_DETECTED: 'Credential stuffing', REGISTRATION_SUCCESS: 'Registro exitoso',
  REGISTRATION_FAILED: 'Registro fallido', ADMIN_ACTION: 'Acción admin',
}

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'usuarios',  label: 'Usuarios'  },
  { id: 'ips',       label: 'IPs'       },
  { id: 'eventos',   label: 'Eventos'   },
  { id: 'alertas',   label: 'Alertas'   },
  { id: 'sentry',    label: 'Sentry'    },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return `hace ${s}s`
  const m = Math.floor(s / 60)
  if (m < 60)  return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24)  return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-CR', { dateStyle: 'short', timeStyle: 'short' })
}

// ── Componentes pequeños ─────────────────────────────────────────────────────

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
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 flex flex-col gap-1"
      style={{ backgroundColor: 'var(--hc-card)', border: '1px solid var(--hc-border)' }}>
      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>{label}</p>
      <p className="text-3xl font-bold tabular-nums" style={{ color: accent || 'var(--hc-text)' }}>{value ?? '—'}</p>
      {sub && <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{sub}</p>}
    </motion.div>
  )
}

function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl ${className}`}
      style={{ backgroundColor: 'var(--hc-card)', border: '1px solid var(--hc-border)' }}>
      {children}
    </div>
  )
}

function TabBtn({ active, onClick, children, badge }) {
  return (
    <button onClick={onClick}
      className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5"
      style={{ backgroundColor: active ? 'var(--hc-accent)' : 'transparent', color: active ? '#fff' : 'var(--hc-muted)' }}>
      {children}
      {badge > 0 && (
        <span className="px-1.5 py-0.5 rounded-full text-xs font-bold"
          style={{ backgroundColor: '#ef4444', color: '#fff' }}>{badge}</span>
      )}
    </button>
  )
}

function PeriodSelector({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {PERIODS.map(p => (
        <button key={p.value} onClick={() => onChange(p.value)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
          style={{
            backgroundColor: value === p.value ? 'var(--hc-accent)' : 'var(--hc-card)',
            color: value === p.value ? '#fff' : 'var(--hc-muted)',
            border: '1px solid var(--hc-border)',
          }}>
          {p.label}
        </button>
      ))}
    </div>
  )
}

// ── Tab Dashboard ────────────────────────────────────────────────────────────

function DashboardTab({ period, onPeriodChange }) {
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
    } catch {}
    finally { setLoading(false) }
  }, [period])

  useEffect(() => { load() }, [load])

  const handleResolve = async (id) => {
    setResolving(id)
    try { await securityService.resolveAlert(id); await load() }
    catch {} finally { setResolving(null) }
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
                <button onClick={() => handleResolve(alert.id)} disabled={resolving === alert.id}
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

// ── Tab Usuarios ─────────────────────────────────────────────────────────────

function UsuariosTab() {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [page, setPage]         = useState(0)
  const [selected, setSelected] = useState(null)
  const [detalle, setDetalle]   = useState(null)
  const [loadingDet, setLoadingDet] = useState(false)
  const [search, setSearch]     = useState('')

  const load = useCallback(async (p = 0) => {
    setLoading(true)
    try { const { data: d } = await securityService.getUsuarios({ page: p }); setData(d); setPage(p) }
    catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const verDetalle = async (u) => {
    setSelected(u); setDetalle(null); setLoadingDet(true)
    try { const { data: d } = await securityService.getEventosPorUsuario(u.correo); setDetalle(d) }
    catch {} finally { setLoadingDet(false) }
  }

  const usuarios = data?.content ?? []
  const filtered = search
    ? usuarios.filter(u => u.nombre?.toLowerCase().includes(search.toLowerCase()) || u.correo?.toLowerCase().includes(search.toLowerCase()))
    : usuarios

  if (selected) return (
    <div className="space-y-4">
      <button onClick={() => { setSelected(null); setDetalle(null) }}
        className="text-sm flex items-center gap-1" style={{ color: 'var(--hc-accent)' }}>
        ← Volver a la lista
      </button>
      <Card className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-lg" style={{ color: 'var(--hc-text)' }}>{selected.nombre}</p>
            <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>{selected.correo}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(selected.roles || []).map(r => (
              <span key={r} className="px-2 py-0.5 rounded text-xs font-mono"
                style={{ backgroundColor: 'var(--hc-border)', color: 'var(--hc-text)' }}>{r}</span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          {[
            ['Logins exitosos', selected.loginsExitosos, '#4ade80'],
            ['Logins fallidos', selected.loginsFallidos, '#f87171'],
            ['IPs distintas',   selected.ipsDistintas,  'var(--hc-text)'],
            ['2FA',             Boolean(selected.twoFactorEnabled) ? 'Activo' : 'Inactivo',
              selected.twoFactorEnabled ? '#4ade80' : '#f87171'],
          ].map(([label, val, color]) => (
            <div key={label} className="rounded-xl p-3 text-center"
              style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)' }}>
              <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{label}</p>
              <p className="text-xl font-bold tabular-nums mt-0.5" style={{ color }}>{val}</p>
            </div>
          ))}
        </div>
        <div className="text-xs space-y-1 pt-1" style={{ color: 'var(--hc-muted)' }}>
          <p>Registrado: {fmtDate(selected.fechaRegistro)}</p>
          <p>Último acceso: {fmtDate(selected.fechaUltimoAcceso)}</p>
          {selected.bloqueadoHasta && <p className="text-red-400">Bloqueado hasta: {fmtDate(selected.bloqueadoHasta)}</p>}
          {selected.intentosFallidos > 0 && <p className="text-yellow-400">Intentos fallidos acumulados: {selected.intentosFallidos}</p>}
        </div>
      </Card>

      {loadingDet && <div className="flex justify-center py-8"><Spinner /></div>}
      {detalle && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-4 space-y-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>IPs usadas ({detalle.ips?.length ?? 0})</p>
              <div className="flex flex-wrap gap-2">
                {(detalle.ips || []).map(ip => (
                  <span key={ip} className="px-2 py-0.5 rounded font-mono text-xs"
                    style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>{ip}</span>
                ))}
              </div>
            </Card>
            <Card className="p-4 space-y-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Eventos por tipo</p>
              <div className="space-y-1">
                {Object.entries(detalle.porTipo || {}).slice(0, 8).map(([tipo, cnt]) => (
                  <div key={tipo} className="flex items-center justify-between text-xs">
                    <span style={{ color: 'var(--hc-muted)' }}>{EVENT_LABEL[tipo] || tipo}</span>
                    <span className="font-bold tabular-nums" style={{ color: 'var(--hc-text)' }}>{cnt}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <Card className="overflow-hidden">
            <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--hc-border)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Últimos 50 eventos</p>
            </div>
            <div className="divide-y overflow-x-auto" style={{ borderColor: 'var(--hc-border)' }}>
              {(detalle.eventos || []).map(ev => (
                <div key={ev.id} className="px-5 py-2.5 flex items-center gap-4 text-xs min-w-[560px]">
                  <span className="w-28 shrink-0 font-mono" style={{ color: 'var(--hc-muted)' }}>{timeAgo(ev.timestamp)}</span>
                  <SeverityBadge severity={ev.severity} />
                  <span className="w-40 shrink-0 truncate" style={{ color: 'var(--hc-text)' }}>{EVENT_LABEL[ev.eventType] || ev.eventType}</span>
                  <span className="font-mono truncate" style={{ color: 'var(--hc-muted)' }}>{ev.ipAddress || '—'}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Buscar por nombre o correo..."
        className="w-full sm:w-80 px-4 py-2 rounded-xl text-sm"
        style={{ backgroundColor: 'var(--hc-card)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }} />

      {loading && <div className="flex justify-center py-12"><Spinner /></div>}
      {!loading && (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[750px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
                    {['Usuario','Último acceso','2FA','Login OK','Login Fail','IPs','Estado',''].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--hc-border)' }}>
                  {filtered.map(u => (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-2.5">
                        <p className="font-medium" style={{ color: 'var(--hc-text)' }}>{u.nombre}</p>
                        <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{u.correo}</p>
                      </td>
                      <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--hc-muted)' }}>{timeAgo(u.fechaUltimoAcceso)}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold"
                          style={{ backgroundColor: u.twoFactorEnabled ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.1)',
                                   color: u.twoFactorEnabled ? '#4ade80' : '#f87171' }}>
                          {u.twoFactorEnabled ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center font-bold tabular-nums" style={{ color: '#4ade80' }}>{u.loginsExitosos}</td>
                      <td className="px-4 py-2.5 text-center font-bold tabular-nums" style={{ color: u.loginsFallidos > 0 ? '#f87171' : 'var(--hc-muted)' }}>{u.loginsFallidos}</td>
                      <td className="px-4 py-2.5 text-center" style={{ color: 'var(--hc-muted)' }}>{u.ipsDistintas}</td>
                      <td className="px-4 py-2.5">
                        {u.bloqueadoHasta
                          ? <span className="text-red-400 text-xs">Bloqueado</span>
                          : <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>Normal</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <button onClick={() => verDetalle(u)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium hover:opacity-80"
                          style={{ backgroundColor: 'var(--hc-border)', color: 'var(--hc-text)' }}>
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <p className="text-center py-8 text-sm" style={{ color: 'var(--hc-muted)' }}>Sin resultados</p>
            )}
          </Card>
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
              {data?.totalElements} usuarios · pág {(data?.page ?? 0) + 1} de {data?.totalPages || 1}
            </p>
            <div className="flex gap-2">
              <button onClick={() => load(page - 1)} disabled={page === 0}
                className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-40"
                style={{ backgroundColor: 'var(--hc-card)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}>
                ← Anterior
              </button>
              <button onClick={() => load(page + 1)} disabled={page >= (data?.totalPages - 1)}
                className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-40"
                style={{ backgroundColor: 'var(--hc-card)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}>
                Siguiente →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Tab IPs ──────────────────────────────────────────────────────────────────

function IpsTab() {
  const [period, setPeriod]         = useState('24h')
  const [sospechosas, setSospechosas] = useState([])
  const [bloqueadas, setBloqueadas]  = useState([])
  const [loading, setLoading]        = useState(true)
  const [blocking, setBlocking]      = useState(null)
  const [ipInput, setIpInput]        = useState('')
  const [motivoInput, setMotivoInput] = useState('')
  const [subTab, setSubTab]          = useState('sospechosas')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: sosp }, { data: bloq }] = await Promise.all([
        securityService.getIpsSospechosas(period),
        securityService.getIpsBloqueadas(),
      ])
      setSospechosas(sosp || [])
      setBloqueadas(bloq || [])
    } catch {} finally { setLoading(false) }
  }, [period])

  useEffect(() => { load() }, [load])

  const bloquear = async (ip, motivo = 'Bloqueada manualmente') => {
    setBlocking(ip)
    try { await securityService.bloquearIp(ip, motivo); await load() }
    catch {} finally { setBlocking(null) }
  }

  const desbloquear = async (ip) => {
    setBlocking(ip)
    try { await securityService.desbloquearIp(ip); await load() }
    catch {} finally { setBlocking(null) }
  }

  const bloquearManual = async () => {
    if (!ipInput.trim()) return
    await bloquear(ipInput.trim(), motivoInput || 'Bloqueada manualmente')
    setIpInput(''); setMotivoInput('')
  }

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        {[['sospechosas', `Sospechosas (${sospechosas.length})`], ['bloqueadas', `Bloqueadas (${bloqueadas.filter(b => b.activa).length})`]].map(([id, label]) => (
          <button key={id} onClick={() => setSubTab(id)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ backgroundColor: subTab === id ? 'var(--hc-accent)' : 'var(--hc-card)', color: subTab === id ? '#fff' : 'var(--hc-muted)', border: '1px solid var(--hc-border)' }}>
            {label}
          </button>
        ))}
      </div>

      {subTab === 'sospechosas' && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <PeriodSelector value={period} onChange={setPeriod} />
          </div>
          {loading
            ? <div className="flex justify-center py-10"><Spinner /></div>
            : <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[600px]">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
                        {['IP','Requests totales','Logins fallidos','Último evento','Estado',''].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-semibold uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--hc-border)' }}>
                      {sospechosas.map(ip => (
                        <tr key={ip.ip} className="hover:bg-white/5">
                          <td className="px-4 py-2.5 font-mono font-semibold" style={{ color: 'var(--hc-text)' }}>{ip.ip}</td>
                          <td className="px-4 py-2.5 text-center font-bold tabular-nums" style={{ color: 'var(--hc-text)' }}>{ip.totalRequests}</td>
                          <td className="px-4 py-2.5 text-center font-bold tabular-nums"
                            style={{ color: ip.loginsFallidos > 0 ? '#f87171' : 'var(--hc-muted)' }}>
                            {ip.loginsFallidos}
                          </td>
                          <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--hc-muted)' }}>{timeAgo(ip.ultimoEvento)}</td>
                          <td className="px-4 py-2.5">
                            {ip.bloqueada
                              ? <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171' }}>Bloqueada</span>
                              : <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>Libre</span>}
                          </td>
                          <td className="px-4 py-2.5">
                            {ip.bloqueada
                              ? <button onClick={() => desbloquear(ip.ip)} disabled={blocking === ip.ip}
                                  className="px-2.5 py-1 rounded-lg text-xs hover:opacity-80 disabled:opacity-40"
                                  style={{ backgroundColor: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>
                                  {blocking === ip.ip ? '...' : 'Desbloquear'}
                                </button>
                              : <button onClick={() => bloquear(ip.ip)} disabled={blocking === ip.ip}
                                  className="px-2.5 py-1 rounded-lg text-xs hover:opacity-80 disabled:opacity-40"
                                  style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                                  {blocking === ip.ip ? '...' : 'Bloquear'}
                                </button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {sospechosas.length === 0 && <p className="text-center py-8 text-sm" style={{ color: 'var(--hc-muted)' }}>Sin IPs sospechosas en este período</p>}
                </div>
              </Card>
          }
        </>
      )}

      {subTab === 'bloqueadas' && (
        <div className="space-y-4">
          {/* Bloquear manual */}
          <Card className="p-4">
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--hc-text)' }}>Bloquear IP manualmente</p>
            <div className="flex flex-wrap gap-2">
              <input value={ipInput} onChange={e => setIpInput(e.target.value)}
                placeholder="192.168.1.1"
                className="px-3 py-2 rounded-lg text-sm w-40"
                style={{ backgroundColor: 'var(--hc-bg)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }} />
              <input value={motivoInput} onChange={e => setMotivoInput(e.target.value)}
                placeholder="Motivo (opcional)"
                className="px-3 py-2 rounded-lg text-sm flex-1 min-w-40"
                style={{ backgroundColor: 'var(--hc-bg)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }} />
              <button onClick={bloquearManual} disabled={!ipInput.trim() || blocking}
                className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
                style={{ backgroundColor: '#ef4444', color: '#fff' }}>
                Bloquear
              </button>
            </div>
          </Card>

          {loading
            ? <div className="flex justify-center py-8"><Spinner /></div>
            : <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[600px]">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
                        {['IP','Motivo','Bloqueada por','Fecha','Estado',''].map(h => (
                          <th key={h} className="px-4 py-3 text-left font-semibold uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--hc-border)' }}>
                      {bloqueadas.map(b => (
                        <tr key={b.id} className="hover:bg-white/5">
                          <td className="px-4 py-2.5 font-mono font-semibold" style={{ color: 'var(--hc-text)' }}>{b.ipAddress}</td>
                          <td className="px-4 py-2.5 max-w-xs truncate" style={{ color: 'var(--hc-muted)' }}>{b.motivo || '—'}</td>
                          <td className="px-4 py-2.5" style={{ color: 'var(--hc-muted)' }}>{b.bloqueadaPor || '—'}</td>
                          <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--hc-muted)' }}>{fmtDate(b.fechaBloqueo)}</td>
                          <td className="px-4 py-2.5">
                            {b.activa
                              ? <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171' }}>Activa</span>
                              : <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--hc-border)', color: 'var(--hc-muted)' }}>Inactiva</span>}
                          </td>
                          <td className="px-4 py-2.5">
                            {b.activa && (
                              <button onClick={() => desbloquear(b.ipAddress)} disabled={blocking === b.ipAddress}
                                className="px-2.5 py-1 rounded-lg text-xs hover:opacity-80 disabled:opacity-40"
                                style={{ backgroundColor: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>
                                {blocking === b.ipAddress ? '...' : 'Desbloquear'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {bloqueadas.length === 0 && <p className="text-center py-8 text-sm" style={{ color: 'var(--hc-muted)' }}>Sin IPs bloqueadas</p>}
                </div>
              </Card>
          }
        </div>
      )}
    </div>
  )
}

// ── Tab Eventos ───────────────────────────────────────────────────────────────

function EventosTab() {
  const [evPage, setEvPage]   = useState(0)
  const [evData, setEvData]   = useState(null)
  const [evLoading, setEvLoading] = useState(false)
  const [evType, setEvType]   = useState('')
  const [evSev, setEvSev]     = useState('')
  const [exportPeriod, setExportPeriod] = useState('7d')

  const load = useCallback(async (p = 0) => {
    setEvLoading(true)
    try {
      const { data } = await securityService.getEvents({ page: p, size: 20, type: evType || undefined, severity: evSev || undefined, period: '7d' })
      setEvData(data); setEvPage(p)
    } catch {} finally { setEvLoading(false) }
  }, [evType, evSev])

  useEffect(() => { load(0) }, [load])

  const downloadCsv = () => {
    const url = securityService.getExportUrl(exportPeriod)
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || ''
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `security-log-${exportPeriod}.csv`
        a.click()
      })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <select value={evType} onChange={e => { setEvType(e.target.value); setEvPage(0) }}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--hc-card)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}>
            <option value="">Todos los tipos</option>
            {Object.entries(EVENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={evSev} onChange={e => { setEvSev(e.target.value); setEvPage(0) }}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--hc-card)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}>
            <option value="">Todas las severidades</option>
            {['LOW','MEDIUM','HIGH','CRITICAL'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {/* Export */}
        <div className="flex gap-2 items-center">
          <select value={exportPeriod} onChange={e => setExportPeriod(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--hc-card)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}>
            {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <button onClick={downloadCsv}
            className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5"
            style={{ backgroundColor: 'var(--hc-card)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Exportar CSV
          </button>
        </div>
      </div>

      {evLoading && <div className="flex justify-center py-10"><Spinner /></div>}
      {evData && !evLoading && (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
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
                    <tr key={ev.id} className="hover:bg-white/5">
                      <td className="px-4 py-2.5 font-mono whitespace-nowrap" style={{ color: 'var(--hc-muted)' }}>{fmtDate(ev.timestamp)}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--hc-text)' }}>{EVENT_LABEL[ev.eventType] || ev.eventType}</td>
                      <td className="px-4 py-2.5"><SeverityBadge severity={ev.severity} /></td>
                      <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--hc-muted)' }}>{ev.ipAddress || '—'}</td>
                      <td className="px-4 py-2.5 max-w-[200px] truncate" style={{ color: 'var(--hc-muted)' }}>{ev.email || '—'}</td>
                      <td className="px-4 py-2.5 font-mono max-w-[200px] truncate" style={{ color: 'var(--hc-muted)' }}>{ev.endpoint || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {evData.content.length === 0 && <p className="text-center py-8 text-sm" style={{ color: 'var(--hc-muted)' }}>Sin eventos</p>}
            </div>
          </Card>
          <div className="flex items-center justify-between">
            <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
              {evData.totalElements} eventos · pág {evData.page + 1} de {evData.totalPages || 1}
            </p>
            <div className="flex gap-2">
              <button onClick={() => load(evPage - 1)} disabled={evPage === 0}
                className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-40"
                style={{ backgroundColor: 'var(--hc-card)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}>← Anterior</button>
              <button onClick={() => load(evPage + 1)} disabled={evPage >= (evData.totalPages - 1)}
                className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-40"
                style={{ backgroundColor: 'var(--hc-card)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}>Siguiente →</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Tab Alertas ───────────────────────────────────────────────────────────────

function AlertasTab() {
  const [alerts, setAlerts]     = useState([])
  const [resolved, setResolved] = useState(false)
  const [loading, setLoading]   = useState(true)
  const [resolving, setResolving] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const { data } = await securityService.getAlerts(resolved); setAlerts(data) }
    catch {} finally { setLoading(false) }
  }, [resolved])

  useEffect(() => { load() }, [load])

  const handleResolve = async (id) => {
    setResolving(id)
    try { await securityService.resolveAlert(id); await load() }
    catch {} finally { setResolving(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[[false,'Activas'],[true,'Resueltas']].map(([v, label]) => (
          <button key={String(v)} onClick={() => setResolved(v)}
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
            style={{ backgroundColor: 'var(--hc-card)', border: `1px solid ${SEVERITY_COLOR[alert.severity]?.border || 'var(--hc-border)'}` }}>
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
                <button onClick={() => handleResolve(alert.id)} disabled={resolving === alert.id}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 disabled:opacity-40"
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

// ── Tab Sentry ────────────────────────────────────────────────────────────────

function SentryTab() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a href="https://hotclick.sentry.io/issues/?project=javascript" target="_blank" rel="noreferrer">
          <Card className="p-5 flex items-center gap-4 hover:opacity-80 transition-opacity cursor-pointer">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'rgba(99,102,241,0.15)' }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#818cf8">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>Errores React / Frontend</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>Proyecto: javascript · hotclick.sentry.io</p>
            </div>
            <svg className="w-4 h-4 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--hc-muted)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Card>
        </a>
        <a href="https://hotclick.sentry.io/issues/?project=spring-boot" target="_blank" rel="noreferrer">
          <Card className="p-5 flex items-center gap-4 hover:opacity-80 transition-opacity cursor-pointer">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'rgba(34,197,94,0.15)' }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#4ade80">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>Errores Java / Backend</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>Proyecto: spring-boot · hotclick.sentry.io</p>
            </div>
            <svg className="w-4 h-4 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--hc-muted)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Card>
        </a>
      </div>

      <Card className="p-5 space-y-3">
        <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Qué monitorea Sentry en HotClick</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs" style={{ color: 'var(--hc-muted)' }}>
          {[
            ['Frontend React', 'Errores de JavaScript, renders rotos, errores en checkout y carrito'],
            ['Backend Java',   'Excepciones no capturadas, errores 500, fallos en Stripe/S3/SendGrid'],
            ['Alertas email',  'Sentry envía email automático al detectar un error nuevo en producción'],
            ['Agrupación',     'Errores iguales se agrupan — 100 usuarios con el mismo bug = 1 issue'],
          ].map(([title, desc]) => (
            <div key={title} className="rounded-xl p-3"
              style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)' }}>
              <p className="font-semibold mb-1" style={{ color: 'var(--hc-text)' }}>{title}</p>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5 space-y-2">
        <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>DSNs configurados</p>
        <div className="space-y-1 text-xs font-mono" style={{ color: 'var(--hc-muted)' }}>
          <p>Frontend: <span style={{ color: 'var(--hc-text)' }}>VITE_SENTRY_DSN en .env.local</span></p>
          <p>Backend: <span style={{ color: 'var(--hc-text)' }}>SENTRY_DSN en EC2 .env</span></p>
        </div>
      </Card>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function AdminSecurityCenter() {
  const [tab, setTab]       = useState('dashboard')
  const [period, setPeriod] = useState('24h')
  const [alertCount, setAlertCount] = useState(0)

  useEffect(() => {
    securityService.getDashboard('24h')
      .then(({ data }) => setAlertCount(data?.summary?.activeAlerts ?? 0))
      .catch(() => {})
  }, [])

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>Security Center</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--hc-muted)' }}>
            Control de seguridad en tiempo real — solo ADMIN_IT
          </p>
        </div>
        {tab === 'dashboard' && <PeriodSelector value={period} onChange={setPeriod} />}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit overflow-x-auto"
        style={{ backgroundColor: 'var(--hc-card)', border: '1px solid var(--hc-border)' }}>
        {TABS.map(t => (
          <TabBtn key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}
            badge={t.id === 'alertas' ? alertCount : 0}>
            {t.label}
          </TabBtn>
        ))}
      </div>

      {/* Contenido */}
      {tab === 'dashboard' && <DashboardTab period={period} onPeriodChange={setPeriod} />}
      {tab === 'usuarios'  && <UsuariosTab />}
      {tab === 'ips'       && <IpsTab />}
      {tab === 'eventos'   && <EventosTab />}
      {tab === 'alertas'   && <AlertasTab />}
      {tab === 'sentry'    && <SentryTab />}
    </div>
  )
}
