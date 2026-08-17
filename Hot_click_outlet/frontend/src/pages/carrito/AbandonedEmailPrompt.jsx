import { motion } from 'framer-motion'
import { CloseIcon } from './cartIcons'

function EmailGuardado() {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-[#e8e8ed]">¡Listo!</p>
        <p className="text-xs text-[#8e8e9a]">Te avisamos si tu carrito sigue aquí.</p>
      </div>
    </div>
  )
}

function EmailForm({ email, onChange, onSave }) {
  return (
    <>
      <p className="text-sm font-semibold text-[#e8e8ed] mb-1">¿Te vas? Guarda tu carrito</p>
      <p className="text-xs text-[#8e8e9a] mb-3">
        Déjanos tu email y te enviamos un link para continuar cuando quieras.
      </p>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(evento) => onChange(evento.target.value)}
          onKeyDown={(evento) => evento.key === 'Enter' && onSave()}
          placeholder="tu@email.com"
          className="flex-1 h-9 px-3 rounded-xl text-sm outline-none transition-all"
          style={{
            background: 'var(--hc-bg)',
            border: '1px solid var(--hc-border)',
            color: 'var(--hc-text)',
          }}
        />
        <button type="button"
          onClick={onSave}
          className="px-4 h-9 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-95 shrink-0"
          style={{ background: 'var(--hc-accent)' }}
        >
          Guardar
        </button>
      </div>
    </>
  )
}

export default function AbandonedEmailPrompt({ email, emailSaved, onChangeEmail, onSave, onDismiss }) {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
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
          onClick={onDismiss}
          className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-lg text-[#8e8e9a] hover:text-white transition-colors hover:bg-white/8"
          aria-label="Cerrar"
        >
          <CloseIcon />
        </button>
        {emailSaved
          ? <EmailGuardado />
          : <EmailForm email={email} onChange={onChangeEmail} onSave={onSave} />}
      </div>
    </motion.div>
  )
}
