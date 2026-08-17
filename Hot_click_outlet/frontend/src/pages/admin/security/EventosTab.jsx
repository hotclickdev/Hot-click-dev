import { useEffect, useState, useCallback } from 'react'
import Spinner from '@/components/ui/Spinner'
import { securityService } from '@/services/securityService'
import { EVENT_LABEL, PERIODS, fmtDate } from './securityHelpers'
import { Card, SeverityBadge } from './securityUi'

export default function EventosTab() {
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
    } catch { /* show nothing on fetch failure — loading state reset in finally */ } finally { setEvLoading(false) }
  }, [evType, evSev])

  useEffect(() => { load(0) }, [load]) // eslint-disable-line react-hooks/set-state-in-effect -- carga al montar

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
      .catch((err) => { console.error('[EventosTab] export CSV', err) })
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
          <button type="button" onClick={downloadCsv}
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
              <button type="button" onClick={() => load(evPage - 1)} disabled={evPage === 0}
                className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-40"
                style={{ backgroundColor: 'var(--hc-card)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}>← Anterior</button>
              <button type="button" onClick={() => load(evPage + 1)} disabled={evPage >= (evData.totalPages - 1)}
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
