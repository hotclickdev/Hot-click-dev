import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import useChatStore from '@/store/chatStore'
import type { Producto } from '@/types/producto'

/**
 * "Preguntale sobre este producto" (Figma 28:891 móvil, 29:2181 desktop): tres preguntas
 * sugeridas que abren el asistente con la consulta ya escrita. El desktop no lleva la línea de ayuda.
 */
export default function PreguntaProducto({ product }: { product: Producto }) {
  const { t } = useTranslation()
  const abrirChat = useChatStore((s) => s.open)
  const nombre = product.titulo || product.nombre
  const preguntas = [t('product.preguntaMedidas'), t('product.preguntaGarantia'), t('product.preguntaColor')]

  return (
    <section aria-labelledby="pregunta-producto" className="px-4 pb-4 pt-2 lg:p-0">
      <div className="flex flex-col gap-[10px] rounded-2xl bg-hc-blue-50 p-[14px] leading-[normal] lg:p-4">
        <div className="flex items-center gap-2">
          <IconoFigma src={ICONOS_COMPRADOR.asistente} size={18} className="text-hc-blue-600" />
          <h2 id="pregunta-producto" className="text-[14px] font-semibold text-hc-blue-600">
            {t('product.preguntaTitulo')}
          </h2>
        </div>
        <p className="text-[12px] leading-4 text-hc-n-600 lg:hidden">{t('product.preguntaAyuda')}</p>
        <div className="flex flex-wrap items-center gap-2">
          {preguntas.map((pregunta) => (
            <button
              key={pregunta}
              type="button"
              onClick={() => abrirChat(t('product.preguntaMensaje', { nombre, pregunta }))}
              className="flex shrink-0 items-center gap-[6px] whitespace-nowrap rounded-full border border-hc-blue-100 bg-hc-n-0 px-[14px] py-2 text-[13px] font-medium text-hc-blue-600 lg:bg-hc-blue-50"
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
