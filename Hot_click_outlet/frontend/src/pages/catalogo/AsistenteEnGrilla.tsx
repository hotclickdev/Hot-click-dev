import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import useChatStore from '@/store/chatStore'

/**
 * Tarjeta del asistente en los resultados. `tarjeta` (móvil, Figma `26:794`) va entre las filas de productos;
 * `linea` (desktop, `30:2028`) va debajo de la grilla, en una sola línea.
 */
export default function AsistenteEnGrilla({ consulta, variante }: { consulta: string; variante: 'tarjeta' | 'linea' }) {
  const { t } = useTranslation()
  const preguntar = () => useChatStore.getState().open(consulta.trim() || null)

  if (variante === 'linea') {
    return (
      <div className="hidden items-center gap-3 rounded-[14px] bg-hc-blue-50 px-[18px] py-[14px] lg:flex">
        <IconoFigma src={ICONOS_COMPRADOR.asistente} size={20} className="shrink-0 text-hc-blue-600" />
        <p className="min-w-0 flex-1 text-[14px] leading-[normal] text-hc-n-900">
          {t('products.assistantTitle')} {t('products.assistantSub')}
        </p>
        <button
          type="button"
          onClick={preguntar}
          className="shrink-0 rounded-[9px] bg-hc-blue-600 px-[14px] py-[9px] text-[13px] font-semibold leading-[normal] text-hc-n-0"
        >
          {t('products.assistantCta')}
        </button>
      </div>
    )
  }

  return (
    <div className="col-span-full flex items-center gap-3 rounded-[14px] bg-hc-blue-50 px-[14px] py-3 lg:hidden">
      <IconoFigma src={ICONOS_COMPRADOR.asistente} size={20} className="shrink-0 text-hc-blue-600" />
      <div className="flex min-w-0 flex-1 flex-col gap-[1px]">
        <p className="text-[14px] font-semibold leading-[normal] text-hc-blue-600">{t('products.assistantTitle')}</p>
        <p className="text-[12px] leading-4 text-hc-n-600">{t('products.assistantSub')}</p>
      </div>
      <button
        type="button"
        onClick={preguntar}
        className="shrink-0 rounded-[9px] bg-hc-blue-600 px-3 py-2 text-[12px] font-semibold leading-[normal] text-hc-n-0"
      >
        {t('products.assistantCta')}
      </button>
    </div>
  )
}
