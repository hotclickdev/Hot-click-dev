import { useTranslation } from 'react-i18next'
import TrustGlyph from '@/components/ui/TrustGlyph'

const NEGOCIOS = ['edificio', 'bolsa', 'etiqueta', 'silla', 'paquete'] as const

/** Carrusel horizontal de negocios PYME reales (placeholders hasta tener fotos). */
export default function PymeNegociosReales() {
  const { t } = useTranslation()

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold mb-5" style={{ color: 'var(--hc-text)' }}>
        {t('pyme.negociosRealesTitle')}
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0">
        {NEGOCIOS.map((tipo, i) => (
          <div
            key={tipo}
            className="w-[220px] h-[180px] rounded-2xl shrink-0 snap-start flex flex-col items-center justify-center gap-2 border"
            style={{ borderColor: 'var(--hc-border)', backgroundColor: 'var(--hc-n-100, #f1f3f6)' }}
          >
            <span style={{ color: 'var(--hc-muted)' }}>
              <TrustGlyph tipo={tipo} className="w-8 h-8" />
            </span>
            <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
              {t('pyme.negociosRealesFotoAlt', { n: i + 1 })}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs mt-2" style={{ color: 'var(--hc-muted)' }}>
        {t('pyme.negociosRealesCaption')}
      </p>
    </div>
  )
}
