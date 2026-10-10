import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { esRutaClaudeclick } from '@/utils/rutaPrototipo'
import {
  EVENTO_ABRIR_PREFERENCIAS_COOKIES,
  consentDesdeCategorias,
  getCookieConsent,
  setCookieConsent,
  type CookieConsent,
} from '@/utils/cookieConsent'
import { EVENTO_ABRIR_PREFERENCIAS_COOKIES as EVENTO_PREFERENCIAS_PIE } from '@/components/ui/cookies/preferenciasCookiesApi'
import HojaPreferenciasCookies from '@/components/ui/cookies/HojaPreferenciasCookies'
import { BOTTOM_BANNER_COOKIES } from '@/components/ui/cookies/posicionBannerCookies'


const BOTON = 'flex min-h-11 flex-1 items-center justify-center rounded-[12px] px-4 text-[14px] font-semibold leading-[18px] sm:flex-none'

/**
 * Banner de cookies compacto (boceto 14 de demo-0410): 2 líneas y 2 botones («Configurar» secundario y
 * «Aceptar todo» en n900, no rojo). «Solo esenciales» vive en la hoja de preferencias.
 * Es una región que no roba el foco; la hoja sí atrapa el foco y se cierra con Esc.
 */
export default function CookieBanner({ onConsent }: Readonly<{ onConsent?: (consent: CookieConsent) => void }>) {
  const { pathname } = useLocation()
  const [decidido, setDecidido] = useState(false)
  const [hoja, setHoja] = useState(false)
  const visible = !decidido && !getCookieConsent()

  useEffect(() => {
    const abrirHoja = () => setHoja(true)
    window.addEventListener(EVENTO_ABRIR_PREFERENCIAS_COOKIES, abrirHoja)
    window.addEventListener(EVENTO_PREFERENCIAS_PIE, abrirHoja)
    return () => {
      window.removeEventListener(EVENTO_ABRIR_PREFERENCIAS_COOKIES, abrirHoja)
      window.removeEventListener(EVENTO_PREFERENCIAS_PIE, abrirHoja)
    }
  }, [])

  const guardar = useCallback((consent: CookieConsent) => {
    setCookieConsent(consent)
    setDecidido(true)
    setHoja(false)
    onConsent?.(consent)
  }, [onConsent])

  const cerrarHoja = useCallback(() => setHoja(false), [])

  if (esRutaClaudeclick(pathname)) return null

  return (
    <>
      <AnimatePresence>
        {visible && !hoja && (
          <motion.div
            key="banner-cookies"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <BarraCookies
              onConfigurar={() => setHoja(true)}
              onAceptarTodo={() => guardar(consentDesdeCategorias(true, true))}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <HojaPreferenciasCookies
        key={String(hoja)}
        abierta={hoja}
        analiticaInicial={getCookieConsent()?.analytics ?? false}
        onCerrar={cerrarHoja}
        onGuardar={(analitica) => guardar(consentDesdeCategorias(analitica, false))}
        onSoloEsenciales={() => guardar(consentDesdeCategorias(false, false))}
      />
    </>
  )
}

/** Barra compacta: `cookies.title` + `cookies.moreInfo` y 2 botones de 44 px. Ninguno es rojo. */
export function BarraCookies({ onConfigurar, onAceptarTodo }: Readonly<{ onConfigurar: () => void; onAceptarTodo: () => void }>) {
  const { t } = useTranslation()
  return (
    <section
      aria-label={t('cookies.title')}
      className="fixed inset-x-3 z-[65] mx-auto flex max-w-[480px] flex-col gap-3 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-3 shadow-[0_8px_24px_rgba(0,0,0,0.12)] sm:inset-x-auto sm:left-6 sm:mx-0 sm:max-w-none sm:flex-row sm:items-center sm:gap-4 sm:py-2 sm:!bottom-6"
      style={{ bottom: BOTTOM_BANNER_COOKIES }}
    >
      <p className="text-[13px] leading-[18px] text-hc-n-900 sm:whitespace-nowrap">
        <span className="font-semibold">{t('cookies.title')}.</span>{' '}
        <Link to="/cookies" className="underline underline-offset-2">{t('cookies.moreInfo')}</Link>
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={onConfigurar} className={`${BOTON} border border-hc-n-200 bg-hc-n-0 text-hc-n-900 hover:bg-hc-n-50`}>
          {t('cookies.configure')}
        </button>
        <button type="button" onClick={onAceptarTodo} className={`${BOTON} bg-hc-n-900 text-hc-n-0 hover:opacity-90`}>
          {t('cookies.acceptAll')}
        </button>
      </div>
    </section>
  )
}
