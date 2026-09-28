import { useTranslation } from 'react-i18next'
import EstadoVacio from '@/components/comprador/estados/EstadoVacio'
import { IconoPaquete } from '@/components/comprador/estados/iconosEstado'

/** Sin pedidos (Figma `45:1848`). */
export default function PedidosEmptyState({ onVerProductos }: { onVerProductos: () => void }) {
  const { t } = useTranslation()
  return (
    <EstadoVacio
      icono={<IconoPaquete />}
      titulo={t('orders.empty')}
      texto={t('orders.emptySub')}
      accion={{ texto: t('orders.viewProducts'), onClick: onVerProductos }}
    />
  )
}
