import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import useUiStore from '@/store/uiStore'
import { HotClickMark } from '@/components/ui/BrandLogo'
import useChatStore from '@/store/chatStore'

const LANGUAGES = [
  { code: 'es', label: 'Español',   flagSrc: 'https://flagcdn.com/cr.svg', country: 'CR' },
  { code: 'en', label: 'English',   flagSrc: 'https://flagcdn.com/us.svg', country: 'US' },
  { code: 'pt', label: 'Português', flagSrc: 'https://flagcdn.com/br.svg', country: 'BR' },
]

const COLOR_FILTERS = [
  { value: 'none',         label: 'Normal',         desc: 'Todos los colores',         dot: 'var(--hc-blue-400)' },
  { value: 'grayscale',    label: 'Sin color',       desc: 'Escala de grises',          dot: '#888' },
  { value: 'deuteranopia', label: 'Dalton. verde',   desc: 'Dificultad para ver verde', dot: '#22c55e' },
  { value: 'protanopia',   label: 'Dalton. rojo',    desc: 'Dificultad para ver rojo',  dot: '#ef4444' },
  { value: 'tritanopia',   label: 'Dalton. azul',    desc: 'Dificultad para ver azul',  dot: '#3b82f6' },
]

export default function AccessibilityPanel() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  const chatOpen = useChatStore(s => s.isOpen)
  const {
    theme, setTheme,
    language, setLanguage,
    fontSize, setFontSize,
    highContrast, toggleHighContrast,
    reduceMotion, toggleReduceMotion,
    colorFilter, setColorFilter,
  } = useUiStore()

  if (pathname.startsWith('/checkout') || pathname.startsWith('/pago')) return null
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
              <span className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
                ⚙ {t('a11y.panel')}
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label={t('a11y.close')}
                className="p-1 rounded-lg transition-colors"
                style={{ color: 'var(--hc-muted)' }}
              >
                <CloseIcon />
              </button>
            </div>

            <div className="p-4 space-y-4">

              {/* ── Tema ── */}
              <div>
                <SectionLabel>{t('theme.toggle')}</SectionLabel>
                <div className="flex gap-2">
                  <ThemeBtn active={!isDark} onClick={() => setTheme('light')} label={t('theme.light')} icon="☀️" />
                  <ThemeBtn active={isDark} onClick={() => setTheme('dark')} label={t('theme.dark')} icon="🌙" />
                </div>
              </div>

              {/* ── Idioma ── */}
              <div>
                <SectionLabel>{t('lang.select')}</SectionLabel>
                <div className="flex gap-1.5">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      aria-label={lang.label}
                      aria-pressed={lang.code === language}
                      className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150"
                      style={{
                        backgroundColor: lang.code === language ? 'var(--hc-accent)' : 'var(--hc-surface-2)',
                        color: lang.code === language ? '#fff' : 'var(--hc-muted)',
                        border: `1px solid ${lang.code === language ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
                      }}
                    >
                      <img
                        src={lang.flagSrc}
                        alt={lang.country}
                        aria-hidden="true"
                        className="w-7 h-5 rounded object-cover shadow-sm"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Tamaño de fuente ── */}
              <div>
                <SectionLabel>{t('a11y.tamanoFuente')}</SectionLabel>
                <div className="flex gap-1.5">
                  {[
                    { value: 'normal', label: t('a11y.small'),  size: 'text-sm'   },
                    { value: 'lg',     label: t('a11y.normal'), size: 'text-base' },
                    { value: 'xl',     label: t('a11y.large'),  size: 'text-lg'   },
                  ].map(({ value, label, size }) => (
                    <button
                      key={value}
                      onClick={() => setFontSize(fontSize === value && value !== 'normal' ? 'normal' : value)}
                      aria-label={label}
                      aria-pressed={fontSize === value}
                      className={`flex-1 py-2 rounded-xl font-bold transition-all duration-150 ${size}`}
                      style={{
                        backgroundColor: fontSize === value ? 'var(--hc-accent)' : 'var(--hc-surface-2)',
                        color: fontSize === value ? '#fff' : 'var(--hc-muted)',
                        border: `1px solid ${fontSize === value ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Filtro de color / visión ── */}
              <div>
                <SectionLabel>{t('a11y.filtroColor')}</SectionLabel>
                <div className="flex flex-col gap-1">
                  {COLOR_FILTERS.map(({ value, label, desc, dot }) => (
                    <button
                      key={value}
                      onClick={() => setColorFilter(value)}
                      aria-label={`${label} — ${desc}`}
                      aria-pressed={colorFilter === value}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 text-left"
                      style={{
                        backgroundColor: colorFilter === value ? 'var(--hc-accent)' : 'var(--hc-surface-2)',
                        color: colorFilter === value ? '#fff' : 'var(--hc-text)',
                        border: `1px solid ${colorFilter === value ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
                      }}
                    >
                      <span
                        aria-hidden="true"
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: dot, opacity: colorFilter === value ? 1 : 0.8 }}
                      />
                      <span className="font-semibold">{label}</span>
                      <span className="ml-auto text-[10px] font-normal opacity-70">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Toggles ── */}
              <div className="space-y-2">
                <ToggleRow
                  label={t('a11y.altoContraste')}
                  checked={highContrast}
                  onChange={toggleHighContrast}
                />
                <ToggleRow
                  label={t('a11y.reducirMovimiento')}
                  checked={reduceMotion}
                  onChange={toggleReduceMotion}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Trigger button — símbolo de marca (§2.4) ── */}
      <button
        onClick={() => setOpen(!open)}
        aria-label={t('a11y.open')}
        title={t('a11y.panel')}
        className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200
          shadow-[0_4px_20px_var(--hc-shadow)] hover:scale-110 active:scale-95"
        style={{
          backgroundColor: 'var(--hc-surface)',
          border: `1px solid ${open ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
        }}
      >
        <HotClickMark size={24} />
      </button>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest mb-2"
      style={{ color: 'var(--hc-muted)' }}>
      {children}
    </p>
  )
}

function ThemeBtn({ active, onClick, label, icon }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150"
      style={{
        backgroundColor: active ? 'var(--hc-accent)' : 'var(--hc-surface-2)',
        color: active ? '#fff' : 'var(--hc-muted)',
        border: `1px solid ${active ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-xl"
      style={{ backgroundColor: 'var(--hc-surface-2)' }}>
      <p className="text-xs font-medium" style={{ color: 'var(--hc-text)' }}>{label}</p>
      <Toggle checked={checked} onChange={onChange} aria-label={label} />
    </div>
  )
}

function Toggle({ checked, onChange, 'aria-label': ariaLabel }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className="relative w-9 h-5 rounded-full transition-all duration-200 shrink-0"
      style={{ backgroundColor: checked ? 'var(--hc-accent)' : 'var(--hc-border)' }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
        style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }}
      />
    </button>
  )
}

function A11yIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="4" r="1.5"/>
      <path d="M12 7v6m0 0l-3 4m3-4l3 4"/>
      <path d="M9 10h6"/>
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}
