import TilopayCardForm from '@/pages/checkout/TilopayCardForm'
import type { PagoPlanTilopay } from './useCambiarPlan'

type Props = {
  pago: PagoPlanTilopay
  onVolver?: () => void
}

/** Cobro de mensualidad con el SDK de Tilopay; el retorno confirma en /billing/tilopay/respuesta. */
export default function TilopaySuscripcionEmbed({ pago, onVolver }: Props) {
  return (
    <TilopayCardForm
      sdkToken={pago.sdkToken}
      monto={pago.montoCrc}
      moneda="CRC"
      orderNumber={pago.orderNumber}
      redirectUrl={`${globalThis.location.origin}/billing/tilopay/respuesta`}
      onVolver={onVolver}
    />
  )
}
