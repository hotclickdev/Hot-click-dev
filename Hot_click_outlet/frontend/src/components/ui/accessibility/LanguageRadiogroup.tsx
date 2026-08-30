import { useCallback, useRef, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from './a11yConstants'

type LanguageRadiogroupProps = {
  language: string
  setLanguage: (language: string) => void
  className?: string
}

/**
 * Selector de idioma accesible (radiogroup) compartido entre panel a11y y Apariencia admin.
 */
export default function LanguageRadiogroup({
  language,
  setLanguage,
  className = '',
}: LanguageRadiogroupProps) {
  const { t } = useTranslation()
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const focusAt = useCallback((index: number) => {
    const el = refs.current[index]
    el?.focus()
  }, [])

  const selectAt = useCallback((index: number) => {
    const lang = LANGUAGES[index]
    if (!lang) return
    setLanguage(lang.code)
    focusAt(index)
  }, [setLanguage, focusAt])

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = LANGUAGES.length - 1
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      selectAt(index === last ? 0 : index + 1)
      return
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      selectAt(index === 0 ? last : index - 1)
      return
    }
    if (e.key === 'Home') {
      e.preventDefault()
      selectAt(0)
      return
    }
    if (e.key === 'End') {
      e.preventDefault()
      selectAt(last)
    }
  }, [selectAt])

  return (
    <div
      role="radiogroup"
      aria-label={t('lang.select')}
      className={`flex gap-1.5 ${className}`}
    >
      {LANGUAGES.map((lang, index) => {
        const selected = lang.code === language
        return (
          <button
            type="button"
            key={lang.code}
            role="radio"
            aria-checked={selected}
            aria-label={lang.label}
            tabIndex={selected ? 0 : -1}
            ref={(el) => { refs.current[index] = el }}
            onClick={() => setLanguage(lang.code)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150"
            style={{
              backgroundColor: selected ? 'var(--hc-accent)' : 'var(--hc-surface-2)',
              color: selected ? '#fff' : 'var(--hc-muted)',
              border: `1px solid ${selected ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
            }}
          >
            <img
              src={lang.flagSrc}
              alt=""
              aria-hidden="true"
              className="w-7 h-5 rounded object-cover shadow-sm"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            <span>{lang.label}</span>
          </button>
        )
      })}
    </div>
  )
}
