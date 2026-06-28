import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { formatPrice } from '@/utils/format'
import AIChat from '@/components/ai/AIChat'
import { isBrowser } from '@/utils/browser'

const CHAT_CHIPS = [
  '¿Qué tenés en oferta?',
  'Algo para la sala',
  'Productos para regalar',
  'Accesorios de cocina',
]

// â"€â"€ Constantes â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

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

// Sugerencia de respuesta para cada pregunta (mismo índice)
const SUGERENCIAS = [
  'Una silla de madera para sala',
  'Una batidora de mano',
  'Un organizador de ropa',
  'Una silla ergonómica',
  'Macetas decorativas',
  'Una caja de regalo especial',
  'Cajas organizadoras',
  'Una lámpara de escritorio',
  'Cojines y almohadones',
  'Un juego de vajilla',
  'Toallas y accesorios de baño',
  'Un parlante bluetooth',
  'Cuadros y arte para pared',
  'Un set de ollas',
  'Estantes y muebles infantiles',
  'Ver productos en oferta',
  'Un soporte para monitor',
  'Adornos de temporada',
  'Una mesa de centro',
  'Remodelar el dormitorio',
]

const CATEGORIAS = [
  {
    label: 'Sala',
    query: 'sala',
    grad: 'linear-gradient(145deg, #f5ede0, #e2c9a8)',
    iconColor: '#c07a45',
    icon: (
      <svg viewBox="0 0 40 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-7">
        <rect x="1" y="10" width="38" height="14" rx="4" fill="currentColor" opacity=".18"/>
        <rect x="5" y="14" width="30" height="10" rx="3" fill="currentColor" opacity=".55"/>
        <rect x="1" y="12" width="7" height="12" rx="3" fill="currentColor" opacity=".75"/>
        <rect x="32" y="12" width="7" height="12" rx="3" fill="currentColor" opacity=".75"/>
        <rect x="10" y="22" width="5" height="5" rx="1" fill="currentColor" opacity=".5"/>
        <rect x="25" y="22" width="5" height="5" rx="1" fill="currentColor" opacity=".5"/>
        <rect x="8" y="2" width="24" height="10" rx="3" fill="currentColor" opacity=".3"/>
      </svg>
    ),
  },
  {
    label: 'Cocina',
    query: 'cocina',
    grad: 'linear-gradient(145deg, #e6f5ec, #b8e0c8)',
    iconColor: '#3a9669',
    icon: (
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
        <circle cx="18" cy="16" r="11" fill="currentColor" opacity=".18"/>
        <ellipse cx="18" cy="15" rx="9" ry="9" fill="none" stroke="currentColor" strokeWidth="2.2" opacity=".7"/>
        <line x1="18" y1="4" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity=".9"/>
        <rect x="14" y="26" width="8" height="5" rx="2" fill="currentColor" opacity=".5"/>
        <line x1="10" y1="4" x2="10" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".5"/>
        <line x1="26" y1="4" x2="26" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity=".5"/>
      </svg>
    ),
  },
  {
    label: 'Dormitorio',
    query: 'dormitorio',
    grad: 'linear-gradient(145deg, #ede8f5, #cfc2e8)',
    iconColor: '#7b5ea7',
    icon: (
      <svg viewBox="0 0 40 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-7">
        <rect x="2" y="14" width="36" height="12" rx="3" fill="currentColor" opacity=".18"/>
        <rect x="4" y="16" width="32" height="10" rx="2.5" fill="currentColor" opacity=".5"/>
        <rect x="4" y="9" width="14" height="9" rx="3" fill="currentColor" opacity=".6"/>
        <rect x="22" y="9" width="14" height="9" rx="3" fill="currentColor" opacity=".6"/>
        <rect x="2" y="22" width="3" height="6" rx="1.5" fill="currentColor" opacity=".7"/>
        <rect x="35" y="22" width="3" height="6" rx="1.5" fill="currentColor" opacity=".7"/>
        <rect x="2" y="12" width="4" height="12" rx="2" fill="currentColor" opacity=".4"/>
      </svg>
    ),
  },
  {
    label: 'Oficina',
    query: 'oficina',
    grad: 'linear-gradient(145deg, #e3edf9, #b8d0f0)',
    iconColor: '#3a72c4',
    icon: (
      <svg viewBox="0 0 38 34" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-9">
        <rect x="4" y="4" width="30" height="20" rx="3" fill="currentColor" opacity=".18"/>
        <rect x="6" y="6" width="26" height="16" rx="2" fill="currentColor" opacity=".55"/>
        <rect x="8" y="9" width="22" height="10" rx="1.5" fill="currentColor" opacity=".2" stroke="currentColor" strokeWidth="0"/>
        <rect x="16" y="24" width="6" height="4" rx="1" fill="currentColor" opacity=".5"/>
        <rect x="10" y="28" width="18" height="2.5" rx="1.25" fill="currentColor" opacity=".4"/>
        <circle cx="19" cy="14" r="3" fill="currentColor" opacity=".35"/>
      </svg>
    ),
  },
  {
    label: 'Jardín',
    query: 'jardin',
    grad: 'linear-gradient(145deg, #ecf7e5, #c5e8a8)',
    iconColor: '#4a8c2a',
    icon: (
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
        <ellipse cx="18" cy="14" rx="11" ry="11" fill="currentColor" opacity=".18"/>
        <path d="M18 24 C18 24 8 18 10 9 C12 4 18 2 18 2 C18 2 24 4 26 9 C28 18 18 24 18 24Z" fill="currentColor" opacity=".6"/>
        <path d="M18 24 C18 24 10 20 14 12 C16 8 18 6 18 6 C18 6 20 8 22 12 C26 20 18 24 18 24Z" fill="currentColor" opacity=".35"/>
        <line x1="18" y1="24" x2="18" y2="34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity=".7"/>
      </svg>
    ),
  },
  {
    label: 'Regalo',
    query: 'regalo',
    grad: 'linear-gradient(145deg, #fce8ee, #f5baca)',
    iconColor: '#c4476a',
    icon: (
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
        <rect x="4" y="14" width="28" height="18" rx="2.5" fill="currentColor" opacity=".18"/>
        <rect x="5" y="15" width="26" height="17" rx="2" fill="currentColor" opacity=".45"/>
        <rect x="3" y="9" width="30" height="7" rx="2.5" fill="currentColor" opacity=".6"/>
        <line x1="18" y1="9" x2="18" y2="32" stroke="currentColor" strokeWidth="2.5" opacity=".5"/>
        <path d="M18 9 C18 9 14 6 12 8 C10 10 14 12 18 9Z" fill="currentColor" opacity=".7"/>
        <path d="M18 9 C18 9 22 6 24 8 C26 10 22 12 18 9Z" fill="currentColor" opacity=".7"/>
      </svg>
    ),
  },
]

