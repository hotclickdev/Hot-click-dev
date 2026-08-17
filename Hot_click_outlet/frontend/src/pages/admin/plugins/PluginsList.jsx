import { parseEventos } from './pluginsHelpers'

export default function PluginsList({
  plugins,
  testOk,
  onTestWebhook,
  onShowLogs,
  onEdit,
  onDeactivate,
}) {
  return (
    <div className="space-y-3">
      {plugins.map(p => {
        const eventos = parseEventos(p.eventosSuscritos)
        return (
          <div key={p.id} className="rounded-2xl p-4"
            style={{ backgroundColor: 'var(--hc-surface)', border: `1px solid ${p.activo ? 'var(--hc-border)' : 'rgba(156,163,175,0.2)'}`, opacity: p.activo ? 1 : 0.55 }}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-lg"
                style={{ backgroundColor: 'var(--hc-bg)' }}>
                {p.tipo === 'WEBHOOK' ? '🪝' : '🖼️'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>{p.nombre}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{ backgroundColor: 'rgba(23,71,168,0.1)', color: 'var(--hc-accent)' }}>
                    {p.tipo}
                  </span>
                  {p.tieneSecretoHmac && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-emerald-400 bg-emerald-400/10">
                      HMAC firmado
                    </span>
                  )}
                  {!p.activo && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-gray-400 bg-gray-400/10">
                      Inactivo
                    </span>
                  )}
                </div>
                {p.descripcion && (
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--hc-muted)' }}>{p.descripcion}</p>
                )}
                <p className="text-xs font-mono mt-1 truncate" style={{ color: 'var(--hc-muted)' }}>{p.url}</p>
                {p.tipo === 'WEBHOOK' && eventos.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {eventos.map(ev => (
                      <span key={ev} className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                        style={{ backgroundColor: 'var(--hc-bg)', color: 'var(--hc-muted)', border: '1px solid var(--hc-border)' }}>
                        {ev}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                {p.tipo === 'WEBHOOK' && p.activo && (
                  <button onClick={() => onTestWebhook(p)}
                    className="text-xs px-2 py-1 rounded-lg hover:opacity-80 transition-all"
                    style={{ border: '1px solid var(--hc-border)', color: testOk === p.id ? '#10b981' : 'var(--hc-muted)' }}>
                    {testOk === p.id ? '✓ Enviado' : 'Test'}
                  </button>
                )}
                <button onClick={() => onShowLogs(p)}
                  className="text-xs px-2 py-1 rounded-lg hover:opacity-80"
                  style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
                  Logs
                </button>
                <button onClick={() => onEdit(p)}
                  className="text-xs px-2 py-1 rounded-lg hover:opacity-80"
                  style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
                  Editar
                </button>
                {p.activo && (
                  <button onClick={() => onDeactivate(p)}
                    className="text-xs px-2 py-1 rounded-lg hover:opacity-80"
                    style={{ border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}>
                    Desactivar
                  </button>
                )}
              </div>
            </div>

            {p.tipo === 'IFRAME' && p.activo && (
              <div className="mt-3 rounded-xl overflow-hidden" style={{ border: '1px solid var(--hc-border)', height: 320 }}>
                <iframe src={p.url} title={p.nombre} className="w-full h-full border-0" sandbox="allow-scripts allow-same-origin allow-forms" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
