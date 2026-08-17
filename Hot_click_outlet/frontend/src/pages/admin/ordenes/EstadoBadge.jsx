import { useTranslation } from 'react-i18next'
import { ESTADO_STYLE } from './ordenesHelpers'

export default function EstadoBadge({ estado }) {
  const { t } = useTranslation()
  const s = ESTADO_STYLE[estado] ?? { bg: 'var(--hc-surface-2)', text: 'var(--hc-muted)', border: 'var(--hc-border)' }
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
      {t(`adminOrders.status${estado}`, { defaultValue: estado })}
    </span>
  )
}
