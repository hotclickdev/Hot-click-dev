import { useTranslation } from 'react-i18next'
import useAuthStore from '@/store/authStore'
import { BotonPago, MarcoPago } from '@/pages/pago/PiezasPago'
import { formatPrice } from '@/utils/format'
import { WHATSAPP } from './checkoutHelpers'

type PagoDataEfectivo = {
  numeroPedido?: string
}

type CheckoutEfectivoPendienteProps = {
  pagoData: PagoDataEfectivo | null
  totalFinal: number
  nombreComprador: string
}

function FilaDato({ etiqueta, valor, mono = false }: { etiqueta: string; valor: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 text-[13px] leading-[normal]">
      <span className="text-hc-n-600">{etiqueta}</span>
      <span className={`text-right font-semibold text-hc-n-900 ${mono ? 'font-mono' : ''}`}>{valor}</span>
    </div>
  )
}

/** Abre WhatsApp con el pedido en efectivo (sin comprobante: se paga al recibir). */
function avisarPedidoEfectivo(numeroPedido: string, nombre: string, total: number) {
  const msg = encodeURIComponent(
    `Hola HotClick\n\n*Pedido en efectivo*\n\n` +
      `Nombre: ${nombre || '(sin nombre)'}\n` +
      (numeroPedido ? `Pedido: ${numeroPedido}\n` : '') +
      `Monto: ${formatPrice(total)}`,
  )
  globalThis.open(`https://wa.me/${WHATSAPP}?text=${msg}`, '_blank')
}

/**
 * Pedido registrado en efectivo: se paga al recibir; no hay comprobante.
 * Tarjeta y SINPE Móvil se cobran en Tilopay y no pasan por esta pantalla.
 */
export default function CheckoutEfectivoPendiente({ pagoData, totalFinal, nombreComprador }: CheckoutEfectivoPendienteProps) {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.token)
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
        <BotonPago onClick={() => avisarPedidoEfectivo(pagoData?.numeroPedido ?? '', nombreComprador, totalFinal)} variante="secundario">{t('payment.sinpe.avisarWhatsapp')}</BotonPago>
      </div>
    </MarcoPago>
  )
}
