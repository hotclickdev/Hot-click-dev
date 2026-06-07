import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useChatStore from '@/store/chatStore'

const PREGUNTAS = [
  '¿Buscas algo para tu sala de estar?',
  '¿Necesitas un accesorio para la cocina?',
  '¿Algo especial para tu dormitorio?',
  '¿Qué le falta a tu espacio de trabajo en casa?',
  '¿Decoración para el jardín o terraza?',
  '¿Buscas un regalo especial?',
  '¿Organizadores para hacer tu hogar más ordenado?',
  '¿Iluminación o lámpara para tu espacio?',
  '¿Accesorios para hacer tu hogar más cómodo?',
  '¿Algo elegante para el comedor?',
  '¿Artículos para renovar tu baño?',
  '¿Un accesorio tecnológico para casa?',
  '¿Decoración minimalista para tu espacio?',
  '¿Algo práctico para la cocina?',
  '¿Renovás el cuarto de los niños?',
  '¿Qué producto estás buscando hoy?',
  '¿Accesorios para una oficina más productiva?',
  '¿Algo de temporada para el hogar?',
  '¿Muebles o accesorios para la sala?',
  '¿En qué ambiente de tu hogar querés invertir?',
]

const CHIPS = ['Sala', 'Cocina', 'Dormitorio', 'Oficina', 'Jardín', 'Regalo']
const INTERVAL = 8000

export default function HomeChatBar() {
  const [idx, setIdx] = useState(0)
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const openChat = useChatStore((s) => s.open)
  const inputRef = useRef(null)

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % PREGUNTAS.length), INTERVAL)
    return () => clearInterval(t)
  }, [])

  function submit(msg) {
    const text = (msg ?? input).trim()
    if (!text) return
    openChat(text)
    setInput('')
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); submit() }
  }

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{
        paddingTop: '4rem',
        paddingBottom: '4.5rem',
        background: `
          radial-gradient(ellipse 90% 70% at 50% 50%,
            color-mix(in srgb, var(--hc-accent, #ff4b12) 7%, transparent) 0%,
            transparent 65%
          ),
          var(--hc-bg)
        `,
        borderTop: '1px solid var(--hc-border)',
        borderBottom: '1px solid var(--hc-border)',
      }}
    >
      {/* Background dot grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--hc-text) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Decorative blobs */}
      <div aria-hidden className="pointer-events-none absolute -left-24 top-8 w-64 h-64 rounded-full blur-3xl opacity-20"
        style={{ background: 'color-mix(in srgb, var(--hc-accent, #ff4b12) 30%, transparent)' }} />
      <div aria-hidden className="pointer-events-none absolute -right-24 bottom-8 w-48 h-48 rounded-full blur-3xl opacity-15"
        style={{ background: 'color-mix(in srgb, var(--hc-accent, #ff4b12) 20%, transparent)' }} />

      <div className="relative max-w-2xl mx-auto px-5 flex flex-col items-center">

        {/* Label */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4 text-[10px] font-bold tracking-[0.2em] uppercase"
          style={{ color: 'var(--hc-muted)' }}
        >
          Asistente de compras HOTCLICK
        </motion.p>

        {/* Static title */}
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="text-3xl sm:text-4xl font-black tracking-tight text-center mb-2"
          style={{ color: 'var(--hc-text)', lineHeight: 1.15 }}
        >
          ¿Qué estás buscando hoy?
        </motion.h2>

        {/* Rotating question — the visual hero */}
        <div
          className="relative w-full flex items-center justify-center text-center overflow-hidden"
          style={{ minHeight: '3.5rem', marginBottom: '2rem' }}
        >
          <AnimatePresence mode="wait">
            <motion.button
              key={idx}
              initial={{ y: -36, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 32, opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => submit(PREGUNTAS[idx])}
              className="absolute inset-x-0 px-4 text-xl sm:text-2xl font-bold leading-snug text-center
                         hover:opacity-80 active:scale-[0.98] transition-all cursor-pointer"
              style={{ color: 'var(--hc-accent, #ff4b12)' }}
            >
              {PREGUNTAS[idx]}
            </motion.button>
          </AnimatePresence>
        </div>

        {/* Progress line */}
        <div className="w-full max-w-sm mb-6 flex items-center gap-1.5" aria-hidden>
          {PREGUNTAS.map((_, i) => (
            <motion.div
              key={i}
              animate={{ opacity: i === idx ? 1 : 0.15, scaleX: i === idx ? 1 : 1 }}
              transition={{ duration: 0.35 }}
              className="h-0.5 rounded-full flex-1 origin-left"
              style={{ backgroundColor: 'var(--hc-accent, #ff4b12)' }}
            />
          ))}
        </div>

        {/* Input bar — ChatGPT style */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full mb-5"
        >
          <div
            className="w-full flex items-center gap-3 rounded-2xl px-5 py-4 transition-all duration-200"
            style={{
              backgroundColor: 'var(--hc-surface)',
              border: `1.5px solid ${focused ? 'var(--hc-accent, #ff4b12)' : 'var(--hc-border)'}`,
              boxShadow: focused
                ? '0 0 0 3px color-mix(in srgb, var(--hc-accent, #ff4b12) 12%, transparent), 0 8px 32px rgba(0,0,0,0.12)'
                : '0 4px 20px rgba(0,0,0,0.08)',
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
              onKeyDown={onKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Escribí qué buscás o elegí una sugerencia arriba..."
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'var(--hc-text)', caretColor: 'var(--hc-accent, #ff4b12)' }}
            />

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => submit()}
              disabled={!input.trim()}
              aria-label="Enviar consulta"
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150"
              style={{
                backgroundColor: input.trim() ? 'var(--hc-accent, #ff4b12)' : 'transparent',
                border: `1.5px solid ${input.trim() ? 'transparent' : 'var(--hc-border)'}`,
                color: input.trim() ? '#fff' : 'var(--hc-muted)',
                opacity: input.trim() ? 1 : 0.45,
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </motion.button>
          </div>
        </motion.div>

        {/* Chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.42 }}
          className="flex flex-wrap justify-center gap-2"
        >
          {CHIPS.map((chip, i) => (
            <motion.button
              key={chip}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42 + i * 0.05 }}
              whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => submit(`Busco algo para ${chip.toLowerCase()}`)}
              className="text-xs font-medium px-4 py-2 rounded-full transition-colors duration-150"
              style={{
                backgroundColor: 'var(--hc-surface)',
                border: '1px solid var(--hc-border)',
                color: 'var(--hc-text)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--hc-accent, #ff4b12)'
                e.currentTarget.style.color = 'var(--hc-accent, #ff4b12)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--hc-border)'
                e.currentTarget.style.color = 'var(--hc-text)'
              }}
            >
              {chip}
            </motion.button>
          ))}
        </motion.div>

      </div>
    </section>
  )
}
