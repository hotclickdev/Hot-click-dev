import AIProductCard from '../AIProductCard'
import AICategoryChip from '../AICategoryChip'
import { TypingDots, AIAvatar } from '../AITypingBubble'
import { MarkdownSpan } from './MarkdownSpan'

export function AIChatMessageList({
  mensajes,
  accent,
  copiedIdx,
  copyMessage,
  enviar,
  setMensajes,
  removeMsg,
  handleAdd,
  whatsappNumber,
  isCarritoContext,
  hasProductsInLastMsg,
}) {
  return mensajes.map((m, i) => (
    <div
      key={i}
      className={`flex gap-2.5 ${m.rol === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
      style={{ animation: 'ai-msg-in 0.25s ease both' }}
    >
      {m.rol === 'assistant' && <AIAvatar />}
      <div className="max-w-[85%] space-y-2">
        {m.typing && !m.texto
          ? <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <TypingDots />
            </div>
          : (
            <div className="group relative">
              <div
                className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${m.rol === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                style={m.rol === 'user'
                  ? { background: accent, color: '#ffffff', fontWeight: 500 }
                  : {
                      background: m.failed ? '#FEF2F2' : '#F9FAFB',
                      color: '#111827',
                      border: `1px solid ${m.failed ? '#FECACA' : '#E5E7EB'}`,
                    }}
              >
                {m.rol === 'user'
                  ? <span style={{ whiteSpace: 'pre-wrap' }}>{m.texto}</span>
                  : <span style={{ whiteSpace: 'pre-wrap' }}>
                      <MarkdownSpan text={m.texto ?? ''} />
                      {m.typing && <span className="inline-block w-1.5 h-4 ml-0.5 align-middle animate-pulse rounded-sm bg-current opacity-70" />}
                    </span>
                }
                {m.failed && (
                  <button type="button"
                    onClick={() => { setMensajes(removeMsg(m)); enviar(m.failedQuery) }}
                    className="flex items-center gap-1 mt-2 text-[11px] font-medium transition-opacity hover:opacity-80"
                    style={{ color: '#E73B33' }}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reintentar
                  </button>
                )}
              </div>

              {m.rol === 'assistant' && !m.typing && !m.failed && m.texto && (
                <button type="button"
                  onClick={() => copyMessage(m.texto, i)}
                  className="absolute -bottom-1 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg"
                  style={{ background: '#F3F4F6', color: '#6B7280' }}
                  title={copiedIdx === i ? 'Copiado' : 'Copiar respuesta'}
                >
                  {copiedIdx === i
                    ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                  }
                </button>
              )}
            </div>
          )
        }

        {m.productos?.length > 0 && (
          <div className="space-y-2">
            {m.productos.map((p, pi) => (
              <AIProductCard key={p.id ?? pi} producto={p} similarity={p.similarity}
                onAdd={handleAdd} whatsappNumber={whatsappNumber} />
            ))}
          </div>
        )}

        {!m.typing && m.categorias?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {m.categorias.map(cat => (
              <AICategoryChip key={cat} nombre={cat} accentColor={accent} />
            ))}
          </div>
        )}

        {!m.typing && m.opts?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {m.opts.map(opt => (
              <button type="button"
                key={opt}
                onClick={() => enviar(opt)}
                className="text-[11px] px-3 py-1.5 rounded-full font-medium transition-all hover:opacity-80 active:scale-95"
                style={{
                  background: `color-mix(in srgb, ${accent} 10%, transparent)`,
                  color: accent,
                  border: `1px solid color-mix(in srgb, ${accent} 25%, transparent)`,
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {!m.typing && m.rol === 'assistant' && isCarritoContext && hasProductsInLastMsg && i === mensajes.length - 1 && (
          <a
            href="/checkout"
            className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full font-bold transition-all hover:opacity-80 active:scale-95"
            style={{ background: accent, color: '#fff' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
            </svg>
            Ir al checkout
          </a>
        )}
      </div>
    </div>
  ))
}

export function AIChatInputBar({
  inputRef,
  input,
  setInput,
  onKeyDown,
  enviar,
  cargando,
  placeholder,
  accent,
  showHumanButton,
  whatsappNumber,
}) {
  return (
    <div
      className="flex items-center gap-0 rounded-full overflow-hidden transition-all"
      style={{ background: '#F9FAFB', border: '1.5px solid #E5E7EB' }}
    >
      <input
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={cargando ? 'Buscando...' : placeholder}
        disabled={cargando}
        maxLength={500}
        className="flex-1 px-4 py-3 text-sm outline-none bg-transparent disabled:opacity-50"
        style={{ color: '#111827', caretColor: accent }}
        onFocus={e => { e.currentTarget.closest('div').style.borderColor = accent }}
        onBlur={e => { e.currentTarget.closest('div').style.borderColor = '#E5E7EB' }}
      />
      {showHumanButton && (
        <a
          href={`https://wa.me/${whatsappNumber}?text=Hola,%20necesito%20ayuda%20con%20un%20producto`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-9 h-9 ml-1 rounded-full shrink-0 flex items-center justify-center transition-all hover:opacity-80"
          style={{ background: '#25D366', color: '#fff' }}
          title="Hablar con humano por WhatsApp"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.089.54 4.05 1.485 5.757L.057 23.882l6.233-1.43A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.804a9.777 9.777 0 01-4.986-1.367l-.358-.212-3.714.852.882-3.613-.23-.371A9.782 9.782 0 012.196 12C2.196 6.58 6.58 2.196 12 2.196S21.804 6.58 21.804 12 17.42 21.804 12 21.804z"/>
          </svg>
        </a>
      )}
      <button type="button"
        onClick={() => enviar()}
        disabled={!input.trim() || cargando}
        aria-label="Enviar"
        className="w-10 h-10 mr-1 ml-0.5 rounded-full shrink-0 flex items-center justify-center transition-all hover:opacity-80 active:scale-95 disabled:opacity-30"
        style={{ background: accent, color: '#fff' }}
      >
        {cargando
          ? <TypingDots color="rgba(255,255,255,0.8)" />
          : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
            </svg>
        }
      </button>
    </div>
  )
}

export function AIChatChips({ chips, enviar, accent }) {
  if (!chips?.length) return null
  const baseStyle = {
    background: `color-mix(in srgb, ${accent} 8%, transparent)`,
    color: accent,
    border: `1px solid color-mix(in srgb, ${accent} 20%, transparent)`,
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map(chip => (
        <button type="button"
          key={chip}
          onClick={() => enviar(chip)}
          className="text-[11px] px-3 py-1.5 rounded-full transition-all hover:opacity-80 active:scale-95"
          style={baseStyle}
        >
          {chip}
        </button>
      ))}
    </div>
  )
}
