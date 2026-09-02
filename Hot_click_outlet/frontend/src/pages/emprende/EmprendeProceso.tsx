import { useTranslation } from 'react-i18next'
import EmprendeFoto from './EmprendeFoto'
import EmprendePasos from './EmprendePasos'
import EmprendeSeccion from './EmprendeSeccion'
import { FOTOS_PROCESO } from './emprendeImagenes'

/** Sección del proceso 1-2-3 para visitantes. */
export default function EmprendeProceso() {
  const { t } = useTranslation()

  return (
    <EmprendeSeccion
      id="proceso"
      title={t('emprende.procesoTitle')}
      subtitle={t('emprende.procesoSub')}
    >
      <div className="grid grid-cols-3 gap-2 mb-6">
        {FOTOS_PROCESO.map((foto) => (
          <EmprendeFoto
            key={foto.local}
            src={foto.local}
            fallback={foto.fallback}
            alt={t(foto.altKey)}
            className="w-full h-24 sm:h-32 object-cover rounded-2xl"
          />
        ))}
      </div>
      <EmprendePasos yaEsDuenio={false} />
    </EmprendeSeccion>
  )
}
