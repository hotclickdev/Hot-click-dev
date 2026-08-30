import { useTranslation } from 'react-i18next'
import { ESTADO_STYLES } from './serviciosHelpers'

export default function EstadoBadge({ estado }: { estado?: string }) {
  const { t } = useTranslation()
  const cfg = (estado && ESTADO_STYLES[estado]) || ESTADO_STYLES.PENDIENTE
  return (
    <span className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}>
      {t(`serviciosPage.status.${estado}`, { defaultValue: estado })}
    </span>
  )
}
