import { useTranslation } from 'react-i18next'
import QrEncabezadoNegocio from '@/features/qr-negocio/QrEncabezadoNegocio'
import type { MesaSelfCheckout } from './selfCheckoutTypes'

/** Encabezado del negocio y la mesa (Figma `29:1651`, `29:1742`). */
export default function SelfCheckoutHeader({
  mesa,
  conInvitacion,
}: Readonly<{
  mesa: MesaSelfCheckout | null
  /** En el menú el subtítulo invita a pedir; en la confirmación solo dice la mesa. */
  conInvitacion?: boolean
}>) {
  const { t } = useTranslation()
  const mesaNombre = mesa?.mesaNombre ?? ''
  return (
    <QrEncabezadoNegocio
      nombre={mesa?.empresaNombre ?? ''}
      logoUrl={mesa?.logoUrl}
      subtitulo={conInvitacion && mesaNombre ? t('pos.mesa.subtituloMenu', { mesa: mesaNombre }) : mesaNombre}
      seguro={t('pos.negocio.seguro')}
    />
  )
}
