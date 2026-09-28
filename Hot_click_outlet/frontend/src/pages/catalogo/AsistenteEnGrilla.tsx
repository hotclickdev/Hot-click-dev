import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import useChatStore from '@/store/chatStore'

/** Tarjeta del asistente intercalada en los resultados (Figma `26:722`). */
export default function AsistenteEnGrilla({ consulta }: { consulta: string }) {
  const { t } = useTranslation()
  return (
    <div className="col-span-full flex items-center gap-3 rounded-[14px] bg-hc-blue-50 px-[14px] py-3">
      <IconoFigma src={ICONOS_COMPRADOR.asistente} size={20} className="text-hc-blue-600" />
      <div className="flex min-w-0 flex-1 flex-col gap-[1px]">
        <p className="text-[14px] font-semibold text-hc-blue-600">{t('products.assistantTitle')}</p>
        <p className="text-[12px] leading-4 text-hc-n-600">{t('products.assistantSub')}</p>
      </div>
      <button
        type="button"
        onClick={() => useChatStore.getState().open(consulta.trim() || null)}
        className="shrink-0 rounded-[9px] bg-hc-blue-600 px-3 py-2 text-[12px] font-semibold text-hc-n-0"
      >
        {t('products.assistantCta')}
      </button>
    </div>
  )
}
