import { motion } from 'framer-motion'
import { CloseIcon, WhatsAppIcon } from './cartIcons'
import { marcarWhatsAppAbandonoDescartado, mensajeCarritoAbandonado, urlWhatsApp } from './cartHelpers'

export default function AbandonedWaPrompt({ items, total, onDismiss }) {
  function descartar() {
    marcarWhatsAppAbandonoDescartado()
    onDismiss()
  }

  const href = urlWhatsApp(mensajeCarritoAbandonado(items, total))
  const plural = items.length === 1 ? '' : 's'

  return (
    <motion.div
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 120, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
    >
      <div
        className="rounded-2xl px-5 py-4 shadow-2xl relative"
        style={{
          background: 'var(--hc-surface)',
          border: '1px solid var(--hc-border)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
        }}
      >
        <button type="button"
          onClick={descartar}
          className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-lg text-[#8e8e9a] hover:text-white transition-colors hover:bg-white/8"
          aria-label="Cerrar"
        >
          <CloseIcon />
        </button>

        <div className="flex gap-3 mb-4">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: 'var(--hc-accent)', color: '#fff' }}
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l2.4 7.2H22l-6 4.4 2.3 7.2L12 16.4 5.7 20.8 8 13.6 2 9.2h7.6z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--hc-text)' }}>HotClick AI</p>
            <p className="text-sm leading-snug" style={{ color: 'var(--hc-muted)' }}>
              Llevás un rato aquí con {items.length} producto{plural} en el carrito.
              {' '}¿Continuamos la compra por WhatsApp o preferís seguir en la tienda?
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={descartar}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 active:scale-95"
            style={{ background: '#25D366', color: '#fff' }}
          >
            <WhatsAppIcon />
            Continuar por WhatsApp
          </a>
          <button type="button"
            onClick={descartar}
            className="w-full py-2 rounded-xl text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--hc-muted)' }}
          >
            Seguir en la tienda
          </button>
        </div>
      </div>
    </motion.div>
  )
}
