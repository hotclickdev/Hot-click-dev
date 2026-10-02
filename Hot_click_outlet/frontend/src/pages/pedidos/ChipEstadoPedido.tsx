import { useTranslation } from 'react-i18next'

type Tono = 'azul' | 'ambar' | 'verde' | 'gris'

const TONO_POR_ESTADO: Record<string, Tono> = {
  ENVIADO: 'azul',
  LISTO_RETIRO: 'azul',
  PAGADO: 'azul',
  EN_PREPARACION: 'ambar',
  PENDIENTE: 'ambar',
  ENTREGADO: 'verde',
  CANCELADO: 'gris',
}

const CLASES: Record<Tono, string> = {
  azul: 'bg-hc-blue-50 text-hc-blue-600',
  ambar: 'bg-hc-warning-bg text-hc-warning',
  verde: 'bg-hc-green-50 text-hc-success',
  gris: 'bg-hc-n-100 text-hc-n-600',
}

/** Chip de estado del pedido o paquete (Figma `28:1207`, `28:1330`, `29:1470`): 11 px semibold. */
export default function ChipEstadoPedido({ estado, className = '' }: { estado: string; className?: string }) {
  const { t } = useTranslation()
  const tono = TONO_POR_ESTADO[estado] ?? 'gris'
  const texto = t(`cuenta.estado.${estado}`, { defaultValue: t('cuenta.estado.OTRO') })
  return (
    <span className={`inline-flex min-h-[19px] shrink-0 items-center rounded-full px-2 py-[3px] text-[11px] font-semibold leading-[normal] ${CLASES[tono]} ${className}`}>
      {texto}
    </span>
  )
}
