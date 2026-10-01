import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import useUiStore from '@/store/uiStore'
import i18n from '@/i18n'
import { aplicarClasesTemaHtml, colorChromeParaTema } from '@/utils/temaPorRuta'

function aplicarMetaThemeColor(tema: 'dark' | 'light') {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) return
  meta.setAttribute('content', colorChromeParaTema(tema))
}

/**
 * Aplica tema, tipografía, contraste, motion e idioma al `<html>`.
 * Marketplace / auth / tienda pública / pago QR fuerzan claro; el panel sigue la preferencia.
 */
export default function HtmlClassManager() {
  const { pathname } = useLocation()
  const { theme, fontSize, highContrast, reduceMotion, language } = useUiStore()
  const [liveMessage, setLiveMessage] = useState('')
  const primed = useRef(false)
  useEffect(() => {
    const html = document.documentElement
    const temaHtml = aplicarClasesTemaHtml(html.classList, pathname, theme, highContrast)
    aplicarMetaThemeColor(temaHtml)
    html.classList.toggle('fs-lg', fontSize === 'lg')
    html.classList.toggle('fs-xl', fontSize === 'xl')
    html.classList.toggle('reduce-motion', reduceMotion)
    // El filtro de color se retiró de la interfaz: se limpia cualquiera que haya quedado de una sesión anterior.
    html.style.filter = ''
  }, [pathname, theme, fontSize, highContrast, reduceMotion])

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
    </>
  )
}
