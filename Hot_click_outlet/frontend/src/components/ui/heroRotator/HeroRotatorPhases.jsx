import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { formatPrice } from '@/utils/format'
import AIChat from '@/components/ai/AIChat'
import { isBrowser } from '@/utils/browser'
import { PREGUNTAS, SUGERENCIAS, CHAT_CHIPS, CIRCUMFERENCE } from './heroRotatorData'

export function ChatPhase({ accent, onPause, onResume, destacados, onSubmit }) {
  const [qIdx, setQIdx] = useState(0)
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    const t = setInterval(() => setQIdx((i) => (i + 1) % PREGUNTAS.length), 8000)
    return () => clearInterval(t)
  }, [])

  function submit(msg) {
    const text = (msg ?? input).trim()
    if (!text) return
    onSubmit?.(text)
    setInput('')
  }

  return (
    <motion.div
      key="chat"
      initial={{ opacity: 1, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center text-center w-full"
    >
      <div className="relative z-10 flex flex-col items-center max-w-xl mx-auto px-4 w-full">
        <h1 className="font-black tracking-tight mb-2"
          style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1.08, color: 'var(--hc-text)' }}>
          ¿Qué estás buscando hoy?
        </h1>

        <div className="w-full flex flex-col items-center mb-7" style={{ minHeight: '6.5rem' }}>
          <div className="relative w-full flex items-center justify-center overflow-hidden"
            style={{ minHeight: '3.2rem' }}>
            <AnimatePresence mode="wait">
              <motion.button
                key={`q-${qIdx}`}
                initial={{ y: -38, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 30, opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => submit(PREGUNTAS[qIdx])}
                className="absolute inset-x-0 font-bold hover:opacity-75 transition-opacity leading-snug"
                style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)', color: accent }}
              >
                {PREGUNTAS[qIdx]}
              </motion.button>
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            <motion.button
              key={`s-${qIdx}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, delay: 0.4 }}
              onClick={() => submit(SUGERENCIAS[qIdx])}
              className="mt-2 text-sm hover:underline active:opacity-70 transition-opacity"
              style={{ color: 'var(--hc-muted)' }}
            >
              {SUGERENCIAS[qIdx]}
            </motion.button>
          </AnimatePresence>
        </div>

        <div
          className="w-full flex items-center gap-3 rounded-2xl px-5 py-4 transition-all duration-200"
          style={{
            backgroundColor: 'var(--hc-surface)',
            border: `1.5px solid ${focused ? accent : 'var(--hc-border)'}`,
            boxShadow: focused
              ? `0 0 0 3px color-mix(in srgb, ${accent} 14%, transparent), 0 8px 28px rgba(0,0,0,0.09)`
              : '0 4px 20px rgba(0,0,0,0.07)',
          }}
        >
          <svg className="w-5 h-5 shrink-0 opacity-35" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
            onFocus={() => { setFocused(true); onPause?.() }}
            onBlur={() => { setFocused(false); if (!input.trim()) onResume?.() }}
            placeholder="Escribí qué buscás..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--hc-text)', caretColor: accent }}
          />
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => submit()}
            disabled={!input.trim()}
            aria-label="Enviar consulta"
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150"
            style={{
              backgroundColor: input.trim() ? accent : 'transparent',
              border: `1.5px solid ${input.trim() ? 'transparent' : 'var(--hc-border)'}`,
              color: input.trim() ? '#fff' : 'var(--hc-muted)',
              opacity: input.trim() ? 1 : 0.4,
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

export function ProductsPhase({ productos, accent }) {
  const navigate = useNavigate()
  const items = (productos ?? []).slice(0, 3)

  return (
    <motion.div
      key="products"
      initial={{ opacity: 1, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-5xl mx-auto px-4"
    >
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase mb-1" style={{ color: accent }}>
            Lo más destacado
          </p>
          <h2 className="font-black tracking-tight" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)', color: 'var(--hc-text)', lineHeight: 1.1 }}>
            Productos destacados
          </h2>
        </div>
        <Link to="/productos"
          className="text-sm font-semibold flex items-center gap-1 hover:opacity-70 transition-opacity shrink-0"
          style={{ color: accent }}>
          Ver todos los productos
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:grid sm:grid-cols-3 sm:overflow-visible sm:mx-0 sm:px-0">
          {[0, 1, 2].map((i) => (
            <div key={i} className="shrink-0 w-[70vw] sm:w-auto rounded-2xl overflow-hidden animate-pulse"
              style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
              <div className="aspect-[4/3]" style={{ background: 'var(--hc-border)' }} />
              <div className="p-4 space-y-2">
                <div className="h-3 rounded" style={{ background: 'var(--hc-border)', width: '70%' }} />
                <div className="h-4 rounded" style={{ background: 'var(--hc-border)', width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 snap-x snap-mandatory sm:grid sm:grid-cols-3 sm:overflow-visible sm:mx-0 sm:px-0 sm:snap-none">
          {items.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4, boxShadow: `0 12px 32px rgba(0,0,0,0.12)` }}
              onClick={() => navigate(`/productos/${p.id}`)}
              className="shrink-0 w-[70vw] snap-center sm:w-auto rounded-2xl overflow-hidden cursor-pointer group transition-all"
              style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
            >
              <div className="overflow-hidden" style={{ background: 'var(--hc-border)', aspectRatio: '4/3' }}>
                {p.imagenUrl ? (
                  <img src={p.imagenUrl} alt={p.nombre}
                    width="400" height="300"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center opacity-20"
                    style={{ fontSize: '3rem' }}>📦</div>
                )}
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--hc-text)' }}>{p.nombre}</p>
                <p className="text-xl font-black mt-1" style={{ color: accent }}>{formatPrice(p.precio)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

export function BusinessesPhase({ convenios, accent }) {
  const items = (convenios ?? []).slice(0, 2)

  return (
    <motion.div
      key="businesses"
      initial={{ opacity: 1, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-4xl mx-auto px-4"
    >
      <div className="text-center mb-8">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase mb-1" style={{ color: accent }}>
          Aliados HotClick
        </p>
        <h2 className="font-black tracking-tight" style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)', color: 'var(--hc-text)', lineHeight: 1.1 }}>
          Emprendimientos con convenio
        </h2>
      </div>

      {items.length === 0 ? (
        <div className="flex gap-6 justify-center">
          {[0, 1].map((i) => (
            <div key={i} className="flex-1 max-w-xs rounded-2xl overflow-hidden animate-pulse"
              style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
              <div className="h-32" style={{ background: 'var(--hc-border)' }} />
              <div className="p-5 space-y-2">
                <div className="h-3 rounded" style={{ background: 'var(--hc-border)', width: '60%' }} />
                <div className="h-3 rounded" style={{ background: 'var(--hc-border)', width: '80%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          {items.map((c, i) => (
            <motion.div
              key={c.id ?? i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.12 }}
              whileHover={{ y: -5, boxShadow: `0 16px 40px rgba(0,0,0,0.13)` }}
              className="flex-1 max-w-sm rounded-2xl overflow-hidden transition-all"
              style={{ background: 'var(--hc-surface)', border: `1px solid color-mix(in srgb, ${accent} 13%, transparent)` }}
            >
              <div className="h-28 flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 9%, transparent), color-mix(in srgb, ${accent} 3%, transparent))` }}>
                {c.logoUrl ? (
                  <img src={c.logoUrl} alt={c.nombre}
                    className="max-h-16 max-w-[70%] object-contain" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black"
                    style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}>
                    {(c.nombre ?? '?')[0].toUpperCase()}
                  </div>
                )}
              </div>

              <div className="p-5">
                <p className="font-bold text-base mb-1" style={{ color: 'var(--hc-text)' }}>{c.nombre}</p>
                {c.descripcion && (
                  <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--hc-muted)' }}>
                    {c.descripcion}
                  </p>
                )}
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold"
                  style={{ color: accent }}>
                  Convenio activo
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

