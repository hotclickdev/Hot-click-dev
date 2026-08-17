import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useUiStore from '@/store/uiStore'

const LANGUAGES = [
  { code: 'es', label: 'ES', flag: '🇨🇷', name: 'Español' },
  { code: 'en', label: 'EN', flag: '🇺🇸', name: 'English' },
  { code: 'pt', label: 'PT', flag: '🇧🇷', name: 'Português' },
]

export default function LanguageSelector({ className = '' }) {
  const { language, setLanguage } = useUiStore()
  const [animating, setAnimating] = useState(false)
  const [direction, setDirection] = useState(1)

  const currentIndex = LANGUAGES.findIndex((l) => l.code === language)
  const current = LANGUAGES[currentIndex] || LANGUAGES[0]

  const handleCycle = useCallback(() => {
    if (animating) return
    setAnimating(true)
    setDirection(1)
    const nextIndex = (currentIndex + 1) % LANGUAGES.length
    setLanguage(LANGUAGES[nextIndex].code)
    setTimeout(() => setAnimating(false), 400)
  }, [animating, currentIndex, setLanguage])

  return (
    <button type="button"
      onClick={handleCycle}
      title={`${current.name} → ${LANGUAGES[(currentIndex + 1) % LANGUAGES.length].name}`}
      aria-label={`Idioma: ${current.name}. Cambiar a ${LANGUAGES[(currentIndex + 1) % LANGUAGES.length].name}`}
      className={`
        relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg
        transition-all duration-200 overflow-hidden select-none
        hover:bg-[var(--hc-surface-2)] border border-transparent hover:border-[var(--hc-border)]
        ${className}
      `}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={current.code}
          initial={{ y: direction * -20, opacity: 0, scale: 0.7 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: direction * 20, opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          className="text-xl leading-none"
          aria-hidden="true"
        >
          {current.flag}
        </motion.span>
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={current.code + '-label'}
          initial={{ opacity: 0, x: 4 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -4 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="text-xs font-semibold tracking-wide"
          style={{ color: 'var(--hc-muted)' }}
        >
          {current.label}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
