import OnvoSuscripcionEmbed from './OnvoSuscripcionEmbed'
import type { PagoPlanPendiente } from './useCambiarPlan'

type Props = {
  pago: PagoPlanPendiente
  /**
   * El SDK terminó. Quien llama tiene que reconciliar con ONVO y mostrar si quedó
   * pendiente o activo. Este embed no marca el plan como activo.
   */
  onPagado: () => void
  onVolver?: () => void
}

/** Auditor 5 S-01: abre el cobro de mensualidad ONVO que devolvió /cambiar-plan. */
export default function PagoPlanEmbed({ pago, onPagado }: Props) {
  return (
    <OnvoSuscripcionEmbed
      subscriptionId={pago.subscriptionId}
      customerId={pago.customerId}
      publishableKey={pago.publishableKey}
      onSuccess={onPagado}
    />
  )
}
