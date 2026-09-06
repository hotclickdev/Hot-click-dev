import { Link } from 'react-router-dom'
import CopilotInsightCards from './copilot/CopilotInsightCards'
import CopilotFixedChips from './copilot/CopilotFixedChips'
import { useCopilotChat } from './copilot/useCopilotChat'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { textoConsultasRestantes, type CopilotUso } from './copilot/copilotChatHelpers'
import TextoFlecha from '@/components/ui/TextoFlecha'

const AZUL = '#1747A8'
const MUTED = 'var(--hc-muted)'

/**
 * Consultas con Hot para el dueño (rol EMPRENDEDOR). Mockup Sistema - Hot.
 */
export default function SistemaCopilot() {
  const chat = useCopilotChat()
  const deshabilitado = Boolean(chat.enviando || (chat.uso && !chat.uso.habilitado))

  return (
    <div className="flex flex-col max-w-[820px] h-[calc(100vh-4rem)] box-border">
      <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-semibold mb-2" style={{ color: 'var(--hc-text)' }}>
        <TextoFlecha dir="atras">Inicio</TextoFlecha>
      </Link>
      <SistemaCopilotHeader uso={chat.uso} onLimpiar={chat.pedirLimpiar} />

      {chat.uso && !chat.uso.habilitado && (
        <div className="rounded-2xl p-5 text-center mb-3"
          style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <p className="text-sm font-semibold m-0" style={{ color: '#a8291f' }}>Hot no está en tu plan actual</p>
          <p className="text-xs m-0 mt-1" style={{ color: MUTED }}>
            Actualizá a PYME (80 consultas/mes) o Negocio Plus (consultas ilimitadas)
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

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 py-2.5 pr-1">
        {chat.mensajes.length === 0 && !chat.streamText && (
          <p className="text-[15px] m-0 py-6" style={{ color: MUTED }}>
            Tu asistente conoce tus ventas y productos. Preguntale lo que sea de tu negocio.
          </p>
        )}
        {chat.mensajes.map((m, i) => (
          <SistemaBurbuja key={i} rol={m.rol} contenido={m.contenido} />
        ))}
        {chat.streamText && <SistemaBurbuja rol="assistant" contenido={chat.streamText} streaming />}
        <div ref={chat.bottomRef} />
      </div>

      <div className="pt-3 space-y-3">
        <div data-mm="seller-copilot-chips">
          <CopilotFixedChips
            chips={chat.chipsFijos}
            onPick={chat.enviarTexto}
            disabled={deshabilitado}
            pills
          />
        </div>
        {chat.sugerencias.length > 0 && (
          <CopilotFixedChips chips={chat.sugerencias} onPick={chat.enviarTexto} disabled={deshabilitado} pills />
        )}
        <form onSubmit={chat.enviar} className="flex gap-2.5" data-mm="seller-copilot-input">
          <textarea
            ref={chat.textareaRef}
            value={chat.input}
            onChange={(e) => chat.setInput(e.target.value)}
            onKeyDown={chat.onKeyDown}
            placeholder={chat.uso?.habilitado === false ? 'Hot no está en tu plan' : 'Escribí tu consulta…'}
            disabled={deshabilitado}
            rows={1}
            className="flex-1 px-[18px] py-[15px] rounded-[10px] text-[15px] outline-none resize-none disabled:opacity-50"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
          />
          <button
            type="submit"
            disabled={deshabilitado || !chat.input.trim()}
            className="px-[26px] rounded-[10px] text-[15px] font-bold disabled:opacity-40"
            style={{ backgroundColor: '#E73B33', color: '#fff' }}
          >
            {chat.enviando ? '…' : 'Enviá'}
          </button>
        </form>
        <p className="text-[12px] text-center m-0" style={{ color: MUTED }}>
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

function SistemaCopilotHeader({ uso, onLimpiar }: { uso: CopilotUso | null; onLimpiar: () => void }) {
  return (
    <header className="flex items-center gap-3.5 py-2 mb-2 flex-wrap">
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-[17px] font-extrabold text-white"
        style={{ backgroundColor: AZUL, fontFamily: 'var(--font-display)' }}
      >
        H
      </div>
      <div className="flex-1 min-w-0">
        <h1 className="m-0 text-[22px] font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          Consultale a Hot
        </h1>
        <p className="m-0 text-[14px]" style={{ color: MUTED }}>
          {textoConsultasRestantes(uso) || 'Tu asistente conoce tus ventas y productos.'}
        </p>
      </div>
      <button
        type="button"
        onClick={onLimpiar}
        className="text-sm font-semibold px-3 py-2 min-h-[44px] rounded-[10px]"
        style={{ border: '1px solid var(--hc-border)', color: MUTED }}
      >
        Limpiar
      </button>
    </header>
  )
}

function SistemaBurbuja({ rol, contenido, streaming }: { rol: string; contenido: string; streaming?: boolean }) {
  const isUser = rol === 'user'
  if (isUser) {
    return (
      <div
        className="self-end max-w-[420px] px-[18px] py-3.5 text-[15px] leading-relaxed whitespace-pre-wrap"
        style={{ backgroundColor: AZUL, color: '#fff', borderRadius: '16px 16px 4px 16px' }}
      >
        {contenido}
      </div>
    )
  }
  return (
    <div className="self-start flex gap-2.5 max-w-[520px]">
      <div
        className="w-[30px] h-[30px] min-w-[30px] rounded-full flex items-center justify-center text-xs font-extrabold text-white"
        style={{ backgroundColor: AZUL, fontFamily: 'var(--font-display)' }}
      >
        H
      </div>
      <div
        className="px-[18px] py-3.5 text-[15px] leading-relaxed whitespace-pre-wrap bg-hc-surface-2"
        style={{ borderRadius: '4px 16px 16px 16px' }}
      >
        {contenido}
        {streaming && <span className="inline-block w-1.5 h-4 ml-0.5 align-middle animate-pulse rounded-sm bg-current opacity-70" />}
      </div>
    </div>
  )
}
