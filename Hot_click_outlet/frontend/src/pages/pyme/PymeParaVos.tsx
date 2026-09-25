import { useTranslation } from 'react-i18next'
import TrustGlyph from '@/components/ui/TrustGlyph'

/** "¿Es para vos?": 2 razones para sí, 1 aviso para quien no encaja en PYME. */
export default function PymeParaVos() {
  const { t } = useTranslation()

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold mb-6" style={{ color: 'var(--hc-text)' }}>
        {t('pyme.paraVosTitle')}
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {['paraVos1', 'paraVos2'].map((key) => (
          <div
            key={key}
            className="rounded-2xl border p-6 flex items-start gap-2.5"
            style={{ borderColor: 'var(--hc-border)', backgroundColor: 'var(--hc-surface)' }}
          >
            <span className="shrink-0 mt-0.5" style={{ color: 'var(--hc-primary)' }}>
              <TrustGlyph tipo="check" className="w-5 h-5" />
            </span>
            <p className="text-[15px]" style={{ color: 'var(--hc-text)' }}>{t(`pyme.${key}`)}</p>
          </div>
        ))}
        <div
          className="rounded-2xl p-6 flex items-start gap-2.5"
          style={{ backgroundColor: 'var(--hc-n-100, #f1f3f6)' }}
        >
          <span className="shrink-0 mt-1" style={{ color: 'var(--hc-muted)' }}>
            <TrustGlyph tipo="adelante" className="w-4 h-4" />
          </span>
          <p className="text-[15px]" style={{ color: 'var(--hc-muted)' }}>{t('pyme.paraVosNo')}</p>
        </div>
      </div>
    </div>
  )
}
