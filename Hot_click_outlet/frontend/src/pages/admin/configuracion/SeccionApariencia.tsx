import { useTranslation } from 'react-i18next'
import useUiStore from '@/store/uiStore'
import { F, Block, Toggle, SectionHeader, CheckIcon } from './configUi'

export default function SeccionApariencia() {
  const { t } = useTranslation()
  const { theme, setTheme, fontSize, setFontSize, highContrast, toggleHighContrast, reduceMotion, toggleReduceMotion } = useUiStore()

  const themes = [
    { id: 'dark',  labelKey: 'adminConfig.apThemeDark',  bg: '#0a0a0d', accent: 'var(--hc-accent)' },
    { id: 'light', labelKey: 'adminConfig.apThemeLight', bg: '#f5f5f5', accent: 'var(--hc-accent)' },
  ]
  const sizes = [
    { id: 'base', labelKey: 'adminConfig.apFontNormal' },
    { id: 'lg',   labelKey: 'adminConfig.apFontLarge' },
    { id: 'xl',   labelKey: 'adminConfig.apFontXL' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SectionHeader title={t('adminConfig.apTitle')} desc={t('adminConfig.apDesc')} />

      <Block label={t('adminConfig.apThemeTitle')} sublabel={t('adminConfig.apThemeSubtitle')}>
        <div style={{ display: 'flex', gap: '12px' }}>
          {themes.map(th => (
            <button type="button" key={th.id} onClick={() => setTheme(th.id)} className="cfg-btn"
              style={{ flex: 1, flexDirection: 'column', gap: '8px', padding: '16px', border: `1px solid ${theme === th.id ? 'var(--hc-accent)' : 'var(--hc-border)'}`, background: theme === th.id ? 'var(--hc-glass-bg)' : 'var(--hc-bg)', fontWeight: 400 }}>
              <div style={{ width: '48px', height: '32px', borderRadius: '8px', border: '1px solid var(--hc-border)', overflow: 'hidden', position: 'relative', background: th.bg }}>
                <div style={{ position: 'absolute', top: '6px', left: '6px', width: '12px', height: '4px', borderRadius: '2px', background: th.accent, opacity: 0.8 }} />
                <div style={{ position: 'absolute', bottom: '6px', left: '6px', right: '6px', height: '4px', borderRadius: '2px', background: 'var(--hc-border)' }} />
              </div>
              <p style={{ fontSize: '12px', color: theme === th.id ? 'var(--hc-accent)' : 'var(--hc-muted)', fontFamily: F.body, margin: 0, fontWeight: theme === th.id ? 600 : 400 }}>{t(th.labelKey)}</p>
              {theme === th.id && <CheckIcon style={{ width: '13px', height: '13px', color: 'var(--hc-accent)' }} />}
            </button>
          ))}
        </div>
      </Block>

      <Block label={t('adminConfig.apFontTitle')} sublabel={t('adminConfig.apFontSubtitle')}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {sizes.map(s => (
            <button type="button" key={s.id} onClick={() => setFontSize(s.id)} className="cfg-btn"
              style={{ flex: 1, justifyContent: 'center', border: `1px solid ${fontSize === s.id ? 'var(--hc-accent)' : 'var(--hc-border)'}`, background: fontSize === s.id ? 'var(--hc-glass-bg)' : 'var(--hc-surface-2)', color: fontSize === s.id ? 'var(--hc-accent)' : 'var(--hc-muted)', fontWeight: fontSize === s.id ? 600 : 400, padding: '8px' }}>
              {t(s.labelKey)}
            </button>
          ))}
        </div>
      </Block>

      <Block label={t('adminConfig.apAccessTitle')}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[
            { key: 'highContrast', labelKey: 'adminConfig.apHighContrast', descKey: 'adminConfig.apHighContrastDesc', value: highContrast, fn: toggleHighContrast },
            { key: 'reduceMotion', labelKey: 'adminConfig.apReduceMotion', descKey: 'adminConfig.apReduceMotionDesc', value: reduceMotion, fn: toggleReduceMotion },
          ].map(({ key, labelKey, descKey, value, fn }, idx) => (
            <div key={key}>
              {idx > 0 && <hr className="cfg-divider" />}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 0' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>{t(labelKey)}</p>
                  <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '2px', fontFamily: F.body }}>{t(descKey)}</p>
                </div>
                <Toggle checked={value} onChange={fn} />
              </div>
            </div>
          ))}
        </div>
      </Block>
    </div>
  )
}
