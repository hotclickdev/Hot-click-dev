import { useState, useEffect } from 'react'
import { pluginService } from '@/services/pluginService'
import { ESTADO_STYLE } from './pluginsHelpers'

export default function LogModal({ plugin, onClose }) {
  const [logs, setLogs] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    pluginService.getEventos(plugin.id)
      .then(({ data }) => setLogs(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [plugin.id])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} onClick={onClose} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
        onClick={e => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--hc-border)' }}>
          <h3 className="font-bold text-sm" style={{ color: 'var(--hc-text)' }}>
            Logs — {plugin.nombre}
          </h3>
          <button onClick={onClose} className="text-sm" style={{ color: 'var(--hc-muted)' }}>✕</button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {cargando ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 rounded-full animate-spin"
                style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center py-8 text-sm" style={{ color: 'var(--hc-muted)' }}>Sin eventos registrados</p>
          ) : logs.map(l => (
            <div key={l.id} className="flex items-start gap-3 p-3 rounded-xl text-xs"
              style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)' }}>
              <span className={`shrink-0 px-2 py-0.5 rounded-full font-bold text-[10px] ${ESTADO_STYLE[l.estado] ?? ''}`}>
                {l.estado}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-mono font-semibold" style={{ color: 'var(--hc-text)' }}>{l.evento}</p>
                {l.codigoRespuesta && <p style={{ color: 'var(--hc-muted)' }}>HTTP {l.codigoRespuesta}</p>}
                {l.mensajeError && <p className="text-red-400 truncate">{l.mensajeError}</p>}
              </div>
              <span className="shrink-0" style={{ color: 'var(--hc-muted)' }}>
                {l.fechaEnvio ? l.fechaEnvio.slice(0, 16).replace('T', ' ') : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
