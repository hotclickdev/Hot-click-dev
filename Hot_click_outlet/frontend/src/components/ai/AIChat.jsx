/**
 * AIChat — primitivo compartido de conversación HotClick AI.
 */
import { useAiChat } from './aiChat/useAiChat'
import './aiChat/aiChatHelpers'
import { AIChatMessageList, AIChatInputBar, AIChatChips } from './aiChat/AIChatViews'

export default function AIChat({
  empresaSlug = 'hotclick',
  context = 'GENERAL',
  sessionKey = 'hotclick',
  chips = [],
  placeholder = '¿En qué te puedo ayudar?',
  autoQuery = null,
  accentColor = null,
  maxHistoryHeight = 320,
  inputRef: externalInputRef = null,
  onProductAdd = null,
  whatsappNumber = '50686667888',
  showHumanButton = true,
  proactiveTrigger = false,
  exitIntentEnabled = false,
  fullHeight = false,
}) {
  const chat = useAiChat({
    empresaSlug,
    context,
    sessionKey,
    chips,
    autoQuery,
    accentColor,
    inputRef: externalInputRef,
    onProductAdd,
    proactiveTrigger,
    exitIntentEnabled,
  })

  const messageListProps = {
    mensajes: chat.mensajes,
    accent: chat.accent,
    copiedIdx: chat.copiedIdx,
    copyMessage: chat.copyMessage,
    enviar: chat.enviar,
    setMensajes: chat.setMensajes,
    removeMsg: chat.removeMsg,
    handleAdd: chat.handleAdd,
    whatsappNumber,
    isCarritoContext: chat.isCarritoContext,
    hasProductsInLastMsg: chat.hasProductsInLastMsg,
  }

  const afterHoursBanner = chat.afterHours && chat.mensajes.length === 0 && (
    <div className="flex items-start gap-2 px-3 py-2 rounded-xl text-xs"
      style={{ background: 'rgba(245,158,11,0.08)', color: '#B45309', border: '1px solid rgba(245,158,11,0.2)' }}>
      <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
      </svg>
      <span>Atención al cliente disponible 8am–8pm. Tu pedido se procesa igual y respondemos al WhatsApp al día siguiente.</span>
    </div>
  )

  const greetingEl = chat.greetingText && chat.mensajes.length === 0 && (
    <p className="text-xs px-1" style={{ color: 'var(--hc-text-muted, #6B7280)' }}>
      {chat.greetingText}
    </p>
  )

  const messageList = <AIChatMessageList {...messageListProps} />

  const sessionSearchChips = chat.sessionSearches.length > 0 && chat.mensajes.length === 0 && (
    <div className="space-y-1">
      <p className="text-[10px] font-medium px-1" style={{ color: '#9CA3AF' }}>Búsquedas recientes</p>
      <div className="flex flex-wrap gap-1.5">
        {chat.sessionSearches.slice(0, 4).map(s => (
          <button
            key={s}
            onClick={() => chat.enviar(s)}
            className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full transition-all hover:opacity-80 active:scale-95"
            style={{ background: '#F3F4F6', color: '#4B5563', border: '1px solid #E5E7EB' }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {s.length > 30 ? s.slice(0, 30) + '…' : s}
          </button>
        ))}
      </div>
    </div>
  )

  const initialChipsEl = chat.showChips && chat.userMsgCount === 0 && (
    <AIChatChips chips={chat.activeChips} enviar={chat.enviar} accent={chat.accent} />
  )

  const contextChipsEl = chat.showChips && chat.userMsgCount > 0 && (
    <AIChatChips chips={chat.activeChips} enviar={chat.enviar} accent={chat.accent} variant="context" />
  )

  const alternativasEl = chat.showAlternativas && (
    <button
      onClick={() => chat.enviar(chat.queryAlternativas)}
      className="self-start text-[11px] px-3 py-1.5 rounded-full transition-all hover:opacity-80 active:scale-95 flex items-center gap-1.5"
      style={{
        background: `color-mix(in srgb, ${chat.accent} 8%, transparent)`,
        color: chat.accent,
        border: `1px solid color-mix(in srgb, ${chat.accent} 20%, transparent)`,
      }}
    >
      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" />
      </svg>
      Ver productos similares
    </button>
  )

  const inputBar = (
    <AIChatInputBar
      inputRef={chat.inputRef}
      input={chat.input}
      setInput={chat.setInput}
      onKeyDown={chat.onKeyDown}
      enviar={chat.enviar}
      cargando={chat.cargando}
      placeholder={placeholder}
      accent={chat.accent}
      showHumanButton={showHumanButton}
      whatsappNumber={whatsappNumber}
    />
  )

  if (fullHeight) {
    return (
      <div className="h-full flex flex-col" style={{ background: 'var(--hc-surface)' }}>
        <div
          ref={chat.historyRef}
          className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-3 px-4 pt-4 pb-2"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--hc-border) transparent' }}
        >
          {afterHoursBanner}
          {greetingEl}
          {messageList}
          {sessionSearchChips}
          {chat.mensajes.length === 0 && <div className="flex-1" />}
          {initialChipsEl}
        </div>

        <div
          className="shrink-0 px-4 pt-2 pb-4 flex flex-col gap-2"
          style={{ borderTop: '1px solid var(--hc-border)' }}
        >
          {contextChipsEl}
          {alternativasEl}
          {inputBar}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {afterHoursBanner}
      {greetingEl}

      {chat.mensajes.length > 0 && (
        <div
          ref={chat.historyRef}
          className="space-y-4 overflow-y-auto"
          style={{
            maxHeight: maxHistoryHeight,
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--hc-border) transparent',
          }}
        >
          {messageList}
        </div>
      )}

      {sessionSearchChips}
      {initialChipsEl}
      {contextChipsEl}
      {alternativasEl}
      {inputBar}
    </div>
  )
}
