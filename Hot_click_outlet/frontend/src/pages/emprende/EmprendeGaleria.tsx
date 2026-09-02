import { useTranslation } from 'react-i18next'
import EmprendeFoto from './EmprendeFoto'
import { FOTOS_FERIA, FOTOS_GALERIA } from './emprendeImagenes'

/** Fotos de negocios y ferias de emprendimiento. */
export default function EmprendeGaleria() {
  const { t } = useTranslation()

  return (
    <div className="mb-10">
      <figure>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FOTOS_GALERIA.map((foto) => (
            <EmprendeFoto
              key={foto.local}
              src={foto.local}
              fallback={foto.fallback}
              alt={t(foto.claveAlt)}
              className="w-full h-28 sm:h-40 object-cover rounded-2xl"
            />
          ))}
        </div>
        <figcaption className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
          {t('emprende.galeriaCaption')}
        </figcaption>
      </figure>
      <figure className="mt-6">
        <p className="text-xs font-bold tracking-[0.12em] uppercase mb-2" style={{ color: 'var(--hc-primary)' }}>
          {t('emprende.feriaBadge')}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FOTOS_FERIA.map((foto) => (
            <EmprendeFoto
              key={foto.local}
              src={foto.local}
              fallback={foto.fallback}
              alt={t(foto.claveAlt)}
              className="w-full h-32 sm:h-44 object-cover rounded-2xl"
            />
          ))}
        </div>
        <figcaption className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
          {t('emprende.feriaCaption')}
        </figcaption>
      </figure>
    </div>
  )
}
