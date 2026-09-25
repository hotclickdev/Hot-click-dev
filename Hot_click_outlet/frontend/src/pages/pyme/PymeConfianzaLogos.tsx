import { useTranslation } from 'react-i18next'

/** Fila de logos de negocios que confían en HotClick (placeholders hasta tener logos reales). */
export default function PymeConfianzaLogos() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <p className="text-sm font-medium" style={{ color: 'var(--hc-muted)' }}>
        {t('pyme.confianzaTitle')}
      </p>
      <div className="flex flex-wrap gap-4 justify-center">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="w-[120px] h-12 rounded-[10px] border border-dashed flex items-center justify-center text-xs"
            style={{ borderColor: 'var(--hc-border)', backgroundColor: 'var(--hc-surface)', color: 'var(--hc-muted)' }}
          >
            {t('pyme.confianzaLogoPlaceholder')}
          </span>
        ))}
      </div>
    </div>
  )
}
