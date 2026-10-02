import PagoEnRevision from './PagoEnRevision'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  return (
    <PagoEnRevision
      titulo={tituloPendiente(stripeApproved, t)}
      texto={subtituloPendiente(stripeApproved, t)}
      numeroPedido={pagoData?.numeroPedido}
      token={token}
    />
  )
}
