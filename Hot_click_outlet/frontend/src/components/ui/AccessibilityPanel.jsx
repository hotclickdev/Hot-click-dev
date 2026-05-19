import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import useUiStore from '@/store/uiStore'

const LANGUAGES = [
  { code: 'es', label: 'ES', flag: '🇨🇷', name: 'Español' },
  { code: 'en', label: 'EN', flag: '🇺🇸', name: 'English' },
  { code: 'pt', label: 'PT', flag: '🇧🇷', name: 'Português' },
]

export default function AccessibilityPanel() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const {
    theme, setTheme,
    language, setLanguage,
    fontSize, setFontSize,
    highContrast, toggleHighContrast,
    reduceMotion, toggleReduceMotion,
  } = useUiStore()

  const isDark = theme === 'dark'
  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0]

  return (
    <div className="fixed bottom-28 md:bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="rounded-2xl w-64 shadow-[0_8px_40px_var(--hc-shadow)] overflow-hidden"
            style={{
              backgroundColor: 'var(--hc-surface)',
              border: '1px solid var(--hc-border)',
              color: 'var(--hc-text)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid var(--hc-border)' }}>
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
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2"
                  style={{ color: 'var(--hc-muted)' }}>
                  {t('theme.toggle')}
                </p>
                <div className="flex gap-2">
                  <ThemeBtn active={!isDark} onClick={() => setTheme('light')} label={t('theme.light')} icon="☀️" />
                  <ThemeBtn active={isDark} onClick={() => setTheme('dark')} label={t('theme.dark')} icon="🌙" />
                </div>
              </div>

              {/* ── Idioma ── */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2"
                  style={{ color: 'var(--hc-muted)' }}>
                  {t('lang.select')}
                </p>
                <div className="flex gap-1.5">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      aria-label={lang.name}
                      aria-pressed={lang.code === language}
                      className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
                      style={{
                        backgroundColor: lang.code === language ? 'var(--hc-accent)' : 'var(--hc-surface-2)',
                        color: lang.code === language ? '#fff' : 'var(--hc-muted)',
                        border: `1px solid ${lang.code === language ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
                      }}
                    >
                      <span className="text-base leading-none" aria-hidden="true">{lang.flag}</span>
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Tamaño de fuente ── */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2"
                  style={{ color: 'var(--hc-muted)' }}>
                  {t('a11y.tamanoFuente')}
                </p>
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

              {/* ── Toggles ── */}
              <div className="space-y-2">
                <ToggleRow
                  label={t('a11y.altoContraste')}
                  checked={highContrast}
                  onChange={toggleHighContrast}
                  hcText='var(--hc-text)'
                  hcMuted='var(--hc-muted)'
                  hcSurface='var(--hc-surface-2)'
                  t={t}
                />
                <ToggleRow
                  label={t('a11y.reducirMovimiento')}
                  checked={reduceMotion}
                  onChange={toggleReduceMotion}
                  hcText='var(--hc-text)'
                  hcMuted='var(--hc-muted)'
                  hcSurface='var(--hc-surface-2)'
                  t={t}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Trigger button ── */}
      <button
        onClick={() => setOpen(!open)}
        aria-label={t('a11y.open')}
        title={t('a11y.panel')}
        className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200
          shadow-[0_4px_20px_var(--hc-shadow)] hover:scale-110 active:scale-95"
        style={{
          backgroundColor: open ? 'var(--hc-accent)' : 'var(--hc-surface)',
          color: open ? '#fff' : 'var(--hc-muted)',
          border: `1px solid ${open ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
        }}
      >
        <A11yIcon />
      </button>
    </div>
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

function ToggleRow({ label, checked, onChange, hcText, hcMuted, hcSurface, t }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-xl"
      style={{ backgroundColor: hcSurface }}>
      <p className="text-xs font-medium" style={{ color: hcText }}>{label}</p>
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
