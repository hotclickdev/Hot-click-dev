import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { esRutaClaudeclick } from '@/utils/rutaPrototipo'
import { ICONOS_ESTADOS } from '@/components/comprador/estados/iconosEstados'
import HojaPreferenciasCookies from '@/components/ui/cookies/HojaPreferenciasCookies'
import { EVENTO_ABRIR_PREFERENCIAS_COOKIES } from '@/components/ui/cookies/preferenciasCookiesApi'

const STORAGE_KEY = 'hotclick-cookie-consent'

export type CookieConsent = {
  analytics: boolean
  functional: boolean
  timestamp: number
}

export function getCookieConsent(): CookieConsent | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  return parseConsent(raw)
}

export function useCookieConsent() {
  return getCookieConsent()
}

export function setCookieConsent(value: CookieConsent) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

/**
 * Aviso de cookies (Figma `45:2152`) y hoja de preferencias (`45:2166`). No se muestra en el
 * prototipo CLAUDECLICK. La hoja también se abre desde el pie de página con `abrirPreferenciasCookies()`.
 */
export default function CookieBanner({ onConsent }: { onConsent?: (consent: CookieConsent) => void }) {
  const { pathname } = useLocation()
  const [visible, setVisible] = useState(false)
  const [hojaAbierta, setHojaAbierta] = useState(false)

  useEffect(() => {
    if (esRutaClaudeclick(pathname)) return
    if (localStorage.getItem(STORAGE_KEY)) return
    const t = setTimeout(() => setVisible(true), 12000)
    return () => clearTimeout(t)
  }, [pathname])

  useEffect(() => {
    const abrir = () => setHojaAbierta(true)
    globalThis.addEventListener(EVENTO_ABRIR_PREFERENCIAS_COOKIES, abrir)
    return () => globalThis.removeEventListener(EVENTO_ABRIR_PREFERENCIAS_COOKIES, abrir)
  }, [])

  function accept(analytics: boolean) {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    const consent: CookieConsent = { analytics, functional: true, timestamp: Date.now() }
    setCookieConsent(consent)
    setVisible(false)
    setHojaAbierta(false)
    onConsent?.(consent)
  }

  if (esRutaClaudeclick(pathname)) return null

  return (
    <>
      {/* z-65: sobre la barra (50), la tarjeta de instalar (55) y el aviso de actualización (60), pero bajo las hojas (70), que no deben quedar tapadas (el cupón sale a los 2 s y este aviso a los 12 s). */}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-x-3 z-[65] mx-auto max-w-[366px] bottom-[calc(79px+env(safe-area-inset-bottom,0px))] lg:inset-x-auto lg:bottom-6 lg:left-6 lg:mx-0"
          >
            <CuerpoBanner
              onSoloEsenciales={() => accept(false)}
              onAceptarTodo={() => accept(true)}
              onConfigurar={() => setHojaAbierta(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <HojaPreferenciasCookies
        key={String(hojaAbierta)}
        abierta={hojaAbierta}
        analiticaInicial={getCookieConsent()?.analytics ?? true}
        onCerrar={() => setHojaAbierta(false)}
        onGuardar={accept}
        onAceptarTodo={() => accept(true)}
      />
    </>
  )
}

function parseConsent(raw: string): CookieConsent | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const obj = parsed as { analytics?: unknown; functional?: unknown; timestamp?: unknown }
    if (typeof obj.analytics !== 'boolean') return null
    return {
      analytics: obj.analytics,
      functional: obj.functional === true,
      timestamp: typeof obj.timestamp === 'number' ? obj.timestamp : Date.now(),
    }
  } catch {
    return null
  }
}

const BOTON = 'flex min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-[12px] py-[14px] text-[15px] font-semibold leading-[18px]'

function CuerpoBanner({
  onSoloEsenciales,
  onAceptarTodo,
  onConfigurar,
}: {
  onSoloEsenciales: () => void
  onAceptarTodo: () => void
  onConfigurar: () => void
}) {
  const { t } = useTranslation()
  return (
    <section
      aria-label={t('cookies.title')}
      className="flex flex-col gap-3 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-4 shadow-[0px_8px_24px_0px_rgba(0,0,0,0.16)]"
    >
      <div className="flex items-center gap-[10px]">
        <img src={ICONOS_ESTADOS.cookie} alt="" width={20} height={20} className="block size-5 shrink-0" />
        <p className="flex-1 font-display text-[14px] font-bold leading-[normal] tracking-normal text-hc-n-900">{t('cookies.title')}</p>
      </div>
      <p className="text-[13px] leading-[18px] text-hc-n-600">{t('cookies.body')}</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onSoloEsenciales} className={`${BOTON} border border-hc-n-200 bg-hc-n-0 text-hc-n-900 hover:bg-hc-n-50`}>
          {t('cookies.essentialOnly')}
        </button>
        <button type="button" onClick={onAceptarTodo} className={`${BOTON} bg-hc-red-500 text-hc-n-0 hover:bg-hc-red-600`}>
          {t('cookies.acceptAll')}
        </button>
      </div>
      <div className="flex items-center justify-between whitespace-nowrap leading-[normal]">
        <button type="button" onClick={onConfigurar} className="text-[13px] font-semibold text-hc-blue-600">
          {t('cookies.configurar')}
        </button>
        <Link to="/cookies" className="text-[12px] text-hc-n-500">{t('cookies.leyInfo')}</Link>
      </div>
    </section>
  )
}
