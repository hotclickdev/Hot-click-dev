import { motion } from 'framer-motion'
import { TypingDots } from './checkoutAssistant/checkoutAssistantHelpers'
import { useCheckoutAssistant } from './checkoutAssistant/useCheckoutAssistant'
import IconoAsistente from './IconoAsistente'

export default function CheckoutAssistant(props) {
  const {
    mensajes,
    input,
    setInput,
    cargando,
    bottomRef,
    inputRef,
    enviar,
    onKeyDown,
    isSuccess,
    accentColor,
    subtitleText,
  } = useCheckoutAssistant(props)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full rounded-2xl overflow-hidden mt-6"
      style={{
        background: isSuccess
          ? 'rgba(34,197,94,0.05)'
          : 'color-mix(in srgb, var(--hc-accent) 4%, transparent)',
        border: `1px solid ${isSuccess ? 'rgba(34,197,94,0.2)' : 'color-mix(in srgb, var(--hc-accent) 20%, transparent)'}`,
      }}
    >
      <div className="flex items-center gap-3 px-5 py-4"
        style={{ borderBottom: `1px solid ${isSuccess ? 'rgba(34,197,94,0.12)' : 'color-mix(in srgb, var(--hc-accent) 12%, transparent)'}` }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: isSuccess ? 'rgba(34,197,94,0.15)' : 'color-mix(in srgb, var(--hc-accent) 15%, transparent)', color: accentColor }}>
          <IconoAsistente exito={isSuccess} className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: 'var(--hc-text)' }}>
            {isSuccess ? 'Coordiná tu entrega' : 'Asistente de soporte'}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
            {cargando ? 'Procesando...' : subtitleText}
          </p>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3 max-h-72 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {mensajes.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.rol === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            {m.rol === 'assistant' && (
              <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5"
                style={{ background: accentColor, color: '#fff' }}>
                <IconoAsistente exito={isSuccess} className="w-3 h-3" />
              </div>
            )}
            <div className="max-w-[85%]">
              {m.typing
                ? <div className="px-3 py-2.5 rounded-2xl rounded-tl-sm text-sm"
                    style={{ background: isSuccess ? 'rgba(34,197,94,0.1)' : 'color-mix(in srgb, var(--hc-accent) 8%, transparent)', border: `1px solid ${isSuccess ? 'rgba(34,197,94,0.15)' : 'color-mix(in srgb, var(--hc-accent) 12%, transparent)'}` }}>
                    <TypingDots />
                  </div>
                : <div className={`px-3 py-2.5 rounded-2xl text-sm leading-relaxed ${m.rol === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                    style={m.rol === 'user'
                      ? { background: accentColor, color: '#fff' }
                      : { background: isSuccess ? 'rgba(34,197,94,0.08)' : 'color-mix(in srgb, var(--hc-accent) 8%, transparent)', color: 'var(--hc-text)', border: `1px solid ${isSuccess ? 'rgba(34,197,94,0.12)' : 'color-mix(in srgb, var(--hc-accent) 12%, transparent)'}` }}>
                    {m.texto}
                  </div>
              }
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 pb-4 pt-2"
        style={{ borderTop: `1px solid ${isSuccess ? 'rgba(34,197,94,0.12)' : 'color-mix(in srgb, var(--hc-accent) 10%, transparent)'}` }}>
        <div className="flex gap-2">
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown}
            placeholder={isSuccess ? 'Mi dirección es... / Mi número es...' : 'Escribí tu consulta...'}
            disabled={cargando} maxLength={400}
            className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none disabled:opacity-50"
            style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
          />
          <button type="button" onClick={() => enviar()} disabled={!input.trim() || cargando}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:opacity-80 disabled:opacity-30"
            style={{ background: accentColor, color: '#fff' }} aria-label="Enviar">
            {cargando ? <TypingDots /> : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
