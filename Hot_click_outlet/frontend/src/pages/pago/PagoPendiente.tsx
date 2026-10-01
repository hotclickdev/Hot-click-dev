import PagoEnRevision from './PagoEnRevision'
import { tituloPendiente, subtituloPendiente } from './pagoHelpers'
import type { PagoResumen } from './pagoHelpers'

type PagoPendienteProps = {
  pagoData: PagoResumen | null
  stripeApproved: boolean
  token: string | null
}

/**
 * Timeout: el pago sigue en revisión (webhook lento o pasarela ya aprobada). Figma `45:1640`.
 */
export default function PagoPendiente({ pagoData, stripeApproved, token }: PagoPendienteProps) {
  return (
    <PagoEnRevision
      titulo={tituloPendiente(stripeApproved)}
      texto={subtituloPendiente(stripeApproved)}
      numeroPedido={pagoData?.numeroPedido}
      token={token}
    />
  )
}