const PHASES = [
  {
    id: 'chat',
    duration: 15000,
    label: 'Asistente',
    accent: 'var(--hc-accent)',
    glow: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)',
  },
  {
    id: 'products',
    duration: 9000,
    label: 'Destacados',
    accent: 'var(--hc-accent)',
    glow: 'rgba(23,71,168,0.10)',
  },
  {
    id: 'businesses',
    duration: 9000,
    label: 'Emprendimientos',
    accent: '#10b981',
    glow: 'rgba(16,185,129,0.10)',
  },
]

// Escala tamaÃ±o con viewport: 100% en 1440px â†’ ~35% en 375px
function vs(size) {
  const min = Math.round(size * 0.32)
  return `clamp(${min}px, ${(size / 1440 * 100).toFixed(2)}vw, ${size}px)`
}

// â"€â"€ Decoraciones Chat â€" blobs orgÃ¡nicos con productos â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function ChatDecos({ productos }) {
  const p0 = productos?.[0]?.imagenUrl
  const p1 = productos?.[1]?.imagenUrl
  const p2 = productos?.[2]?.imagenUrl

  const A = 'var(--hc-accent, #7b5ea7)'
  const blobs = [
    { side: 'left',  top: '8%',  left: '0',    size: 105, radius: '60% 40% 55% 45% / 50% 65% 35% 50%', color: `color-mix(in srgb, ${A} 18%, var(--hc-bg))`, img: null, delay: 0.1 },
    { side: 'left',  top: '35%', left: '0',    size: 145, radius: '40% 60% 45% 55% / 55% 45% 65% 35%', color: `color-mix(in srgb, ${A} 28%, var(--hc-bg))`, img: p0,   delay: 0.22 },
    { side: 'right', top: '15%', right: '0',   size: 148, radius: '55% 45% 35% 65% / 45% 55% 45% 55%', color: `color-mix(in srgb, ${A} 22%, var(--hc-surface))`, img: p1, delay: 0.18 },
    { side: 'right', top: '58%', right: '0',   size: 88,  radius: '45% 55% 60% 40% / 60% 40% 60% 40%', color: `color-mix(in srgb, ${A} 14%, var(--hc-bg))`, img: null, delay: 0.32 },
    { side: 'left',  top: '68%', left: '0',    size: 72,  radius: '50% 50% 40% 60% / 40% 60% 50% 50%', color: `color-mix(in srgb, ${A} 10%, var(--hc-surface))`, img: null, delay: 0.4 },
    { side: 'right', top: '72%', right: '0',   size: 110, radius: '35% 65% 50% 50% / 55% 45% 55% 45%', color: `color-mix(in srgb, ${A} 32%, var(--hc-bg))`, img: p2, delay: 0.28 },
  ]

  return (
    <>
      {blobs.map((b, i) => {
        const pos = b.side === 'left' ? { top: b.top, left: b.left } : { top: b.top, right: b.right }
        const sz = vs(b.size)
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.5, x: b.side === 'left' ? -24 : 24 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ delay: b.delay, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="absolute overflow-hidden select-none pointer-events-none"
            style={{ width: sz, height: sz, borderRadius: b.radius, background: b.color, ...pos }}
          >
            {b.img && (
              <>
                <img src={b.img} alt="" className="w-full h-full object-cover"
                  style={{ filter: 'saturate(0.85) brightness(1.05)' }}
                  onError={(e) => { e.target.style.display = 'none' }} />
                <div className="absolute inset-0 mix-blend-multiply opacity-25"
                  style={{ background: b.color }} />
              </>
            )}
          </motion.div>
        )
      })}
    </>
  )
}

