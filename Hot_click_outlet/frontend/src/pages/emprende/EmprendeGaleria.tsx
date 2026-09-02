import { useTranslation } from 'react-i18next'
import EmprendeFoto from './EmprendeFoto'
import { FOTOS_GALERIA } from './emprendeImagenes'

/** Franja de fotos de negocios para visitantes. */
export default function EmprendeGaleria() {
  const { t } = useTranslation()

  return (
    <figure className="mb-10">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {FOTOS_GALERIA.map((foto) => (
          <EmprendeFoto
            key={foto.local}
            src={foto.local}
            fallback={foto.fallback}
            alt={t(foto.altKey)}
            className="w-full h-28 sm:h-40 object-cover rounded-2xl"
          />
        ))}
      </div>
      <figcaption className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
        {t('emprende.galeriaCaption')}
      </figcaption>
    </figure>
  )
}
