import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useUiStore from '@/store/uiStore'

const LANGUAGES = [
  { code: 'es', label: 'ES', name: 'Español' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'pt', label: 'PT', name: 'Português' },
]

export default function LanguageSelector({ className = '' }) {
  const { language, setLanguage } = useUiStore()
  const [animating, setAnimating] = useState(false)

  const currentIndex = LANGUAGES.findIndex((l) => l.code === language)
  const current = LANGUAGES[currentIndex] || LANGUAGES[0]
  const siguiente = LANGUAGES[(currentIndex + 1) % LANGUAGES.length]

  const handleCycle = useCallback(() => {
    if (animating) return
    setAnimating(true)
    setLanguage(siguiente.code)
    setTimeout(() => setAnimating(false), 400)
  }, [animating, siguiente.code, setLanguage])

  return (
    <button type="button"
      onClick={handleCycle}
      title={`Cambiar a ${siguiente.name}`}
      aria-label={`Idioma: ${current.name}. Cambiar a ${siguiente.name}`}
      className={`
        relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg
        transition-all duration-200 overflow-hidden select-none
        hover:bg-[var(--hc-surface-2)] border border-transparent hover:border-[var(--hc-border)]
        ${className}
      `}
    >
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
