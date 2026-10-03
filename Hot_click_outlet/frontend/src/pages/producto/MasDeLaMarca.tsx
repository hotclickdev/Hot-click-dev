import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ProductCard from '@/components/comprador/ProductCard'
import type { Producto } from '@/types/producto'
import { inicialesMarca, type FuenteMasDeLaMarca } from './masDeLaMarcaHelpers'

const MAXIMO = 5

function Flecha({ size, strokeWidth }: { size: number; strokeWidth: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} aria-hidden="true">
      <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * "Más de {marca}" bajo "También te puede gustar": mismo carrusel sangrado (Figma 28:925, desktop 29:2211)
 * con chip de iniciales, "Ver todos" y una tarjeta final "Ver los N". Sin otros productos no se dibuja.
 */
export default function MasDeLaMarca({ fuente, productos, total }: { fuente: FuenteMasDeLaMarca | null; productos: Producto[]; total: number }) {
  const { t } = useTranslation()
  if (!fuente || productos.length === 0) return null
  const visibles = productos.slice(0, MAXIMO)
  const hayMas = total > visibles.length

  return (
    <section aria-labelledby="mas-de-la-marca" className="flex flex-col gap-3 pb-[27px] pt-2 leading-[normal] lg:gap-5 lg:pb-14 lg:pt-5">
      <div className="flex items-center justify-between gap-3 px-4 lg:px-0">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-hc-blue-50 text-[10px] font-bold text-hc-blue-600 lg:size-8 lg:text-[12px]">
            {inicialesMarca(fuente.nombre)}
          </span>
          <h2 id="mas-de-la-marca" className="truncate font-display text-[17px] font-bold leading-[21px] tracking-normal text-hc-n-900 lg:text-[22px] lg:leading-7">
            {t('product.moreFromBrand', { brand: fuente.nombre })}
          </h2>
        </div>
        <Link to={fuente.verTodos} className="flex shrink-0 items-center gap-0.5 text-[13px] font-semibold text-hc-blue-600">
          {t('product.verTodosMarca')}
          <Flecha size={14} strokeWidth={2.2} />
        </Link>
      </div>
      <div className="scrollbar-hide flex gap-3 overflow-x-auto pl-4 pr-4 lg:gap-[39.6px] lg:px-0">
        {visibles.map((p) => <ProductCard key={p.id} product={p} className="w-[167px] shrink-0" />)}
        {hayMas && (
          <Link
            to={fuente.verTodos}
            className="flex w-[120px] shrink-0 flex-col items-center justify-center gap-2 rounded-[14px] border border-hc-n-200 bg-hc-n-50 p-3 text-center lg:w-[167px]"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-hc-n-0 text-hc-blue-600 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
              <Flecha size={18} strokeWidth={2.2} />
            </span>
            <span className="text-[13px] font-semibold text-hc-n-900">{t('product.verLosN', { count: total })}</span>
            <span className="text-[11px] text-hc-n-600">{t('product.productosDeMarca', { brand: fuente.nombre })}</span>
          </Link>
        )}
      </div>
    </section>
  )
}
