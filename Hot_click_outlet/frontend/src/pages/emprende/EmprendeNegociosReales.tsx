import { useTranslation } from 'react-i18next'
import EmprendeFoto from './EmprendeFoto'
import { FOTOS_FERIA } from './emprendeImagenes'

/** Carrusel horizontal de fotos de negocios reales. Scroll nativo, sin librería extra. */
export default function EmprendeNegociosReales() {
  const { t } = useTranslation()

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold mb-5" style={{ color: 'var(--hc-text)' }}>
        {t('emprende.negociosRealesTitle')}
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0">
        {FOTOS_FERIA.map((foto) => (
          <EmprendeFoto
            key={foto.local}
            src={foto.local}
            fallback={foto.fallback}
            alt={t(foto.claveAlt)}
            className="w-[220px] h-[180px] object-cover rounded-2xl shrink-0 snap-start"
          />
        ))}
      </div>
      <p className="text-xs mt-2" style={{ color: 'var(--hc-muted)' }}>
        {t('emprende.negociosRealesCaption')}
      </p>
    </div>
  )
}
