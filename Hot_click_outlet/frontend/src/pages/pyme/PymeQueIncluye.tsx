import { useTranslation } from 'react-i18next'
import TrustGlyph from '@/components/ui/TrustGlyph'

const ITEMS = ['incluyeItem1', 'incluyeItem2', 'incluyeItem3', 'incluyeItem4', 'incluyeItem5', 'incluyeItem6'] as const

/** Grilla de lo que trae el plan PYME + badge de créditos de IA incluidos. */
export default function PymeQueIncluye() {
  const { t } = useTranslation()

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold mb-6" style={{ color: 'var(--hc-text)' }}>
        {t('pyme.incluyeTitle')}
      </h2>
      <div
        className="rounded-2xl border p-6 sm:p-8"
        style={{ borderColor: 'var(--hc-border)', backgroundColor: 'var(--hc-surface)' }}
      >
        <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-3">
          {ITEMS.map((key) => (
            <li key={key} className="flex items-center gap-2.5 text-[15px]" style={{ color: 'var(--hc-text)' }}>
              <span className="shrink-0" style={{ color: 'var(--hc-primary)' }}>
                <TrustGlyph tipo="check" className="w-5 h-5" />
              </span>
              {t(`pyme.${key}`)}
            </li>
          ))}
        </ul>
      </div>
      <span
        className="inline-flex items-center mt-5 px-4 py-2 rounded-full text-[13px] font-medium"
        style={{ backgroundColor: 'var(--hc-n-100, #f1f3f6)', color: 'var(--hc-text)' }}
      >
        {t('pyme.incluyeIA')}
      </span>
    </div>
  )
}
