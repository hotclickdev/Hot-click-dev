import { useEffect, useRef, useState } from 'react'
import useUiStore from '@/store/uiStore'
import i18n from '@/i18n'

const COLOR_FILTERS: Record<string, string> = {
  none: '',
  grayscale: 'grayscale(100%)',
  deuteranopia: 'url(#filter-deuteranopia)',
  protanopia: 'url(#filter-protanopia)',
  tritanopia: 'url(#filter-tritanopia)',
}

/**
 * Aplica tema, tipografía, contraste, motion e idioma al `<html>`.
 */
export default function HtmlClassManager() {
  const { theme, fontSize, highContrast, reduceMotion, language, colorFilter } = useUiStore()
  const [liveMessage, setLiveMessage] = useState('')
  const primed = useRef(false)

  useEffect(() => {
    const html = document.documentElement
    html.classList.remove('dark', 'light')
    html.classList.add(theme)
    html.classList.toggle('fs-lg', fontSize === 'lg')
    html.classList.toggle('fs-xl', fontSize === 'xl')
    html.classList.toggle('high-contrast', highContrast)
    html.classList.toggle('reduce-motion', reduceMotion)
    html.style.filter = COLOR_FILTERS[colorFilter] || ''
  }, [theme, fontSize, highContrast, reduceMotion, colorFilter])

  useEffect(() => {
    document.documentElement.lang = language
    const announce = () => {
      if (!primed.current) {
        primed.current = true
        return
      }
      const langName = i18n.t(`lang.name.${language}`)
      setLiveMessage(i18n.t('lang.changed', { lang: langName }))
    }
    if (i18n.language === language || i18n.language?.startsWith(`${language}-`)) {
      announce()
      return
    }
    void i18n.changeLanguage(language).then(announce)
  }, [language])

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {liveMessage}
      </div>
      <svg
        id="a11y-color-filters"
        aria-hidden="true"
        focusable="false"
        style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
      >
        <defs>
          <filter id="filter-deuteranopia" colorInterpolationFilters="linearRGB">
            <feColorMatrix type="matrix" values="0.625 0.375 0   0 0
                                               0.7   0.3   0   0 0
                                               0     0.3   0.7 0 0
                                               0     0     0   1 0" />
          </filter>
          <filter id="filter-protanopia" colorInterpolationFilters="linearRGB">
            <feColorMatrix type="matrix" values="0.567 0.433 0     0 0
                                               0.558 0.442 0     0 0
                                               0     0.242 0.758 0 0
                                               0     0     0     1 0" />
          </filter>
          <filter id="filter-tritanopia" colorInterpolationFilters="linearRGB">
            <feColorMatrix type="matrix" values="0.95 0.05  0     0 0
                                               0    0.433 0.567 0 0
                                               0    0.475 0.525 0 0
                                               0     0     0     1 0" />
          </filter>
        </defs>
      </svg>
    </>
  )
}
