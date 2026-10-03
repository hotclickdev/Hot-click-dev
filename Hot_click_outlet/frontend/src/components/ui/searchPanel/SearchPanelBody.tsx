import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import { fotoProducto, nombreVendedor } from '@/components/comprador/productCardHelpers'
import FilaNegocio from '@/components/comprador/negocios/FilaNegocio'
import { highlight } from './searchPanelHighlight'
import type { SearchPanelModel } from './useSearchPanel'

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h2 className="text-[11px] font-semibold uppercase leading-[13px] text-hc-n-600">{titulo}</h2>
      {children}
    </section>
  )
}

/** Resultados en vivo del buscador híbrido (Figma `8:163`). */
export function SearchPanelBody({
  query, loading, recent, productResults, negocioResults, cargandoNegocios, totalResultados, sugerencias,
  selectProduct, selectNegocio, viewAll, clearRecent, setQuery,
  preguntarAsistente, buscarConFoto, elegirSugerencia,
}: SearchPanelModel) {
  const { t } = useTranslation()
  const consulta = query.trim()

  return (
    <div className="flex flex-1 flex-col gap-[18px] overflow-y-auto px-4 pb-4 pt-1">
      {consulta && (
        <button
          type="button"
          onClick={preguntarAsistente}
          className="flex items-center gap-3 rounded-[14px] border border-hc-blue-100 bg-hc-blue-50 px-[14px] py-[14px] text-left"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-hc-blue-600 text-hc-n-0">
            <IconoFigma src={ICONOS_COMPRADOR.asistente} size={18} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
            <span className="text-[14px] font-semibold text-hc-blue-600">{t('search.askAssistant')}</span>
            <span className="text-[12px] leading-4 text-hc-n-600">{t('search.askAssistantSub', { q: consulta })}</span>
          </span>
          <IconoFigma src={ICONOS_COMPRADOR.verTodo} size={18} className="text-hc-blue-600" />
        </button>
      )}

      {!consulta && recent.length > 0 && (
        <Bloque titulo={t('search.recent')}>
          <div className="flex flex-wrap gap-2 pt-1">
            {recent.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setQuery(s)}
                className="rounded-full border border-hc-n-200 bg-hc-n-0 px-[14px] py-2 text-[13px] font-medium text-hc-n-900"
              >
                {s}
              </button>
            ))}
          </div>
          <button type="button" onClick={clearRecent} className="self-start pt-1 text-[12px] font-semibold text-hc-blue-600">
            {t('search.clearRecent')}
          </button>
        </Bloque>
      )}

      {!consulta && recent.length === 0 && !loading && (
        <p className="py-8 text-center text-[14px] text-hc-n-600">{t('search.typeToSearch')}</p>
      )}

      {consulta && sugerencias.length > 0 && (
        <Bloque titulo={t('search.suggestions')}>
          {sugerencias.map((s) => (
            <button key={s} type="button" onClick={() => elegirSugerencia(s)} className="flex items-center gap-3 py-[9px] text-left text-[14px] text-hc-n-900">
              <IconoFigma src={ICONOS_COMPRADOR.buscador} size={16} className="text-hc-n-500" />
              <span className="font-normal">{highlight(s, consulta)}</span>
            </button>
          ))}
        </Bloque>
      )}

      {consulta && negocioResults.length > 0 && (
        <Bloque titulo={t('negocios.seccion')}>
          {negocioResults.map((negocio) => (
            <FilaNegocio key={negocio.slug} negocio={negocio} onElegir={selectNegocio} />
          ))}
        </Bloque>
      )}

      {consulta && productResults.length > 0 && (
        <Bloque titulo={t('search.productsSection')}>
          {productResults.map((product) => {
            const foto = fotoProducto(product)
            return (
              <button key={product.id} type="button" onClick={() => selectProduct(product)} className="flex items-center gap-3 py-[6px] text-left">
                <span className="size-[52px] shrink-0 overflow-hidden rounded-[10px] bg-hc-n-100">
                  {foto && <img src={foto} alt="" className="size-full object-cover" loading="lazy" />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-[1px]">
                  <span className="truncate text-[14px] font-medium text-hc-n-900">{product.nombre}</span>
                  <span className="truncate text-[12px] text-hc-n-600">{nombreVendedor(product)}</span>
                </span>
                <span className="shrink-0 font-display text-[14px] font-bold text-hc-n-900">{formatPrice(product.precio)}</span>
              </button>
            )
          })}
          <button type="button" onClick={viewAll} className="flex items-center gap-1 self-start pt-1 text-[13px] font-semibold leading-[15px] text-hc-blue-600">
            {t('search.viewAllCount', { count: totalResultados, q: consulta })}
            <IconoFigma src={ICONOS_COMPRADOR.verTodo} size={14} />
          </button>
        </Bloque>
      )}

      {consulta && productResults.length === 0 && negocioResults.length === 0 && !loading && !cargandoNegocios && (
        <p className="text-[13px] text-hc-n-600">
          {t('negocios.sinResultados', { q: consulta })} {t('search.noResultsSub')}
        </p>
      )}

      <button
        type="button"
        onClick={buscarConFoto}
        className="flex items-center gap-3 rounded-[12px] border border-dashed border-hc-n-200 bg-hc-n-50 px-[14px] py-3 text-left"
      >
        <IconoFigma src={ICONOS_COMPRADOR.buscarFoto} size={20} className="text-hc-blue-600" />
        <span className="flex flex-col gap-[1px]">
          <span className="text-[14px] font-semibold leading-4 text-hc-n-900">{t('search.photoSearch')}</span>
          <span className="whitespace-nowrap text-[12px] leading-[14px] text-hc-n-600">{t('search.photoSearchSub')}</span>
        </span>
      </button>
    </div>
  )
}
