import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { esRutaPrototipo } from '@/utils/rutaPrototipo'
import useUiStore from '@/store/uiStore'
import { HotClickMark } from '@/components/ui/BrandLogo'
import useChatStore from '@/store/chatStore'
import A11yPanelContent from './accessibility/A11yPanelContent'
import { CloseIcon, A11yIcon } from './accessibility/a11yUi'

export default function AccessibilityPanel() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  const chatOpen = useChatStore((s) => s.isOpen)
  const theme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)
  const language = useUiStore((s) => s.language)
  const setLanguage = useUiStore((s) => s.setLanguage)
  const fontSize = useUiStore((s) => s.fontSize)
  const setFontSize = useUiStore((s) => s.setFontSize)
  const highContrast = useUiStore((s) => s.highContrast)
  const toggleHighContrast = useUiStore((s) => s.toggleHighContrast)
  const reduceMotion = useUiStore((s) => s.reduceMotion)
  const toggleReduceMotion = useUiStore((s) => s.toggleReduceMotion)
  const colorFilter = useUiStore((s) => s.colorFilter)
  const setColorFilter = useUiStore((s) => s.setColorFilter)

  if (pathname.startsWith('/checkout') || pathname.startsWith('/pago')) return null
  // El widget es para clientes de la tienda (idioma, tamaño de letra, filtros de color);
  // en el panel admin flotaba encima de botones y texto de las herramientas internas.
  if (pathname.startsWith('/admin')) return null
  if (pathname.startsWith('/tienda')) return null
  if (esRutaPrototipo(pathname)) return null
  if (chatOpen) return null

  const isDark = theme === 'dark'

  return (
    <div className="fixed bottom-[calc(9rem+env(safe-area-inset-bottom,0px))] md:bottom-20 right-4 md:right-6 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="rounded-2xl w-72 shadow-[0_8px_40px_var(--hc-shadow)] overflow-hidden overflow-y-auto max-h-[80vh]"
            style={{
              backgroundColor: 'var(--hc-surface)',
              border: '1px solid var(--hc-border)',
              color: 'var(--hc-text)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 sticky top-0"
              style={{ borderBottom: '1px solid var(--hc-border)', backgroundColor: 'var(--hc-surface)' }}>
              <span className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--hc-text)' }}>
                <span className="shrink-0" style={{ color: 'var(--hc-muted)' }} aria-hidden="true">
                  <A11yIcon />
                </span>
                {t('a11y.panel')}
              </span>
              <button type="button"
                onClick={() => setOpen(false)}
                aria-label={t('a11y.close')}
                className="p-1 rounded-lg transition-colors"
                style={{ color: 'var(--hc-muted)' }}
              >
                <CloseIcon />
              </button>
            </div>

            <A11yPanelContent
              t={t} isDark={isDark} setTheme={setTheme}
              language={language} setLanguage={setLanguage}
              fontSize={fontSize} setFontSize={setFontSize}
              colorFilter={colorFilter} setColorFilter={setColorFilter}
              highContrast={highContrast} toggleHighContrast={toggleHighContrast}
              reduceMotion={reduceMotion} toggleReduceMotion={toggleReduceMotion}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Trigger button — símbolo de marca (§2.4) ── */}
      <button type="button"
        onClick={() => setOpen(!open)}
        aria-label={t('a11y.open')}
        title={t('a11y.panel')}
        className="hc-isotipo-placa w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200
          shadow-[0_4px_20px_var(--hc-shadow)] hover:scale-110 active:scale-95"
        style={{
          border: `1px solid ${open ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
        }}
      >
        <HotClickMark size={24} />
      </button>
    </div>
  )
}
