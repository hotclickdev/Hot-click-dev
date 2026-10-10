import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import { AvatarNegocio } from '@/components/comprador/negocios/FilaNegocio'
import InsigniaPlan from '@/components/comprador/negocios/InsigniaPlan'
import { rutaTienda } from '@/components/comprador/negocios/negociosPublicos'
import { useBuscarNegocios } from '@/components/comprador/negocios/useBuscarNegocios'

/**
 * "Negocios que coinciden" arriba de la grilla de resultados (derivado de las tarjetas de Figma 28:839):
 * tarjetas n0 con borde n200 y radio 14; fila desplazable en móvil, hasta tres por fila en desktop.
 * Sin coincidencias no se muestra nada: el estado vacío lo da la grilla.
 */
export default function NegociosEnResultados({ consulta }: { consulta: string }) {
  const { t } = useTranslation()
  const { negocios } = useBuscarNegocios(consulta, 6)
  if (negocios.length === 0) return null

  return (
    <section aria-labelledby="negocios-resultados" className="flex flex-col gap-2 leading-[normal]">
      <div className="flex items-center justify-between gap-3">
        <h2 id="negocios-resultados" className="text-[13px] font-semibold text-hc-n-600">{t('negocios.enResultados')}</h2>
        <Link to="/negocios" className="flex shrink-0 items-center gap-0.5 text-[13px] font-semibold text-hc-blue-600">
          {t('negocios.verTodos')}
          <IconoFigma src={ICONOS_COMPRADOR.verTodo} size={14} />
        </Link>
      </div>
      <ul className="-mx-4 flex gap-[10px] overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
        {negocios.map((n) => (
          <li key={n.slug} className="w-[248px] shrink-0 lg:w-auto">
            <Link
              to={rutaTienda(n)}
              aria-label={t('negocios.verTienda', { nombre: n.nombre })}
              className="flex h-full items-center gap-3 rounded-[14px] border border-hc-n-200 bg-hc-n-0 px-3 py-[10px]"
            >
              <AvatarNegocio negocio={n} tamano={40} />
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="truncate text-[14px] font-semibold text-hc-n-900">{n.nombre}</span>
                <span className="flex min-w-0 items-center gap-[6px]">
                  <InsigniaPlan plan={n.plan} />
                  <span className="truncate text-[12px] text-hc-n-600">{t('negocios.productos', { count: n.productos })}</span>
                </span>
              </span>
              <IconoFigma src={ICONOS_COMPRADOR.verTodo} size={16} className="shrink-0 text-hc-n-500" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
