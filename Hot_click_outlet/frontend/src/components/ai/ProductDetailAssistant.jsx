import { motion, AnimatePresence } from 'framer-motion'
import { TypingDots, preguntasRapidasDe } from './productDetailAssistant/productDetailAssistantHelpers'
import { useProductDetailAssistant } from './productDetailAssistant/useProductDetailAssistant'

export default function ProductDetailAssistant({ product }) {
  const {
    abierto,
    setAbierto,
    mensajes,
    input,
    setInput,
    cargando,
    bottomRef,
    inputRef,
    enviar,
    onKeyDown,
  } = useProductDetailAssistant(product)

  if (!product) return null

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--hc-border)', background: 'var(--hc-surface)' }}
    >
      <button type="button"
        onClick={() => setAbierto(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-white/3"
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
          style={{ background: 'color-mix(in srgb, var(--hc-accent) 15%, transparent)', color: 'var(--hc-accent)' }}>
          ✦
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: 'var(--hc-text)' }}>
            Preguntale al experto del producto
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
            {abierto ? '¿Este producto es para vos? Preguntame lo que necesitás.' : '¿No estás seguro si es lo que buscás? Preguntame.'}
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
              {mensajes.length <= 1 && !cargando && (
                <div className="px-4 pt-3 pb-2 flex flex-wrap gap-1.5">
                  {preguntasRapidasDe(product).map(q => (
                    <button type="button"
                      key={q}
                      onClick={() => enviar(q)}
                      className="text-[11px] px-3 py-1.5 rounded-full transition-all hover:opacity-80"
                      style={{
                        background: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)',
                        color: 'var(--hc-accent)',
                        border: '1px solid color-mix(in srgb, var(--hc-accent) 25%, transparent)',
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              <div className="px-4 py-3 space-y-3 max-h-72 overflow-y-auto"
                style={{ scrollbarWidth: 'thin' }}>
                {mensajes.map((m, i) => (
                  <div key={i} className={`flex gap-2 ${m.rol === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {m.rol === 'assistant' && (
                      <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5"
                        style={{ background: 'var(--hc-accent)', color: '#fff' }}>✦</div>
                    )}
                    <div className="max-w-[85%] space-y-2">
                      {m.typing
                        ? <div className="px-3 py-2 rounded-2xl rounded-tl-sm text-sm"
                            style={{ background: 'color-mix(in srgb, var(--hc-accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-accent) 15%, transparent)' }}>
                            <TypingDots />
                          </div>
                        : <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${m.rol === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                            style={m.rol === 'user'
                              ? { background: 'var(--hc-accent)', color: '#fff' }
                              : { background: 'color-mix(in srgb, var(--hc-accent) 8%, transparent)', color: 'var(--hc-text)', border: '1px solid color-mix(in srgb, var(--hc-accent) 12%, transparent)' }}>
                            {m.texto}
                          </div>
                      }
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid var(--hc-border)' }}>
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={cargando ? 'Analizando...' : '¿Para qué espacio lo querés? ¿Tenés alguna duda?'}
                    disabled={cargando}
                    maxLength={400}
                    className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none disabled:opacity-50"
                    style={{
                      background: 'var(--hc-surface-2, rgba(0,0,0,0.04))',
                      border: '1px solid var(--hc-border)',
                      color: 'var(--hc-text)',
                    }}
                  />
                  <button type="button"
                    onClick={() => enviar()}
                    disabled={!input.trim() || cargando}
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:opacity-80 disabled:opacity-30"
                    style={{ background: 'var(--hc-accent)', color: '#fff' }}
                    aria-label="Enviar"
                  >
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
