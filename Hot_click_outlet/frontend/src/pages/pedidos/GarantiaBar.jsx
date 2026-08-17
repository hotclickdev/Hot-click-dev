import { useTranslation } from 'react-i18next'
import { DIAS_GARANTIA, MS_POR_DIA, formatDateShort } from './pedidoHelpers'

export default function GarantiaBar({ fechaPedido }) {
  const { t } = useTranslation()
  if (!fechaPedido) return null

  const limite = new Date(fechaPedido)
  limite.setDate(limite.getDate() + DIAS_GARANTIA)
  // Misma evaluación al pintar la tarjeta que antes.
  // eslint-disable-next-line react-hooks/purity -- Date.now intencional para días de garantía
  const diasRestantes = Math.ceil((limite - Date.now()) / MS_POR_DIA)
  const vence = formatDateShort(limite)

  if (diasRestantes > 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
        style={{ backgroundColor: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)' }}>
        <span className="font-medium" style={{ color: '#059669' }}>{t('orders.warrantyActive')}</span>
        <span className="text-xs ml-auto" style={{ color: '#059669' }}>
          {t('orders.warrantyDays', { count: diasRestantes })} · {t('orders.expires')} {vence}
        </span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
      style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
      <span style={{ color: 'var(--hc-muted)' }}>{t('orders.warrantyExpired')}</span>
      <span className="text-xs ml-auto" style={{ color: 'var(--hc-muted)' }}>{t('orders.expired')} {vence}</span>
    </div>
  )
}
