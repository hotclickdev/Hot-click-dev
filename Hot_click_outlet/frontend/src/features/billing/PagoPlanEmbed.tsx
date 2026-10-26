import OnvoSuscripcionEmbed from './OnvoSuscripcionEmbed'
import TilopaySuscripcionEmbed from './TilopaySuscripcionEmbed'
import type { PagoPlanPendiente } from './useCambiarPlan'

type Props = {
  pago: PagoPlanPendiente
  /** ONVO confirma en el SDK; el plan se activa cuando el webhook de billing verifica el cobro. */
  onPagado: () => void
  onVolver?: () => void
}

/** Auditor 5 S-01: abre el cobro de mensualidad del proveedor que devolvió /cambiar-plan. */
export default function PagoPlanEmbed({ pago, onPagado, onVolver }: Props) {
  if (pago.proveedor === 'ONVO') {
    return (
      <OnvoSuscripcionEmbed
        subscriptionId={pago.subscriptionId}
        customerId={pago.customerId}
        publishableKey={pago.publishableKey}
        onSuccess={onPagado}
      />
    )
  }
  return <TilopaySuscripcionEmbed pago={pago} onVolver={onVolver} />
}
