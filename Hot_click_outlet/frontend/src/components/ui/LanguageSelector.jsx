import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import useUiStore from '@/store/uiStore'

const LANGUAGES = [
  { code: 'es', label: 'ES', flag: '🇨🇷', name: 'Español' },
  { code: 'en', label: 'EN', flag: '🇺🇸', name: 'English' },
  { code: 'pt', label: 'PT', flag: '🇧🇷', name: 'Português' },
]

export default function LanguageSelector({ className = '' }) {
  const { t } = useTranslation()
  const { language, setLanguage } = useUiStore()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const current = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0]

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (code) => {
    setLanguage(code)
    setOpen(false)
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        title={t('lang.select')}
        aria-label={t('lang.select')}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm
          text-[var(--hc-muted)] hover:text-[var(--hc-text)]
          hover:bg-[var(--hc-surface-2)] border border-transparent hover:border-[var(--hc-border)]
          transition-all duration-200 font-medium"
      >
        <span>{current.flag}</span>
        <span className="text-xs font-semibold tracking-wide">{current.label}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 z-50 min-w-[130px] rounded-xl overflow-hidden
            shadow-[0_8px_32px_var(--hc-shadow)]
            border border-[var(--hc-border)]"
          style={{ backgroundColor: 'var(--hc-surface)' }}
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              aria-label={lang.name}
              aria-pressed={lang.code === language}
              className={`
                w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left
                transition-colors duration-150
                ${lang.code === language
                  ? 'text-[var(--hc-accent)] font-semibold'
                  : 'text-[var(--hc-muted)] hover:text-[var(--hc-text)]'
                }
                hover:bg-[var(--hc-surface-2)]
              `}
            >
              <span className="text-base" aria-hidden="true">{lang.flag}</span>
              <span>{lang.name}</span>
              {lang.code === language && <CheckIcon />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ChevronIcon({ open }) {
  return (
    <svg
      className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}
      strokeLinecap="round" strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}
