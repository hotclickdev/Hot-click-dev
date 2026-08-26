import { useEffect, useState, useCallback } from 'react'
import Spinner from '@/components/ui/Spinner'
import { securityService } from '@/services/securityService'
import { EVENT_LABEL, timeAgo, fmtDate } from './securityHelpers'
import { Card, SeverityBadge } from './securityUi'
import TextoFlecha from '@/components/ui/TextoFlecha'

export default function UsuariosTab() {
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
    catch { /* show nothing on fetch failure — loading state reset in finally */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load]) // eslint-disable-line react-hooks/set-state-in-effect -- carga al montar

  const verDetalle = async (u) => {
    setSelected(u); setDetalle(null); setLoadingDet(true)
    try { const { data: d } = await securityService.getEventosPorUsuario(u.correo); setDetalle(d) }
    catch { /* show nothing on fetch failure — loading state reset in finally */ } finally { setLoadingDet(false) }
  }

  const usuarios = data?.content ?? []
  const filtered = search
    ? usuarios.filter(u => u.nombre?.toLowerCase().includes(search.toLowerCase()) || u.correo?.toLowerCase().includes(search.toLowerCase()))
    : usuarios

  if (selected) return (
    <div className="space-y-4">
      <button type="button" onClick={() => { setSelected(null); setDetalle(null) }}
        className="text-sm flex items-center gap-1" style={{ color: 'var(--hc-accent)' }}>
        <TextoFlecha dir="atras">Volver a la lista</TextoFlecha>
      </button>
      <Card className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-lg" style={{ color: 'var(--hc-text)' }}>{selected.nombre}</p>
            <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>{selected.correo}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(selected.roles ?? []).map(r => (
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
            ['2FA',             selected.twoFactorEnabled ? 'Activo' : 'Inactivo',
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
                {(detalle.ips ?? []).map(ip => (
                  <span key={ip} className="px-2 py-0.5 rounded font-mono text-xs"
                    style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>{ip}</span>
                ))}
              </div>
            </Card>
            <Card className="p-4 space-y-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Eventos por tipo</p>
              <div className="space-y-1">
                {Object.entries(detalle.porTipo ?? {}).slice(0, 8).map(([tipo, cnt]) => (
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
              {(detalle.eventos ?? []).map(ev => (
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
                        <button type="button" onClick={() => verDetalle(u)}
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
              <button type="button" onClick={() => load(page - 1)} disabled={page === 0}
                className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-40"
                style={{ backgroundColor: 'var(--hc-card)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}>
                <TextoFlecha dir="atras">Anterior</TextoFlecha>
              </button>
              <button type="button" onClick={() => load(page + 1)} disabled={page >= (data?.totalPages - 1)}
                className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-40"
                style={{ backgroundColor: 'var(--hc-card)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}>
                <TextoFlecha>Siguiente</TextoFlecha>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Tab IPs ──────────────────────────────────────────────────────────────────
