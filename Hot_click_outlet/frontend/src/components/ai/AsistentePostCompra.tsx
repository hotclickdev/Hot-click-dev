import { useTranslation } from 'react-i18next'
import useChatStore from '@/store/chatStore'

/** Al terminar la compra: abre el asistente con el contexto del pedido (`PAGO_EXITO:metodo:pedido`). */
export default function AsistentePostCompra({ metodo, numeroPedido }: { metodo?: string; numeroPedido?: string }) {
  const { t } = useTranslation()
  const abrir = useChatStore((s) => s.open)
  return (
    <button
      type="button"
      onClick={() => abrir(t('payment.asistente.mensaje'), `PAGO_EXITO:${metodo ?? ''}:${numeroPedido ?? ''}`)}
      className="mx-auto mt-2 flex min-h-[44px] items-center justify-center rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-4 text-[14px] font-semibold text-hc-blue-600"
    >
      {t('payment.asistente.boton')}
    </button>
  )
}