// â"€â"€ Decoraciones Productos â€" tarjetas inclinadas (polaroid) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function ProductDecos({ productos }) {
  const cards = [
    { top: '8%',  left: '1%',  rotate: -12, delay: 0.1,  idx: 3 },
    { top: '48%', left: '3%',  rotate:   9, delay: 0.2,  idx: 4 },
    { top: '8%',  right: '1%', rotate:  13, delay: 0.15, idx: 5 },
    { top: '48%', right: '3%', rotate: -10, delay: 0.25, idx: 6 },
  ]

  return (
    <>
      {cards.map((c, i) => {
        const img = productos?.[c.idx]?.imagenUrl ?? productos?.[i % (productos?.length || 1)]?.imagenUrl
        const pos = c.left !== undefined ? { top: c.top, left: c.left } : { top: c.top, right: c.right }
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.6, rotate: 0 }}
            animate={{ opacity: 1, scale: 1, rotate: c.rotate }}
            transition={{ delay: c.delay, duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            className="absolute select-none pointer-events-none overflow-hidden"
            style={{
              width: vs(96), height: vs(112),
              borderRadius: '10px',
              background: 'var(--hc-surface)',
              border: '3px solid var(--hc-surface)',
              boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
              ...pos,
            }}
          >
            {img ? (
              <img src={img} alt="" className="w-full h-4/5 object-cover"
                onError={(e) => { e.target.style.display = 'none' }} />
            ) : (
              <div className="w-full h-4/5 flex items-center justify-center opacity-20"
                style={{ background: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)', fontSize: '2rem' }}>ðŸ"¦</div>
            )}
            <div className="absolute bottom-0 inset-x-0 h-1/5 flex items-center justify-center"
              style={{ background: 'var(--hc-surface)' }}>
              <div className="w-6 h-1 rounded-full opacity-30" style={{ background: 'var(--hc-accent)' }} />
            </div>
          </motion.div>
        )
      })}
    </>
  )
}