export function PhaseBar({ phases, currentIdx, progress, onSelect }) {
  return (
    <div className="flex items-center justify-center gap-5 pb-2">
      {phases.map((p, i) => {
        const active = i === currentIdx
        const done = i < currentIdx
        let fill = 0
        if (active) fill = progress
        else if (done) fill = 100
        const dashOffset = CIRCUMFERENCE * (1 - fill / 100)
        return (
          <button
            key={p.id}
            onClick={() => onSelect(i)}
            title={p.label}
            className="relative flex items-center justify-center w-7 h-7 rounded-full hover:scale-110 active:scale-95 transition-transform"
            aria-label={p.label}
          >
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="none" strokeWidth="2"
                style={{ stroke: 'var(--hc-border)' }} />
              <circle cx="12" cy="12" r="10" fill="none" strokeWidth="2"
                strokeLinecap="round"
                style={{
                  stroke: p.accent,
                  strokeDasharray: CIRCUMFERENCE,
                  strokeDashoffset: dashOffset,
                  transition: active ? 'none' : 'stroke-dashoffset 0.4s ease',
                }} />
            </svg>
            <motion.div
              className="relative rounded-full"
              animate={{ width: active ? 10 : 6, height: active ? 10 : 6, opacity: active || done ? 1 : 0.35 }}
              transition={{ duration: 0.3 }}
              style={{ backgroundColor: active || done ? p.accent : 'var(--hc-muted)' }}
            />
          </button>
        )
      })}
    </div>
  )
}

export function InlineChat({ initialQuery, accent, onClose }) {
  return (
    <motion.div
      key="inline-chat"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-2xl mx-auto px-4 flex flex-col"
      style={{ minHeight: '68vh' }}
    >
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onClose}
          aria-label="Volver"
          className="flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-60"
          style={{ color: 'var(--hc-muted)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Volver
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: accent }}
          >
            <svg className="w-4 h-4" style={{ color: '#fff' }} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <span className="text-sm font-bold" style={{ color: 'var(--hc-text)' }}>Asistente HotClick</span>
        </div>
      </div>

      <div
        className="flex-1 rounded-2xl overflow-hidden"
        style={{
          background: 'var(--hc-surface)',
          border: '1px solid var(--hc-border)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
        }}
      >
        <AIChat
          context="GENERAL"
          sessionKey="hotclick"
          chips={CHAT_CHIPS}
          placeholder="¿Qué estás buscando?"
          autoQuery={initialQuery || undefined}
          maxHistoryHeight={Math.max(320, (isBrowser ? globalThis.innerHeight : 800) - 280)}
        />
      </div>
    </motion.div>
  )
}
