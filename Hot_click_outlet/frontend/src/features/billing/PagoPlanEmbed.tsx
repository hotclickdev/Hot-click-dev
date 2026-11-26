import OnvoSuscripcionEmbed from './OnvoSuscripcionEmbed'
import { textoCheckoutTrial } from '@/components/ui/planPendiente'
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
  const aviso = textoCheckoutTrial(pago.trialDias, pago.primerCobro)
  return (
    <>
      {aviso ? <p role="status" className="mb-3 text-sm">{aviso}</p> : null}
      <OnvoSuscripcionEmbed
        subscriptionId={pago.subscriptionId}
        customerId={pago.customerId}
        publishableKey={pago.publishableKey}
        onSuccess={onPagado}
      />
    </>
  )
}
