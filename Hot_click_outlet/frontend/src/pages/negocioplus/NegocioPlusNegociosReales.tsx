import { useTranslation } from 'react-i18next'
import EmprendeFoto from '../emprende/EmprendeFoto'
import { FOTOS_GALERIA } from '../emprende/emprendeImagenes'
import EmprendeSeccion from '../emprende/EmprendeSeccion'

/**
 * Carrusel de fotos de negocios reales. Reusa el banco de fotos de comercios
 * de /emprende (no hay fotografía propia para Negocio Plus todavía) — mismas
 * imágenes, alt text propio del banco de imágenes.
 */
export default function NegocioPlusNegociosReales() {
  const { t } = useTranslation()

  return (
    <EmprendeSeccion title={t('negocioPlus.negociosRealesTitle')}>
      <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0">
        {FOTOS_GALERIA.map((foto) => (
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
        {t('negocioPlus.negociosRealesCaption')}
      </p>
    </EmprendeSeccion>
  )
}
