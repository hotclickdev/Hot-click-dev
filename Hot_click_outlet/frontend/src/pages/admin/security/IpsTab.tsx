import { useEffect, useState, useCallback } from 'react'
import Spinner from '@/components/ui/Spinner'
import { securityService } from '@/services/securityService'
import { timeAgo, fmtDate, type IpBloqueada, type IpSospechosa } from './securityHelpers'
import { Card, PeriodSelector } from './securityUi'

export default function IpsTab() {
  const [period, setPeriod]         = useState('24h')
  const [sospechosas, setSospechosas] = useState<IpSospechosa[]>([])
  const [bloqueadas, setBloqueadas]  = useState<IpBloqueada[]>([])
  const [loading, setLoading]        = useState(true)
  const [blocking, setBlocking]      = useState<string | null>(null)
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
      setSospechosas((sosp ?? []) as IpSospechosa[])
      setBloqueadas((bloq ?? []) as IpBloqueada[])
    } catch { /* show nothing on fetch failure — loading state reset in finally */ } finally { setLoading(false) }
  }, [period])

  useEffect(() => { load() }, [load]) // eslint-disable-line react-hooks/set-state-in-effect -- carga al montar

  const bloquear = async (ip: string, motivo = 'Bloqueada manualmente') => {
    setBlocking(ip)
    try { await securityService.bloquearIp(ip, motivo); await load() }
    catch { /* show nothing on fetch failure — loading state reset in finally */ } finally { setBlocking(null) }
  }

  const desbloquear = async (ip: string) => {
    setBlocking(ip)
    try { await securityService.desbloquearIp(ip); await load() }
    catch { /* show nothing on fetch failure — loading state reset in finally */ } finally { setBlocking(null) }
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
          <button type="button" key={id} onClick={() => setSubTab(id)}
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
                            style={{ color: (ip.loginsFallidos ?? 0) > 0 ? 'var(--hc-danger)' : 'var(--hc-muted)' }}>
                            {ip.loginsFallidos}
                          </td>
                          <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--hc-muted)' }}>{timeAgo(ip.ultimoEvento)}</td>
                          <td className="px-4 py-2.5">
                            {ip.bloqueada
                              ? <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--hc-danger-bg)', color: 'var(--hc-danger)' }}>Bloqueada</span>
                              : <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--hc-success-bg)', color: 'var(--hc-success)' }}>Libre</span>}
                          </td>
                          <td className="px-4 py-2.5">
                            {ip.bloqueada
                              ? <button type="button" onClick={() => desbloquear(ip.ip)} disabled={blocking === ip.ip}
                                  className="px-2.5 py-1 rounded-lg text-xs hover:opacity-80 disabled:opacity-40"
                                  style={{ backgroundColor: 'var(--hc-success-bg)', color: 'var(--hc-success)', border: '1px solid color-mix(in srgb, var(--hc-success) 30%, transparent)' }}>
                                  {blocking === ip.ip ? '...' : 'Desbloquear'}
                                </button>
                              : <button type="button" onClick={() => bloquear(ip.ip)} disabled={blocking === ip.ip}
                                  className="px-2.5 py-1 rounded-lg text-xs hover:opacity-80 disabled:opacity-40"
                                  style={{ backgroundColor: 'var(--hc-danger-bg)', color: 'var(--hc-danger)', border: '1px solid color-mix(in srgb, var(--hc-danger) 30%, transparent)' }}>
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
                placeholder="Ej: 203.0.113.0"
                className="px-3 py-2 rounded-lg text-sm w-40"
                style={{ backgroundColor: 'var(--hc-bg)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }} />
              <input value={motivoInput} onChange={e => setMotivoInput(e.target.value)}
                placeholder="Motivo (opcional)"
                className="px-3 py-2 rounded-lg text-sm flex-1 min-w-40"
                style={{ backgroundColor: 'var(--hc-bg)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }} />
              <button type="button" onClick={bloquearManual} disabled={!ipInput.trim() || !!blocking}
                className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
                style={{ backgroundColor: 'var(--hc-danger)', color: '#fff' }}>
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
                              ? <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--hc-danger-bg)', color: 'var(--hc-danger)' }}>Activa</span>
                              : <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--hc-border)', color: 'var(--hc-muted)' }}>Inactiva</span>}
                          </td>
                          <td className="px-4 py-2.5">
                            {b.activa && (
                              <button type="button" onClick={() => desbloquear(b.ipAddress)} disabled={blocking === b.ipAddress}
                                className="px-2.5 py-1 rounded-lg text-xs hover:opacity-80 disabled:opacity-40"
                                style={{ backgroundColor: 'var(--hc-success-bg)', color: 'var(--hc-success)', border: '1px solid color-mix(in srgb, var(--hc-success) 30%, transparent)' }}>
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
