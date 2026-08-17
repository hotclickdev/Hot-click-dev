import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PREGUNTAS, SUGERENCIAS } from './heroRotatorData'

/** Pregunta rotativa e input para abrir el chat del hero. */
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
