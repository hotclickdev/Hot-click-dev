import { useTranslation } from 'react-i18next'
import ProductCard from '@/components/comprador/ProductCard'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import useChatStore from '@/store/chatStore'
import type { Producto } from '@/types/producto'
import { mensajeServiciosHot } from './buscarExplorar'
import { ICONOS_CATALOGO } from './iconosCatalogo'
import { CLASE_GRILLA_TARJETAS } from './catalogoGrilla'

const WHATSAPP_HOTCLICK = '50686667888'
const SUGERIDOS_MAX = 4

/** Búsqueda sin resultados (Figma `27:804`): asistente, "Te lo conseguimos" por WhatsApp y productos para seguir. */
export default function SinResultados({ consulta, sugeridos }: { consulta: string; sugeridos: Producto[] }) {
  const { t } = useTranslation()
  const enlaceWhatsApp = `https://wa.me/${WHATSAPP_HOTCLICK}?text=${encodeURIComponent(mensajeServiciosHot(consulta))}`

  return (
    <div className="flex flex-col lg:py-6">
      <div className="flex flex-col items-center gap-2 pb-2 pt-5 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-hc-n-100 text-hc-n-600">
          <IconoFigma src={ICONOS_CATALOGO.sinResultadosLupa30} size={30} />
        </span>
        <h2 className="font-display text-[18px] font-bold leading-[normal] text-hc-n-900">{t('products.noResultsFor', { q: consulta })}</h2>
        <p className="max-w-sm text-[14px] leading-5 text-hc-n-600">{t('products.noResultsTwoWays')}</p>
      </div>

      <div className="flex flex-col gap-3 pb-2 pt-3">
      <div className="flex flex-col gap-[10px] rounded-[16px] bg-hc-blue-50 p-4">
        <p className="flex items-center gap-[10px] text-[15px] font-semibold text-hc-n-900">
          <IconoFigma src={ICONOS_COMPRADOR.asistente} size={22} className="text-hc-blue-600" />
          {t('search.askAssistant')}
        </p>
        <p className="text-[13px] leading-[18px] text-hc-n-600">{t('products.noResultsAssistant')}</p>
        <button
          type="button"
          onClick={() => useChatStore.getState().open(consulta)}
          className="flex items-center justify-center gap-2 rounded-[12px] bg-hc-blue-600 px-4 py-[13px] text-[14px] font-semibold text-hc-n-0"
        >
          <IconoFigma src={ICONOS_COMPRADOR.asistente} size={18} />
          {t('products.noResultsAssistantCta')}
        </button>
      </div>

      <div className="flex flex-col gap-[10px] rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-4">
        <p className="flex items-center gap-[10px] text-[15px] font-semibold text-hc-n-900">
          <IconoFigma src={ICONOS_COMPRADOR.serviciosHot} size={22} className="text-hc-n-600" />
          {t('products.noResultsWeGetIt')}
        </p>
        <p className="text-[13px] leading-[18px] text-hc-n-600">{t('products.noResultsWeGetItSub')}</p>
        <a
          href={enlaceWhatsApp}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-4 py-[13px] text-[14px] font-semibold text-hc-n-900"
        >
          <IconoFigma src={ICONOS_COMPRADOR.buscarFoto} size={18} />
          {t('products.noResultsWhatsApp')}
        </a>
      </div>
      </div>

      {sugeridos.length > 0 && (
        <section className="flex flex-col gap-3 pb-6 pt-[18px]">
          <h3 className="font-display text-[16px] font-bold leading-[normal] text-hc-n-900">{t('products.meanwhile')}</h3>
          <div className={CLASE_GRILLA_TARJETAS}>
            {sugeridos.slice(0, SUGERIDOS_MAX).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  )
}
