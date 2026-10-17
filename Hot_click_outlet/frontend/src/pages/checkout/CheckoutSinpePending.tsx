import type { Dispatch, SetStateAction, RefObject } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import useAuthStore from '@/store/authStore'
import PagoEnRevision from '@/pages/pago/PagoEnRevision'
import { BotonPago, MarcoPago } from '@/pages/pago/PiezasPago'
import { formatPrice } from '@/utils/format'
import { ICONOS_CHECKOUT } from './iconosCheckout'

type PagoDataSinpe = {
  numeroPedido?: string
  proveedor?: string
}

type CheckoutSinpePendingProps = {
  pagoData: PagoDataSinpe | null
  totalFinal: number
  sinpeNombre: string
  sinpeCedula: string
  sinpeTelefono: string
  sinpeImagen: File | null
  setSinpeImagen: Dispatch<SetStateAction<File | null>>
  sinpeImagenErr: string
  setSinpeImagenErr: Dispatch<SetStateAction<string>>
  sinpeUploadEstado: string
  setSinpeUploadEstado: Dispatch<SetStateAction<string>>
  sinpeUploadError: string
  setSinpeUploadError: Dispatch<SetStateAction<string>>
  sinpeInputRef: RefObject<HTMLInputElement | null>
  onSubirComprobante: () => void
  onSinpeWhatsApp: () => void
  rutaPedidos?: string
}

function FilaDato({ etiqueta, valor, mono = false }: { etiqueta: string; valor: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 text-[13px] leading-[normal]">
      <span className="text-hc-n-600">{etiqueta}</span>
      <span className={`text-right font-semibold text-hc-n-900 ${mono ? 'font-mono' : ''}`}>{valor}</span>
    </div>
  )
}

/** Pedido por efectivo: se paga al recibir; no hay comprobante. */
function PedidoEfectivo({ pagoData, totalFinal, onSinpeWhatsApp, token }: Pick<CheckoutSinpePendingProps, 'pagoData' | 'totalFinal' | 'onSinpeWhatsApp'> & { token: string | null }) {
  const { t } = useTranslation()
  return (
    <MarcoPago>
      <div className="flex flex-col gap-[14px] px-4 pb-6 pt-8 leading-[normal]">
        <div className="flex flex-col items-center gap-[10px] text-center">
          <h1 className="font-display text-[19px] font-bold tracking-normal text-hc-n-900">{t('payment.sinpe.efectivoTitulo')}</h1>
          <p className="text-[14px] leading-5 text-hc-n-600">{t('payment.sinpe.efectivoSub')}</p>
        </div>
        <section className="flex flex-col gap-2 rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-4">
          <FilaDato etiqueta={t('payment.sinpe.metodo')} valor={t('payment.sinpe.efectivoMetodo')} />
          {pagoData?.numeroPedido && <FilaDato etiqueta={t('payment.exito.pedido')} valor={pagoData.numeroPedido} mono />}
          <div className="flex items-center justify-between border-t border-hc-n-200 pt-3">
            <span className="text-[14px] font-semibold text-hc-n-600">{t('payment.sinpe.montoExacto')}</span>
            <span className="font-display text-[20px] font-bold text-hc-n-900">{formatPrice(totalFinal)}</span>
          </div>
        </section>
        <p className="rounded-[10px] bg-hc-warning-bg p-3 text-[12px] leading-4 text-hc-warning">{t('payment.sinpe.efectivoAviso')}</p>
        <BotonPago to={token ? '/mis-pedidos' : '/productos'} variante="primario">{token ? t('payment.revision.verPedidos') : t('payment.revision.seguir')}</BotonPago>
        <BotonPago onClick={onSinpeWhatsApp} variante="secundario">{t('payment.sinpe.avisarWhatsapp')}</BotonPago>
      </div>
    </MarcoPago>
  )
}

/**
 * Pedido registrado por SINPE Móvil o efectivo. Con comprobante enviado muestra "Tu pago está siendo
 * revisado" (Figma `45:1640`); antes, los datos de la transferencia y el selector del comprobante, con la
 * misma presentación que el paso de pago (`29:1370`).
 */
export const TEXTO_SINPE_PRONTO = 'Pago SINPE disponible pronto dentro de la pasarela segura'

/**
 * Pedido registrado por SINPE Móvil o efectivo. Sin token de ONVO no se muestran número, titular ni
 * comprobantes: SINPE solo existe dentro de la pasarela (ONVO). Efectivo sigue igual.
 */
export default function CheckoutSinpePending(props: CheckoutSinpePendingProps) {
  const { pagoData, totalFinal, sinpeUploadEstado, onSinpeWhatsApp } = props
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)

  if (pagoData?.proveedor === 'EFECTIVO') {
    return <PedidoEfectivo pagoData={pagoData} totalFinal={totalFinal} onSinpeWhatsApp={onSinpeWhatsApp} token={token} />
  }

  if (sinpeUploadEstado === 'done') {
    return (
      <PagoEnRevision
        titulo={t('payment.revision.titulo')}
        texto={t('payment.revision.textoSinpe')}
        numeroPedido={pagoData?.numeroPedido}
        token={token}
        onWhatsApp={onSinpeWhatsApp}
      />
    )
  }

  return (
    <MarcoPago>
      <div className="flex flex-col gap-[14px] px-4 pb-6 pt-8 leading-[normal]">
        <section className="flex flex-col gap-3 rounded-[14px] border-2 border-hc-blue-600 bg-hc-blue-50 p-[14px]">
          <div className="flex items-center gap-3">
            <IconoFigma src={ICONOS_CHECKOUT.pagoSinpe} size={20} className="text-hc-blue-600" />
            <h1 className="min-w-0 flex-1 font-sans text-[15px] font-semibold tracking-normal text-hc-n-900">{TEXTO_SINPE_PRONTO}</h1>
          </div>
          <div className="flex flex-col gap-2 rounded-[10px] bg-hc-n-0 p-3">
            {pagoData?.numeroPedido && <FilaDato etiqueta={t('payment.sinpe.referencia')} valor={pagoData.numeroPedido} mono />}
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-hc-n-600">{t('payment.sinpe.montoExacto')}</span>
              <span className="font-display text-[17px] font-bold text-hc-n-900">{formatPrice(totalFinal)}</span>
            </div>
          </div>
        </section>
        <Link to={token ? '/mis-pedidos' : '/productos'} className="text-center text-[13px] font-semibold text-hc-n-600">{token ? t('payment.revision.verPedidos') : t('payment.revision.seguir')}</Link>
      </div>
    </MarcoPago>
  )
}