// â"€â"€ Decoraciones Emprendimientos â€" cÃ­rculos grandes â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function BusinessDecos({ convenios, accent }) {
  const circles = [
    { top: '6%',  left: '1%',  size: 95,  color: `color-mix(in srgb, ${accent} 12%, var(--hc-bg))`, delay: 0.1 },
    { top: '42%', left: '2%',  size: 150, color: `color-mix(in srgb, ${accent} 18%, var(--hc-surface))`, delay: 0.2, logo: convenios?.[0]?.logoUrl, nombre: convenios?.[0]?.nombre },
    { top: '8%',  right: '2%', size: 150, color: `color-mix(in srgb, ${accent} 20%, var(--hc-surface))`, delay: 0.15, logo: convenios?.[1]?.logoUrl, nombre: convenios?.[1]?.nombre },
    { top: '55%', right: '1%', size: 80,  color: `color-mix(in srgb, ${accent} 10%, var(--hc-bg))`, delay: 0.3 },
  ]

  return (
    <>
      {circles.map((c, i) => {
        const pos = c.left !== undefined ? { top: c.top, left: c.left } : { top: c.top, right: c.right }
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: c.delay, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="absolute flex select-none pointer-events-none items-center justify-center overflow-hidden"
            style={{ width: vs(c.size), height: vs(c.size), borderRadius: '50%', background: c.color, ...pos }}
          >
            {c.logo ? (
              <img src={c.logo} alt={c.nombre}
                className="w-3/5 h-3/5 object-contain"
                onError={(e) => { e.target.style.display = 'none' }} />
            ) : c.nombre ? (
              <span className="text-2xl font-black" style={{ color: accent, opacity: 0.5 }}>
                {c.nombre[0].toUpperCase()}
              </span>
            ) : null}
          </motion.div>
        )
      })}
    </>
  )
}

// â"€â"€ Fase Chat â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function ChatPhase({ accent, onPause, onResume, destacados, onSubmit }) {
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
      {/* Contenido central */}
      <div className="relative z-10 flex flex-col items-center max-w-xl mx-auto px-4 w-full">
        <h1 className="font-black tracking-tight mb-2"
          style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', lineHeight: 1.08, color: 'var(--hc-text)' }}>
          ¿Qué estás buscando hoy?
        </h1>

        {/* Pregunta rotatoria + sugerencia */}
        <div className="w-full flex flex-col items-center mb-7" style={{ minHeight: '6.5rem' }}>
          {/* Pregunta */}
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

          {/* Sugerencia de respuesta â€" solo texto */}
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

        {/* Input bar */}
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

// â"€â"€ Fase Productos â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function ProductsPhase({ productos, accent }) {
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
      {/* Header */}
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

      {/* Cards — scroll horizontal en móvil, grid 3 col en desktop */}
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

// â"€â"€ Fase Emprendimientos â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function BusinessesPhase({ convenios, accent }) {
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
      {/* Header */}
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
              {/* Banner / logo area */}
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

// â"€â"€ Indicador de fases (bolitas) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

const CIRCUMFERENCE = 2 * Math.PI * 10  // radio = 10

function PhaseBar({ phases, currentIdx, progress, onSelect }) {
  return (
    <div className="flex items-center justify-center gap-5 pb-2">
      {phases.map((p, i) => {
        const active = i === currentIdx
        const done = i < currentIdx
        const fill = active ? progress : done ? 100 : 0
        const dashOffset = CIRCUMFERENCE * (1 - fill / 100)
        return (
          <button
            key={p.id}
            onClick={() => onSelect(i)}
            title={p.label}
            className="relative flex items-center justify-center w-7 h-7 rounded-full hover:scale-110 active:scale-95 transition-transform"
            aria-label={p.label}
          >
            {/* SVG progreso circular */}
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
            {/* Punto central */}
            <motion.div
              className="relative rounded-full"
              animate={{ width: active ? 10 : 6, height: active ? 10 : 6, opacity: active || done ? 1 : 0.35 }}
              transition={{ duration: 0.3 }}
              style={{ backgroundColor: active ? p.accent : done ? p.accent : 'var(--hc-muted)' }}
            />
          </button>
        )
      })}
    </div>
  )
}

// â"€â"€ Componente principal â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

// ── Chat inline dentro del hero ───────────────────────────────────────────────

