import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import PagoRevisado from '@/pages/checkout/PagoRevisado'
import { leerCompra } from '@/pages/checkout/compraGuardada'
import { numeroCompraVisible } from '@/pages/checkout/validacionCompra'
import type { PagoResumen } from './pagoHelpers'

type PagoPendienteProps = {
  pagoData: PagoResumen | null
  numeroPedido: string
  stripeApproved: boolean
  token: string | null
}

/** Timeout del polling: el pago sigue en revisión (Figma `45:1640`, con textos de tarjeta). */
export default function PagoPendiente({ pagoData, numeroPedido, stripeApproved, token }: PagoPendienteProps) {
  const { t } = useTranslation()
  const [compra] = useState(leerCompra)
  const cantidadPaquetes = compra?.paquetes.length || 1
  const numero = numeroCompraVisible(pagoData?.numeroPedido ?? numeroPedido, cantidadPaquetes)
  return (
    <PagoRevisado
      numeroPedido={numero}
      cantidadPaquetes={cantidadPaquetes}
      esInvitado={!token}
      titulo={stripeApproved ? t('compra.pendiente.tituloAprobado') : undefined}
      texto={stripeApproved ? t('compra.pendiente.textoAprobado') : t('compra.pendiente.texto')}
      pasoInicial={t('compra.pendiente.enviado')}
    />
  )
}
