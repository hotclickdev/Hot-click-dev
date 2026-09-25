import { useTranslation } from 'react-i18next'
import TrustGlyph from '@/components/ui/TrustGlyph'

/**
 * Franja de confianza bajo el hero. El Figma trae placeholders numéricos
 * ({{X}}+, {{Y}}%) sin dato real detrás — se optó por copy cualitativo en
 * vez de inventar estadísticas.
 */
export default function NegocioPlusTrustBar() {
  const { t } = useTranslation()

  const items = [
    { icon: 'edificio', label: t('negocioPlus.trustNegocios') },
    { icon: 'estrella', label: t('negocioPlus.trustRecomienda') },
    { icon: 'telefono', label: `${t('negocioPlus.trustSoporteTitulo')} ${t('negocioPlus.trustSoporteSub')}` },
    { icon: 'tarjeta', label: `${t('negocioPlus.trustPagosTitulo')} ${t('negocioPlus.trustPagosSub')}` },
  ] as const

  return (
    <div className="border-b" style={{ borderColor: 'var(--hc-border)', backgroundColor: 'var(--hc-surface)' }}>
      <div className="flex flex-wrap gap-x-10 gap-y-4 px-6 sm:px-10 py-6 max-w-6xl mx-auto">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2.5">
            <span style={{ color: 'var(--hc-primary)' }}>
              <TrustGlyph tipo={item.icon} className="w-5 h-5" />
            </span>
            <span className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
