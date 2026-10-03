import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import useChatStore from '@/store/chatStore'
import { contextoPagoFallo } from './pagoHelpers'

/**
 * Ayuda del asistente en pago fallido o cancelado: mismo patrón que "Preguntale sobre este producto"
 * (Figma 28:891). Tres preguntas que abren el chat con la consulta escrita y el número de pedido.
 * El asistente no ve datos de la tarjeta: solo recibe el contexto PAGO_FALLO y el texto de la pregunta.
 */
export default function AyudaPagoAsistente({ numeroPedido, motivo }: { numeroPedido?: string | undefined; motivo?: string | undefined }) {
  const { t } = useTranslation()
  const abrirChat = useChatStore((s) => s.open)
  const preguntas = [t('payment.fallo.asistentePregunta1'), t('payment.fallo.asistentePregunta2'), t('payment.fallo.asistentePregunta3')]
  const mensaje = (pregunta: string) => (numeroPedido ? t('payment.fallo.asistenteMensaje', { pregunta, pedido: numeroPedido }) : pregunta)

  return (
    <section aria-labelledby="ayuda-pago" className="px-4 pb-6">
      <div className="flex flex-col gap-[10px] rounded-[16px] bg-hc-blue-50 p-[14px] leading-[normal]">
        <div className="flex items-center gap-2">
          <IconoFigma src={ICONOS_COMPRADOR.asistente} size={18} className="text-hc-blue-600" />
          <h2 id="ayuda-pago" className="font-sans text-[14px] font-semibold tracking-normal text-hc-blue-600">
            {t('payment.fallo.asistenteTitulo')}
          </h2>
        </div>
        <p className="text-[12px] leading-4 text-hc-n-600">{t('payment.fallo.asistenteAyuda')}</p>
        <div className="flex flex-wrap items-center gap-2">
          {preguntas.map((pregunta) => (
            <button
              key={pregunta}
              type="button"
              onClick={() => abrirChat(mensaje(pregunta), contextoPagoFallo(motivo))}
              className="flex shrink-0 items-center gap-[6px] whitespace-nowrap rounded-full border border-hc-blue-100 bg-hc-n-0 px-[14px] py-2 text-[13px] font-medium text-hc-blue-600"
            >
              <IconoFigma src={ICONOS_COMPRADOR.chipAsistente} size={14} />
              {pregunta}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