function InlineChat({ initialQuery, accent, onClose }) {
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

export default function HeroRotator({ destacados }) {
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [convenios, setConvenios] = useState([])
  const [chatMode, setChatMode] = useState(false)
  const [chatQuery, setChatQuery] = useState(null)
  const progressRef = useRef(null)
  const pausedRef   = useRef(false)

  const phase = PHASES[phaseIdx]

  function pauseTimer()  { pausedRef.current = true }
  function resumeTimer() { pausedRef.current = false }

  function handleChatSubmit(text) {
    clearInterval(progressRef.current)
    setChatQuery(text)
    setChatMode(true)
  }

  function handleChatClose() {
    setChatMode(false)
    setChatQuery(null)
    setPhaseIdx(0)
  }

  // Fetch emprendimientos una sola vez
  useEffect(() => {
    import('@/services/api').then(({ default: api }) => {
      api.get('/convenios/publicos')
        .then((r) => setConvenios(r.data?.data ?? []))
        .catch(() => {})
    })
  }, [])

  // Timer por fase â€" basado en progreso para respetar la pausa
  useEffect(() => {
    setProgress(0)
    pausedRef.current = false
    clearInterval(progressRef.current)

    const step = 80
    const increment = (step / phase.duration) * 100

    progressRef.current = setInterval(() => {
      if (pausedRef.current) return          // pausado mientras escribe
      setProgress((p) => {
        const next = p + increment
        if (next >= 100) {
          clearInterval(progressRef.current)
          setTimeout(() => setPhaseIdx((i) => (i + 1) % PHASES.length), 0)
          return 100
        }
        return next
      })
    }, step)

    return () => clearInterval(progressRef.current)
  }, [phaseIdx, phase.duration])

  function goTo(i) {
    clearInterval(progressRef.current)
    setPhaseIdx(i)
  }

  return (
    <section
      className="relative w-full overflow-hidden flex flex-col"
      style={{ minHeight: '82vh', maxHeight: '100vh' }}
    >
      {/* Fondo atmosfÃ©rico â€" actualiza color segÃºn fase */}
      <AnimatePresence>
        <motion.div
          key={`bg-${phaseIdx}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 75% 65% at 70% 45%, ${phase.glow}, transparent 65%),
              radial-gradient(ellipse 45% 55% at 25% 30%, color-mix(in srgb, ${phase.glow} 50%, transparent), transparent 60%),
              var(--hc-bg)
            `,
          }}
        />
      </AnimatePresence>

      {/* Grid de puntos */}
      <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--hc-text) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />

      {/* Grid de líneas (igual que HeroCarousel anterior) */}
      <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.3]"
        style={{
          backgroundImage: `linear-gradient(var(--hc-border) 1px, transparent 1px), linear-gradient(90deg, var(--hc-border) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />

      {/* Marca de agua */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none">
        <AnimatePresence mode="wait">
          <motion.span
            key={`wm-${phaseIdx}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.55 }}
            className="font-black uppercase tracking-[-0.02em] whitespace-nowrap leading-none"
            style={{ fontSize: '18vw', color: 'color-mix(in srgb, var(--hc-text) 3%, transparent)' }}
          >
            {phase.label.toUpperCase()}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Elementos decorativos laterales — ocultos en modo chat */}
      {!chatMode && (
        <AnimatePresence mode="wait">
          {phase.id === 'chat' && <ChatDecos key="deco-chat" productos={destacados} />}
          {phase.id === 'products' && <ProductDecos key="deco-prod" productos={destacados} />}
          {phase.id === 'businesses' && <BusinessDecos key="deco-biz" convenios={convenios} accent={phase.accent} />}
        </AnimatePresence>
      )}

      {/* Contenido principal centrado */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-10 overflow-hidden">
        <div className="w-full">
          <AnimatePresence mode="wait">
            {chatMode ? (
              <InlineChat
                key="inline-chat"
                initialQuery={chatQuery}
                accent={phase.accent}
                onClose={handleChatClose}
              />
            ) : (
              <>
                {phase.id === 'chat' && (
                  <ChatPhase key="chat" accent={phase.accent}
                    onPause={pauseTimer} onResume={resumeTimer}
                    destacados={destacados}
                    onSubmit={handleChatSubmit} />
                )}
                {phase.id === 'products' && (
                  <ProductsPhase key="products" productos={destacados} accent={phase.accent} />
                )}
                {phase.id === 'businesses' && (
                  <BusinessesPhase key="businesses" convenios={convenios} accent={phase.accent} />
                )}
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bolitas indicadoras — ocultas en modo chat */}
      {!chatMode && (
        <div className="relative w-full flex justify-center pb-6">
          <PhaseBar
            phases={PHASES}
            currentIdx={phaseIdx}
            progress={progress}
            onSelect={goTo}
          />
        </div>
      )}
    </section>
  )
}
