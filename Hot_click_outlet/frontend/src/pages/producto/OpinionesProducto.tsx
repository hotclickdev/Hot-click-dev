import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { testimonioService } from '@/services/testimonioService'
import type { Id } from '@/types/api'
import { ICONOS_PRODUCTO } from './iconosProducto'
import { opinionesDesdeRespuesta, type OpinionProducto } from './productoHelpers'

/**
 * Opiniones de la ficha. Sin reseñas aprobadas muestra el estado vacío del Figma (28:915 móvil,
 * 29:2204 desktop); con reseñas, una lista simple con los datos que entrega la API.
 */
export default function OpinionesProducto({ productoId }: { productoId: Id | undefined }) {
  const { t } = useTranslation()
  const [opiniones, setOpiniones] = useState<OpinionProducto[]>([])

  useEffect(() => {
    if (productoId == null) return
    let cancelado = false
    testimonioService.getResenasProducto(productoId)
      .then((r) => { if (!cancelado) setOpiniones(opinionesDesdeRespuesta(r.data)) })
      .catch(() => { if (!cancelado) setOpiniones([]) })
    return () => { cancelado = true }
  }, [productoId])

  const vacio = opiniones.length === 0

  return (
    <section
      aria-labelledby="opiniones-producto"
      className="flex flex-col gap-[10px] px-4 pb-4 pt-2 leading-[normal] lg:px-0 lg:pb-0"
    >
      <div aria-hidden="true" className="h-px w-full bg-hc-n-200 lg:hidden" />
      <h2 id="opiniones-producto" className={`font-display text-[17px] font-bold leading-[21px] tracking-normal [text-wrap:wrap] text-hc-n-900 ${vacio ? 'lg:sr-only' : 'lg:text-[22px]'}`}>
        {t('product.opinionesTitulo')}
      </h2>

      {vacio ? (
        <div className="flex items-center gap-3 rounded-xl bg-hc-n-50 px-[14px] py-3 lg:rounded-[14px] lg:border lg:border-hc-n-200 lg:bg-hc-n-0 lg:px-[18px] lg:py-4">
          <IconoFigma src={ICONOS_PRODUCTO.opiniones} size={22} className="text-[color:var(--hc-n-400)]" />
          <div className="flex min-w-0 flex-1 flex-col gap-px">
            <p className="text-[13px] font-semibold text-hc-n-900 lg:whitespace-nowrap lg:text-[14px]">
              <span className="hidden lg:inline">{t('product.opinionesTitulo')} · </span>
              {t('product.opinionesVacioTitulo')}
            </p>
            <p className="text-[12px] leading-4 text-hc-n-500 lg:whitespace-nowrap lg:text-[13px] lg:leading-[normal]">
              {t('product.opinionesVacioTexto')}
            </p>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {opiniones.map((o) => (
            <li key={o.id} className="flex flex-col gap-1 rounded-xl border border-hc-n-200 bg-hc-n-0 px-[14px] py-3">
              <p className="text-[13px] font-semibold text-hc-n-900">
                {o.autor}
                {o.calificacion != null && (
                  <span className="ml-2 font-normal text-hc-n-500">{t('product.opinionEstrellas', { count: o.calificacion })}</span>
                )}
              </p>
              <p className="text-[13px] leading-[19px] text-hc-n-600">{o.comentario}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
