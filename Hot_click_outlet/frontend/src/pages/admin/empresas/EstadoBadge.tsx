import { useTranslation } from 'react-i18next'
import EstadoBadgeUi from '@/components/ui/EstadoBadge'
import { ESTADO_PEDIDO_TONO } from '../ordenes/ordenesHelpers'

export default function EstadoBadge({ estado }: { estado?: string }) {
  const { t } = useTranslation()
  return (
    <EstadoBadgeUi
      tono={ESTADO_PEDIDO_TONO[estado ?? ''] ?? 'muted'}
      label={t(`adminOrders.status${estado}`, { defaultValue: estado ?? '—' })}
    />
  )
}
