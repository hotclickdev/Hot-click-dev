import CopilotMsg from './copilot/CopilotMsg'
import { useCopilotChat } from './copilot/useCopilotChat'

export default function AdminCopilot() {
  const {
    mensajes,
    input,
    setInput,
    enviando,
    uso,
    sugerencias,
    accionables,
    confirmandoId,
    setConfirmandoId,
    aplicandoId,
    streamText,
    bottomRef,
    textareaRef,
    aplicarDescuento,
    enviar,
    limpiar,
    onKeyDown,
    pctUso,
    pctColor,
  } = useCopilotChat()

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto px-4 py-4">

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>
            🤖 AI Copilot
          </h1>
          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
            Powered by Claude · Contexto en tiempo real de tu negocio
          </p>
        </div>
        <div className="flex items-center gap-3">
          {uso && (
            <div className="text-xs space-y-0.5">
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--hc-muted)' }}>
                  {uso.llamadas}/{uso.limite < 0 ? '∞' : uso.limite} llamadas · {uso.plan}
                </span>
              </div>
              {uso.limite > 0 && (
                <div className="w-32 h-1.5 rounded-full" style={{ backgroundColor: 'var(--hc-bg)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pctUso}%`, backgroundColor: pctColor }} />
                </div>
              )}
            </div>
          )}
          <button type="button" onClick={limpiar} className="text-xs px-2 py-1 rounded-lg hover:opacity-80"
            style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
            Limpiar
          </button>
        </div>
      </div>

      {uso && !uso.habilitado && (
        <div className="rounded-2xl p-5 text-center mb-3 space-y-2"
          style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <p className="text-sm font-semibold" style={{ color: '#a8291f' }}>AI Copilot no disponible en tu plan actual</p>
          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
            Actualiza a PYME (80 consultas/mes) o NEGOCIO PLUS (consultas ilimitadas)
          </p>
        </div>
      )}

      {accionables.length > 0 && (
        <div className="rounded-2xl p-4 mb-3 space-y-2"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <p className="text-xs font-semibold" style={{ color: 'var(--hc-text)' }}>
            Productos sin ventas recientes — acción sugerida
          </p>
          {accionables.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 text-xs py-1.5"
              style={{ borderTop: '1px solid var(--hc-border)' }}>
              <div className="min-w-0">
                <p className="truncate font-medium" style={{ color: 'var(--hc-text)' }}>{p.nombre}</p>
                <p style={{ color: 'var(--hc-muted)' }}>Stock {p.stock} · última venta hace {p.diasSinVenta}</p>
              </div>
              {confirmandoId === p.id ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span style={{ color: 'var(--hc-muted)' }}>¿Aplicar {p.descuentoSugeridoPct}% de descuento?</span>
                  <button type="button" onClick={() => aplicarDescuento(p)} disabled={aplicandoId === p.id}
                    className="px-2 py-1 rounded-lg font-semibold disabled:opacity-50"
                    style={{ backgroundColor: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
                    {aplicandoId === p.id ? '...' : 'Confirmar'}
                  </button>
                  <button type="button" onClick={() => setConfirmandoId(null)} disabled={aplicandoId === p.id}
                    className="px-2 py-1 rounded-lg disabled:opacity-50"
                    style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmandoId(p.id)}
                  className="shrink-0 px-2 py-1 rounded-lg hover:opacity-80"
                  style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
                  Aplicar {p.descuentoSugeridoPct}% descuento
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
        {mensajes.length === 0 && !streamText && (
          <div className="text-center py-12 space-y-3">
            <div className="text-5xl">🤖</div>
            <p className="font-semibold" style={{ color: 'var(--hc-text)' }}>HotClick Copilot</p>
            <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--hc-muted)' }}>
              Pregúntame sobre tus ventas, inventario, clientes o cualquier aspecto de tu negocio.
              Tengo acceso en tiempo real a tus datos.
            </p>
            <div className="flex flex-wrap gap-2 justify-center pt-2">
              {sugerencias.map((s) => (
                <button type="button" key={s} onClick={() => setInput(s)}
                  className="text-xs px-3 py-1.5 rounded-xl hover:opacity-80"
                  style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {mensajes.map((m, i) => (
          <CopilotMsg key={i} rol={m.rol} contenido={m.contenido} />
        ))}

        {streamText && (
          <CopilotMsg rol="assistant" contenido={streamText} streaming />
        )}

        <div ref={bottomRef} />
      </div>

      <div className="pt-3" style={{ borderTop: '1px solid var(--hc-border)' }}>
        <form onSubmit={enviar} className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={uso?.habilitado === false ? 'AI Copilot no disponible en tu plan' : 'Pregunta sobre tu negocio… (Enter para enviar, Shift+Enter = nueva línea)'}
            disabled={enviando || (uso && !uso.habilitado)}
            rows={2}
            className="flex-1 px-4 py-3 rounded-2xl text-sm outline-none resize-none disabled:opacity-50"
            style={{
              backgroundColor: 'var(--hc-surface)',
              border: '1.5px solid var(--hc-border)',
              color: 'var(--hc-text)',
            }}
          />
          <button type="submit" disabled={enviando || !input.trim() || (uso && !uso.habilitado)}
            className="px-4 rounded-2xl font-semibold text-sm disabled:opacity-40 hover:opacity-80 transition-all"
            style={{ backgroundColor: 'var(--hc-accent)', color: '#fff', minWidth: 56 }}>
            {enviando ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
            ) : '↑'}
          </button>
        </form>
        <p className="text-[10px] text-center mt-1.5" style={{ color: 'var(--hc-muted)' }}>
          Las respuestas se generan con IA y pueden contener errores. Verifica datos importantes.
        </p>
      </div>
    </div>
  )
}
