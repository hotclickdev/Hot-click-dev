import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import type { NegocioPublico } from '@/services/negocioService'
import InsigniaPlan from './InsigniaPlan'
import { inicialesNegocio } from '@/pages/tienda/tiendaHelpers'

/** Avatar del negocio: logo o iniciales sobre b50 (mismo patrón que el chip "CL" de la ficha, Figma 28:839). */
export function AvatarNegocio({ negocio, tamano = 40 }: { negocio: Pick<NegocioPublico, 'nombre' | 'logoUrl'>; tamano?: number }) {
  return negocio.logoUrl ? (
    <img src={negocio.logoUrl} alt="" width={tamano} height={tamano} className="shrink-0 rounded-full border border-hc-n-200 bg-hc-n-0 object-cover" style={{ width: tamano, height: tamano }} loading="lazy" />
  ) : (
    <span aria-hidden="true" className="flex shrink-0 items-center justify-center rounded-full bg-hc-blue-50 font-bold text-hc-blue-600" style={{ width: tamano, height: tamano, fontSize: Math.round(tamano * 0.32) }}>
      {inicialesNegocio(negocio.nombre)}
    </span>
  )
}

/** Fila de un negocio en el buscador y en resultados: avatar, nombre, plan y cantidad de productos. */
export default function FilaNegocio({ negocio, onElegir }: { negocio: NegocioPublico; onElegir: (n: NegocioPublico) => void }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={() => onElegir(negocio)}
      aria-label={t('negocios.verTienda', { nombre: negocio.nombre })}
      className="flex w-full items-center gap-3 py-[6px] text-left"
    >
      <AvatarNegocio negocio={negocio} />
      <span className="flex min-w-0 flex-1 flex-col gap-[3px] leading-[normal]">
        <span className="flex min-w-0 items-center gap-[6px]">
          <span className="truncate text-[14px] font-medium text-hc-n-900">{negocio.nombre}</span>
          <InsigniaPlan plan={negocio.plan} />
        </span>
        <span className="truncate text-[12px] text-hc-n-600">
          {[t('negocios.productos', { count: negocio.productos }), negocio.categoria].filter(Boolean).join(' · ')}
        </span>
      </span>
      <IconoFigma src={ICONOS_COMPRADOR.verTodo} size={16} className="shrink-0 text-hc-n-500" />
    </button>
  )
}
