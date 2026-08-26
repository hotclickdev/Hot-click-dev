import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { TypingDots } from './productsAssistant/ProductsAssistantTypingDots'
import { ProductsAssistantBurbuja } from './productsAssistant/ProductsAssistantBurbuja'
import { useProductsAssistant } from './productsAssistant/useProductsAssistant'
import IconoAsistente from './IconoAsistente'
import CloseIcon from '@/components/ui/CloseIcon'

export default function ProductsAssistantPanel({ isOpen, onClose, initialQuery = '', onCategoryFilter }) {
  const {
    mensajes,
    input,
    setInput,
    cargando,
    bottomRef,
    inputRef,
    addCartItem,
    enviar,
    onKeyDown,
  } = useProductsAssistant({ isOpen, initialQuery })

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 md:hidden"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
            onClick={onClose}
          />

          <motion.aside
            initial={{ x: -380 }}
            animate={{ x: 0 }}
            exit={{ x: -380 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="hc-ai-panel fixed left-0 top-0 h-full z-50 flex flex-col"
            style={{
              width: 'min(360px, 100vw)',
              backgroundColor: '#13131f',
              borderRight: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '8px 0 40px rgba(0,0,0,0.45)',
            }}
          >
            <div
              className="px-4 py-3.5 flex items-center gap-3 shrink-0"
              style={{
                background: 'linear-gradient(135deg, var(--hc-accent) 0%, color-mix(in srgb, var(--hc-accent) 70%, #152B5E) 100%)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }}
              >
                <IconoAsistente className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white leading-none">Asistente HotClick</p>
                <p className="text-[11px] text-white/55 mt-0.5 truncate">
                  {cargando ? 'Buscando productos...' : 'Te ayudo a encontrar lo que necesitás'}
                </p>
              </div>
              <button type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors shrink-0"
                aria-label="Cerrar asistente"
              >
                <CloseIcon className="w-4 h-4 text-white" />
              </button>
            </div>

            {initialQuery && (
              <div
                className="px-4 py-2 shrink-0"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.03)' }}
              >
                <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Buscaste: <span style={{ color: 'var(--hc-accent)' }}>"{initialQuery}"</span>
                </p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
              {mensajes.map((m, i) => (
                <ProductsAssistantBurbuja key={i} msg={m} onAdd={addCartItem} onCategoryFilter={onCategoryFilter} />
              ))}
              <div ref={bottomRef} />
            </div>

            {mensajes.length <= 1 && !cargando && !initialQuery && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
                {['¿Qué tenés?', 'Lo más popular', 'Ofertas', 'Busco un regalo'].map(s => (
                  <button type="button"
                    key={s}
                    onClick={() => enviar(s)}
                    className="text-[11px] px-2.5 py-1 rounded-full hover:opacity-70 transition-opacity"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      color: '#A7B0BC',
                      border: '1px solid rgba(255,255,255,0.13)',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div
              className="px-3 pb-4 pt-2.5 shrink-0"
              style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={cargando ? 'Buscando...' : '¿Qué más necesitás?'}
                  disabled={cargando}
                  maxLength={500}
                  className="flex-1 px-3 py-2 rounded-xl text-xs outline-none disabled:opacity-50"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    color: '#F4F6F9',
                    border: '1px solid rgba(255,255,255,0.14)',
                  }}
                />
                <button type="button"
                  onClick={() => enviar()}
                  disabled={!input.trim() || cargando}
                  className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center transition-opacity hover:opacity-80 disabled:opacity-30"
                  style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
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
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
