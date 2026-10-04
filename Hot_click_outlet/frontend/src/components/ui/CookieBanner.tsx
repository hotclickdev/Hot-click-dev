import { useState, useEffect } from 'react'
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

export type { CookieConsent }
export { getCookieConsent, setCookieConsent } from '@/utils/cookieConsent'
export { useCookieConsent } from '@/utils/cookieConsent'

/**
 * Aviso de cookies al estilo de bancos y empresas grandes en Costa Rica:
 * usted, tres opciones (rechazar / configurar / aceptar) y panel por categoría.
 */
export default function CookieBanner({ onConsent }: { onConsent?: (consent: CookieConsent) => void }) {
  const { pathname } = useLocation()
  const [visible, setVisible] = useState(false)
  const [panel, setPanel] = useState(false)

  useEffect(() => {
    if (esRutaClaudeclick(pathname)) return
    if (getCookieConsent()) return
    setVisible(true)
  }, [pathname])

  useEffect(() => {
    function abrirPanel() {
      setVisible(true)
      setPanel(true)
    }
    window.addEventListener(EVENTO_ABRIR_PREFERENCIAS_COOKIES, abrirPanel)
    return () => window.removeEventListener(EVENTO_ABRIR_PREFERENCIAS_COOKIES, abrirPanel)
  }, [])

  function guardar(consent: CookieConsent) {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    setCookieConsent(consent)
    setVisible(false)
    setPanel(false)
    onConsent?.(consent)
  }

  if (esRutaClaudeclick(pathname)) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="pointer-events-none fixed left-0 right-0 z-[9999] p-3 sm:p-4"
          style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {panel
            ? <PanelPreferencias onGuardar={guardar} onCerrar={() => setPanel(false)} />
            : (
              <CuerpoBanner
                onRechazarOpcionales={() => guardar(consentDesdeCategorias(false, false))}
                onConfigurar={() => setPanel(true)}
                onAceptarTodas={() => guardar(consentDesdeCategorias(true, true))}
              />
            )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function CuerpoBanner({
  onRechazarOpcionales,
  onConfigurar,
  onAceptarTodas,
}: {
  onRechazarOpcionales: () => void
  onConfigurar: () => void
  onAceptarTodas: () => void
}) {
  const { t } = useTranslation()
  return (
    <div
      role="dialog"
      aria-labelledby="hc-cookies-titulo"
      className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl px-5 py-4 pointer-events-auto"
      style={{
        background: 'color-mix(in srgb, var(--hc-surface) 97%, transparent)',
        border: '1px solid var(--hc-border)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 -4px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04)',
      }}
    >
      <div className="flex items-start gap-3">
        <IconoCookie />
        <div className="min-w-0 flex-1">
          <p id="hc-cookies-titulo" className="mb-0.5 text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
            {t('cookies.title')}
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
            {t('cookies.body')}{' '}
            <Link to="/cookies" className="underline underline-offset-2 transition-opacity hover:opacity-80" style={{ color: 'var(--hc-accent)' }}>
              {t('cookies.moreInfo')}
            </Link>
          </p>
        </div>
      </div>
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
        <BotonSecundario onClick={onRechazarOpcionales}>{t('cookies.rejectOptional')}</BotonSecundario>
        <BotonSecundario onClick={onConfigurar}>{t('cookies.configure')}</BotonSecundario>
        <BotonPrimario onClick={onAceptarTodas}>{t('cookies.acceptAll')}</BotonPrimario>
      </div>
    </div>
  )
}

function PanelPreferencias({
  onGuardar,
  onCerrar,
}: {
  onGuardar: (consent: CookieConsent) => void
  onCerrar: () => void
}) {
  const { t } = useTranslation()
  const actual = getCookieConsent()
  const [analytics, setAnalytics] = useState(actual?.analytics ?? false)
  const [advertising, setAdvertising] = useState(actual?.advertising ?? false)

  return (
    <div
      role="dialog"
      aria-labelledby="hc-cookies-panel"
      className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl px-5 py-4 pointer-events-auto"
      style={{
        background: 'color-mix(in srgb, var(--hc-surface) 97%, transparent)',
        border: '1px solid var(--hc-border)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 -4px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <p id="hc-cookies-panel" className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
          {t('cookies.panelTitle')}
        </p>
        <button
          type="button"
          onClick={onCerrar}
          className="rounded-lg px-2 py-1 text-xs font-semibold"
          style={{ color: 'var(--hc-muted)' }}
        >
          {t('cookies.back')}
        </button>
      </div>
      <FilaCategoria titulo={t('cookies.necessary')} detalle={t('cookies.necessaryHelp')} fijo />
      <FilaCategoria
        titulo={t('cookies.analytics')}
        detalle={t('cookies.analyticsHelp')}
        activo={analytics}
        onCambio={setAnalytics}
      />
      <FilaCategoria
        titulo={t('cookies.advertising')}
        detalle={t('cookies.advertisingHelp')}
        activo={advertising}
        onCambio={setAdvertising}
      />
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
        <BotonSecundario onClick={() => onGuardar(consentDesdeCategorias(analytics, advertising))}>
          {t('cookies.save')}
        </BotonSecundario>
        <BotonPrimario onClick={() => onGuardar(consentDesdeCategorias(true, true))}>
          {t('cookies.acceptAll')}
        </BotonPrimario>
      </div>
    </div>
  )
}

function FilaCategoria({
  titulo,
  detalle,
  fijo,
  activo,
  onCambio,
}: {
  titulo: string
  detalle: string
  fijo?: boolean
  activo?: boolean
  onCambio?: (valor: boolean) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl px-3 py-2.5" style={{ border: '1px solid var(--hc-border)' }}>
      <div>
        <p className="text-xs font-semibold" style={{ color: 'var(--hc-text)' }}>{titulo}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: 'var(--hc-muted)' }}>{detalle}</p>
      </div>
      {fijo
        ? <span className="shrink-0 text-[11px] font-semibold" style={{ color: 'var(--hc-muted)' }}>{t('cookies.alwaysOn')}</span>
        : (
          <button
            type="button"
            role="switch"
            aria-checked={activo}
            onClick={() => onCambio?.(!activo)}
            className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
            style={{ background: activo ? 'var(--hc-accent)' : 'var(--hc-border)' }}
          >
            <span
              className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform"
              style={{ transform: activo ? 'translateX(1.25rem)' : 'translateX(0)' }}
            />
          </button>
        )}
    </div>
  )
}

function BotonSecundario({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 rounded-xl px-4 py-2 text-xs font-semibold transition-all hover:bg-white/8 sm:flex-none"
      style={{ color: 'var(--hc-muted)', border: '1px solid var(--hc-border)' }}
    >
      {children}
    </button>
  )
}

function BotonPrimario({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 rounded-xl px-5 py-2 text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-95 sm:flex-none"
      style={{
        background: 'var(--hc-accent)',
        boxShadow: '0 0 16px color-mix(in srgb, var(--hc-accent) 40%, transparent)',
      }}
    >
      {children}
    </button>
  )
}

function IconoCookie() {
  return (
    <div
      className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:flex"
      style={{ background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-accent) 22%, transparent)' }}
    >
      <svg className="text-[#4f7cff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }} aria-hidden>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
        <circle cx="8.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="15" cy="8" r="1" fill="currentColor" stroke="none" />
        <circle cx="15.5" cy="14.5" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="10" cy="15.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    </div>
  )
}
