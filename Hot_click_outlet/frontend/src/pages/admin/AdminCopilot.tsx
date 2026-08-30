import CopilotMsg from './copilot/CopilotMsg'
import CopilotInsightCards from './copilot/CopilotInsightCards'
import CopilotFixedChips from './copilot/CopilotFixedChips'
import { useCopilotChat } from './copilot/useCopilotChat'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { textoConsultasRestantes, type CopilotUso } from './copilot/copilotChatHelpers'

export default function AdminCopilot() {
  const chat = useCopilotChat()
  const copilotDeshabilitado = Boolean(chat.uso && !chat.uso.habilitado)

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto px-4 py-4">
      <CopilotHeader uso={chat.uso} pctUso={chat.pctUso} pctColor={chat.pctColor} onLimpiar={chat.pedirLimpiar} />

      {chat.uso && !chat.uso.habilitado && (
        <div className="rounded-2xl p-5 text-center mb-3 space-y-2"
          style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <p className="text-sm font-semibold" style={{ color: '#a8291f' }}>Consultas con Hot no disponible en tu plan actual</p>
          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
            Actualizá a PYME (80 consultas/mes) o NEGOCIO PLUS (consultas ilimitadas)
          </p>
        </div>
      )}

      <CopilotInsightCards
        insights={chat.insights}
        confirmandoId={chat.confirmandoId}
        setConfirmandoId={chat.setConfirmandoId}
        aplicandoId={chat.aplicandoId}
        aplicarDescuento={chat.aplicarDescuento}
      />

      <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
        {chat.mensajes.length === 0 && !chat.streamText && (
          <div className="text-center py-8 space-y-2">
            <p className="font-semibold" style={{ color: 'var(--hc-text)' }}>Consultas con Hot</p>
            <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--hc-muted)' }}>
              Preguntá con datos reales: inventario, ventas, reporte, finanzas, proyección y tu marca.
            </p>
          </div>
        )}

        {chat.mensajes.map((m, i) => (
          <CopilotMsg key={i} rol={m.rol} contenido={m.contenido} />
        ))}

        {chat.streamText && (
          <CopilotMsg rol="assistant" contenido={chat.streamText} streaming />
        )}

        <div ref={chat.bottomRef} />
      </div>

      <div className="pt-3 space-y-2" style={{ borderTop: '1px solid var(--hc-border)' }}>
        <CopilotFixedChips
          chips={chat.chipsFijos}
          onPick={chat.enviarTexto}
          disabled={chat.enviando || copilotDeshabilitado}
        />
        {chat.sugerencias.length > 0 && (
          <CopilotFixedChips
            chips={chat.sugerencias}
            onPick={chat.enviarTexto}
            disabled={chat.enviando || copilotDeshabilitado}
          />
        )}
        <form onSubmit={chat.enviar} className="flex gap-2">
          <textarea
            ref={chat.textareaRef}
            value={chat.input}
            onChange={(e) => chat.setInput(e.target.value)}
            onKeyDown={chat.onKeyDown}
            placeholder={chat.uso?.habilitado === false ? 'Consultas con Hot no disponible en tu plan' : 'Pregunta sobre tu negocio… (Enter para enviar, Shift+Enter = nueva línea)'}
            disabled={chat.enviando || copilotDeshabilitado}
            rows={2}
            className="flex-1 px-4 py-3 rounded-2xl text-sm outline-none resize-none disabled:opacity-50"
            style={{
              backgroundColor: 'var(--hc-surface)',
              border: '1.5px solid var(--hc-border)',
              color: 'var(--hc-text)',
            }}
          />
          <button type="submit" disabled={chat.enviando || !chat.input.trim() || copilotDeshabilitado}
            aria-label="Enviar"
            className="px-4 rounded-2xl font-semibold text-sm disabled:opacity-40 hover:opacity-80 transition-all min-w-[56px]"
            style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
            {chat.enviando ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
            ) : (
              <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
              </svg>
            )}
          </button>
        </form>
        <p className="text-[10px] text-center" style={{ color: 'var(--hc-muted)' }}>
          Las respuestas se generan con IA y pueden contener errores. Verificá datos importantes.
        </p>
      </div>
      <ConfirmModal
        open={chat.limpiarOpen}
        onClose={() => chat.setLimpiarOpen(false)}
        onConfirm={chat.confirmarLimpiar}
        title="Limpiar conversación"
        message="Se borra el historial de esta charla con Hot. No se puede deshacer."
        confirmLabel="Limpiar"
        danger={false}
      />
    </div>
  )
}

function CopilotHeader({ uso, pctUso, pctColor, onLimpiar }: {
  uso: CopilotUso | null
  pctUso: number
  pctColor: string
  onLimpiar: () => void
}) {
  return (
    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>Consultas con Hot</h1>
        <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
          Claude · datos en tiempo real de tu negocio
        </p>
      </div>
      <div className="flex items-center gap-3">
        {uso && (
          <div className="text-xs space-y-0.5">
            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--hc-muted)' }}>
                {textoConsultasRestantes(uso)}
              </span>
            </div>
            {(uso.limite ?? 0) > 0 && (
              <div className="w-32 h-1.5 rounded-full" style={{ backgroundColor: 'var(--hc-bg)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pctUso}%`, backgroundColor: pctColor }} />
              </div>
            )}
          </div>
        )}
        <button type="button" onClick={onLimpiar} className="text-xs px-2 py-2 min-h-[44px] rounded-lg hover:opacity-80"
          style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
          Limpiar
        </button>
      </div>
    </div>
  )
}
