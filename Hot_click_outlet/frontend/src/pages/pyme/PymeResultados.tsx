import { useTranslation } from 'react-i18next'

/** Franja de resultados: cantidad de negocios + una cita corta de un cliente PYME. */
export default function PymeResultados() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col sm:flex-row gap-8 sm:gap-10 items-start sm:items-center py-2">
      <div className="shrink-0">
        <p className="text-3xl sm:text-4xl font-bold" style={{ color: 'var(--hc-text)', fontFamily: 'var(--hc-font-display)' }}>
          {t('pyme.resultadosNumero')}
        </p>
        <p className="text-sm max-w-[140px]" style={{ color: 'var(--hc-muted)' }}>
          {t('pyme.resultadosLabel')}
        </p>
      </div>
      <div
        className="flex-1 rounded-2xl border px-6 py-5"
        style={{ borderColor: 'var(--hc-border)', backgroundColor: 'var(--hc-surface)' }}
      >
        <p className="text-base sm:text-lg leading-relaxed" style={{ color: 'var(--hc-text)' }}>
          &ldquo;{t('pyme.resultadosCita')}&rdquo;
        </p>
        <p className="text-sm mt-2" style={{ color: 'var(--hc-muted)' }}>
          {t('pyme.resultadosAutor')}
        </p>
      </div>
    </div>
  )
}
