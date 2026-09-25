import { useTranslation } from 'react-i18next'
import TrustGlyph from '@/components/ui/TrustGlyph'
import EmprendeSeccion from '../emprende/EmprendeSeccion'

const ITEMS = ['incluye1', 'incluye2', 'incluye3', 'incluye4'] as const

/** Checklist de lo que suma Negocio Plus sobre PYME. */
export default function NegocioPlusQueIncluye() {
  const { t } = useTranslation()

  return (
    <EmprendeSeccion title={t('negocioPlus.incluyeTitle')} subtitle={t('negocioPlus.incluyeIntro')}>
      <div className="rounded-lg border overflow-hidden max-w-4xl" style={{ borderColor: 'var(--hc-border)', backgroundColor: 'var(--hc-surface)' }}>
        {ITEMS.map((key, i) => (
          <div
            key={key}
            className={`flex items-center gap-3 px-6 py-3.5 ${i > 0 ? 'border-t' : ''}`}
            style={{ borderColor: 'var(--hc-border)' }}
          >
            <span style={{ color: 'var(--hc-primary)' }}>
              <TrustGlyph tipo="check" className="w-4 h-4 shrink-0" />
            </span>
            <p className="text-sm" style={{ color: 'var(--hc-text)' }}>{t(`negocioPlus.${key}`)}</p>
          </div>
        ))}
      </div>
    </EmprendeSeccion>
  )
}
