import { useTranslation } from 'react-i18next'
import { abrirPreferenciasCookies } from '@/utils/cookieConsent'

/** Abre el panel de cookies desde el pie, como hacen bancos y empresas grandes. */
export default function FooterCookieButton() {
  const { t } = useTranslation()
  return (
    <li>
      <button
        type="button"
        onClick={abrirPreferenciasCookies}
        className="group flex items-center gap-2 py-1 text-sm transition-colors duration-150"
        style={{ color: 'var(--hc-muted)', fontWeight: 400, background: 'none', border: 0, paddingLeft: 0, cursor: 'pointer' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--hc-text)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--hc-muted)' }}
      >
        <span
          className="inline-block w-1 h-1 rounded-full shrink-0 transition-all duration-150 group-hover:w-2"
          style={{ background: 'var(--hc-border-strong)' }}
        />
        {t('footer.configurarCookies')}
      </button>
    </li>
  )
}
