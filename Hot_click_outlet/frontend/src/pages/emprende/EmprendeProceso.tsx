import { useTranslation } from 'react-i18next'
import EmprendePasos from './EmprendePasos'
import EmprendeSeccion from './EmprendeSeccion'

/** Sección del proceso 1-2-3 para visitantes. */
export default function EmprendeProceso() {
  const { t } = useTranslation()

  return (
    <EmprendeSeccion
      id="proceso"
      title={t('emprende.procesoTitle')}
      subtitle={t('emprende.procesoSub')}
    >
      <EmprendePasos yaEsDuenio={false} />
    </EmprendeSeccion>
  )
}
