import { motion, AnimatePresence } from 'framer-motion'
import { TypingDots } from './cartAssistant/cartAssistantHelpers'
import { CartAssistantProductCard } from './cartAssistant/CartAssistantProductCard'
import { useCartAssistant } from './cartAssistant/useCartAssistant'

export default function CartAssistant({ cartItems, cartTotal }) {
  const {
    abierto,
    setAbierto,
    mensajes,
    input,
    setInput,
    cargando,
    bottomRef,
    inputRef,
    busquedasPrevias,
    addCartItem,
    enviar,
    onKeyDown,
  } = useCartAssistant({ cartItems, cartTotal })

  if (cartItems.length === 0) return null

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--hc-border)', background: 'var(--hc-surface)' }}>
      <button type="button"
        onClick={() => setAbierto(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-white/3"
      >
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold"
            style={{ background: 'color-mix(in srgb, var(--hc-accent) 15%, transparent)', color: 'var(--hc-accent)' }}>
            ✦
          </div>
          {busquedasPrevias && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 border-2"
              style={{ borderColor: 'var(--hc-surface)' }} />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: 'var(--hc-text)' }}>
            ¿Necesitás algo más?
            {busquedasPrevias && (
              <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'color-mix(in srgb, #4ade80 12%, transparent)', color: '#4ade80' }}>
                Contexto disponible
              </span>
            )}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
            {abierto
              ? 'Preguntame qué más podría complementar tu compra.'
              : 'El asistente puede sugerirte productos que van bien con lo que tenés.'}
          </p>
        </div>
        <motion.svg
          animate={{ rotate: abierto ? 180 : 0 }} transition={{ duration: 0.2 }}
          className="w-4 h-4 shrink-0" style={{ color: 'var(--hc-muted)' }}
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      <AnimatePresence initial={false}>
        {abierto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ borderTop: '1px solid var(--hc-border)' }}>
              <div className="px-4 py-3 space-y-3 max-h-80 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {mensajes.map((m, i) => (
                  <div key={i} className={`flex gap-2 ${m.rol === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {m.rol === 'assistant' && (
                      <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5"
                        style={{ background: 'var(--hc-accent)', color: '#fff' }}>✦</div>
                    )}
                    <div className="max-w-[88%] space-y-2">
                      {m.typing
                        ? <div className="px-3 py-2 rounded-2xl rounded-tl-sm text-sm"
                            style={{ background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
                            <TypingDots />
                          </div>
                        : <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${m.rol === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                            style={m.rol === 'user'
                              ? { background: 'var(--hc-accent)', color: '#fff' }
                              : { background: 'var(--hc-surface-2)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}>
                            {m.texto}
                          </div>
                      }
                      {!m.typing && m.productos?.length > 0 && (
                        <div className="space-y-2">
                          {m.productos.map((p, pi) => (
                            <CartAssistantProductCard key={p.id ?? pi} producto={p} onAdd={addCartItem} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {mensajes.length <= 1 && !cargando && (
                <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                  {['¿Qué va bien con esto?', 'Algo más económico', 'Accesorios relacionados'].map(s => (
                    <button type="button" key={s} onClick={() => enviar(s)}
                      className="text-[11px] px-3 py-1.5 rounded-full hover:opacity-80 transition-opacity"
                      style={{ background: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)', color: 'var(--hc-accent)', border: '1px solid color-mix(in srgb, var(--hc-accent) 20%, transparent)' }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid var(--hc-border)' }}>
                <div className="flex gap-2">
                  <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown}
                    placeholder={cargando ? 'Buscando...' : '¿Buscás algo más para completar tu compra?'}
                    disabled={cargando} maxLength={400}
                    className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none disabled:opacity-50"
                    style={{ background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
                  />
                  <button type="button" onClick={() => enviar()} disabled={!input.trim() || cargando}
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:opacity-80 disabled:opacity-30"
                    style={{ background: 'var(--hc-accent)', color: '#fff' }} aria-label="Enviar">
                    {cargando ? <TypingDots /> : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
