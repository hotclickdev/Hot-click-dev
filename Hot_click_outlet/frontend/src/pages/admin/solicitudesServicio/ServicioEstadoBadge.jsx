import { useTranslation } from 'react-i18next'
import { ESTADO_STYLES } from './servicioHelpers'

export default function ServicioEstadoBadge({ estado }) {
  const { t } = useTranslation()
  const m = ESTADO_STYLES[estado] || ESTADO_STYLES.PENDIENTE
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-bold"
      style={{ color: m.color, backgroundColor: m.bg }}>
      {t(`adminSolicitudes.status.${estado}`, { defaultValue: estado })}
    </span>
  )
}
