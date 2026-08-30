import { LANGUAGES, COLOR_FILTERS } from './a11yConstants'
import { SectionLabel, ThemeBtn, ToggleRow } from './a11yUi'
import TrustGlyph from '@/components/ui/TrustGlyph'
import type { TFunction } from 'i18next'

export type A11yPanelContentProps = {
  t: TFunction
  isDark: boolean
  setTheme: (theme: string) => void
  language: string
  setLanguage: (language: string) => void
  fontSize: string
  setFontSize: (fontSize: string) => void
  colorFilter: string
  setColorFilter: (colorFilter: string) => void
  highContrast: boolean
  toggleHighContrast: () => void
  reduceMotion: boolean
  toggleReduceMotion: () => void
}

/**
 * Contenido del panel de accesibilidad (tema, idioma, fuente, filtros, toggles).
 */
export default function A11yPanelContent({
  t, isDark, setTheme, language, setLanguage, fontSize, setFontSize,
  colorFilter, setColorFilter, highContrast, toggleHighContrast,
  reduceMotion, toggleReduceMotion,
}: A11yPanelContentProps) {
  return (
    <div className="p-4 space-y-4">

      {/* ── Tema ── */}
      <div>
        <SectionLabel>{t('theme.toggle')}</SectionLabel>
        <div className="flex gap-2">
          <ThemeBtn active={!isDark} onClick={() => setTheme('light')} label={t('theme.light')} icon={<TrustGlyph tipo="sol" className="w-3.5 h-3.5" />} />
          <ThemeBtn active={isDark} onClick={() => setTheme('dark')} label={t('theme.dark')} icon={<TrustGlyph tipo="luna" className="w-3.5 h-3.5" />} />
        </div>
      </div>

      {/* ── Idioma ── */}
      <div>
        <SectionLabel>{t('lang.select')}</SectionLabel>
        <div className="flex gap-1.5">
          {LANGUAGES.map((lang) => (
            <button type="button"
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
            <button type="button"
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
            <button type="button"
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
  )
}
