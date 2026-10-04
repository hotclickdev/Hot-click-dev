import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import Spinner from '@/components/ui/Spinner'
import EstadoVacio from '@/components/comprador/estados/EstadoVacio'
import { IconoBuscarNada } from '@/components/comprador/estados/iconosEstado'
import ProductCard from '@/components/comprador/ProductCard'
import { CLASE_GRILLA_TARJETAS } from './catalogoGrilla'
import CategoryRowsView from './CategoryRowsView'
import AsistenteEnGrilla from './AsistenteEnGrilla'
import SinResultados from './SinResultados'
import { Fragment } from 'react'

/** El asistente aparece después de la segunda tarjeta, como en el Figma `26:722`. */
const POSICION_ASISTENTE = 1
import type { Producto } from '@/types/producto'
import type { CatalogCategoria } from './catalogoTipos'



function tokensPaginacion(total: number, actual: number): (number | '…')[] {

  return Array.from({ length: total }, (_, i) => i)

    .filter(i => i === 0 || i === total - 1 || Math.abs(i - actual) <= 1)

    .reduce<(number | '…')[]>((acc, i, idx, arr) => {

      if (idx > 0 && i - arr[idx - 1] > 1) acc.push('…')

      acc.push(i)

      return acc

    }, [])

}



/** Catálogo vacío (derivado de Figma: estados vacíos `45:2198`). */
function CatalogGridEmpty({
  hasFilters,
  onClearFilters,
  needsGustos,
}: {
  hasFilters: boolean
  onClearFilters: () => void
  needsGustos?: boolean
}) {
  const { t } = useTranslation()

  if (needsGustos) {
    return (
      <EstadoVacio
        tono="azul"
        icono={<IconoBuscarNada />}
        titulo={t('products.needsGustosTitle')}
        texto={t('products.needsGustosHint')}
        accion={{ texto: t('products.needsGustosCta'), to: '/descubri' }}
      />
    )
  }

  return (
    <EstadoVacio
      icono={<IconoBuscarNada />}
      titulo={t('products.noResults')}
      texto={t('products.noResultsHint')}
      secundaria={hasFilters ? { texto: t('products.clearFilters'), onClick: onClearFilters } : undefined}
    />
  )
}

const CLASE_PAGINA = 'flex h-9 min-w-9 items-center justify-center rounded-[10px] px-3 text-[13px] font-semibold leading-[normal] disabled:cursor-not-allowed disabled:opacity-30'

function CatalogGridPagination({

  filteredPages, filterViewPage, onPageChange,

}: {

  filteredPages: number

  filterViewPage: number

  onPageChange: (page: number) => void

}) {

  const { t } = useTranslation()

  const irA = (next: number) => {

    onPageChange(next)

    globalThis.scrollTo({ top: 0, behavior: 'smooth' })

  }

  return (

    <nav aria-label={t('products.pagination')} className="flex items-center justify-center gap-1.5 mt-8 flex-wrap">

      <button type="button"

        onClick={() => irA(filterViewPage - 1)}

        disabled={filterViewPage === 0}

        className={`${CLASE_PAGINA} border border-hc-n-200 bg-hc-n-0 text-hc-n-900`}>

        {t('products.prev')}

      </button>

      {tokensPaginacion(filteredPages, filterViewPage).map((i, idx) =>

        i === '…' ? (

          <span key={`gap-${idx}`} className="px-1 text-[13px] text-hc-n-600">…</span>

        ) : (

          <button type="button"

            key={i}

            onClick={() => irA(i)}

            aria-label={t('products.pageN', { n: i + 1 })}

            aria-current={i === filterViewPage ? 'page' : undefined}

            className={`${CLASE_PAGINA} ${i === filterViewPage ? 'bg-hc-blue-600 text-hc-n-0' : 'border border-hc-n-200 bg-hc-n-0 text-hc-n-900'}`}
          >

            {i + 1}

          </button>

        )

      )}

      <button type="button"

        onClick={() => irA(filterViewPage + 1)}

        disabled={filterViewPage >= filteredPages - 1}

        className={`${CLASE_PAGINA} border border-hc-n-200 bg-hc-n-0 text-hc-n-900`}>

        {t('products.next')}

      </button>

    </nav>

  )

}

function CatalogFlatGrid({
  animKey, search, filteredSlice,
}: {
  animKey: string
  search: string
  filteredSlice: Producto[]
}) {
  return (

    <AnimatePresence mode="wait">

      <motion.div

        key={animKey}

        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}

        transition={{ duration: 0.15 }}

      >

        <div className={CLASE_GRILLA_TARJETAS}>

          {filteredSlice.map((product, i) => (
            <Fragment key={product.id}>
              <ProductCard product={product} priority={i < 6} />
              {search && i === POSICION_ASISTENTE && <AsistenteEnGrilla consulta={search} variante="tarjeta" />}
            </Fragment>
          ))}

        </div>

      </motion.div>

    </AnimatePresence>

  )

}



function cuerpoCatalogo({
  shouldRender, loading, filtered, hasFilters, onClearFilters, flatGrid,
  animKey, search, filteredSlice,
  products, categories, onVerMas, page,
  needsGustos,
}: {
  shouldRender: boolean
  loading: boolean
  filtered: Producto[]
  hasFilters: boolean
  onClearFilters: () => void
  flatGrid: boolean
  animKey: string
  search: string
  filteredSlice: Producto[]
  products: Producto[]
  categories: CatalogCategoria[]
  onVerMas: (catId: unknown) => void
  page: number
  needsGustos?: boolean
}) {
  if (!shouldRender) {
    return <div className="h-96 animate-pulse rounded-[14px] bg-hc-n-100" />
  }
  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" variante="figma" /></div>
  if (filtered.length === 0) {
    if (search.trim() && !needsGustos) {
      return <SinResultados consulta={search.trim()} sugeridos={products.filter((p) => p.stock > 0)} />
    }
    return (
      <CatalogGridEmpty
        hasFilters={hasFilters}
        onClearFilters={onClearFilters}
        needsGustos={needsGustos}
      />
    )
  }
  if (flatGrid) {

    return (

      <CatalogFlatGrid

        animKey={animKey} search={search}

        filteredSlice={filteredSlice}

      />

    )

  }

  return (

    <CategoryRowsView

      products={products}

      categories={categories}

      onVerMas={onVerMas}

     

      page={page}

    />

  )

}



export default function CatalogProductGrid({
  gridRef, shouldRender, loading,
  filtered, filteredSlice, filteredPages, filterViewPage, onPageChange,
  hasFilters, onClearFilters, flatGrid, animKey, search,
  products, categories,
  onVerMas, page,
  needsGustos = false,
}: {
  gridRef: RefObject<Element | null>
  shouldRender: boolean
  loading: boolean
  filtered: Producto[]
  filteredSlice: Producto[]
  filteredPages: number
  filterViewPage: number
  onPageChange: (page: number) => void
  hasFilters: boolean
  onClearFilters: () => void
  flatGrid: boolean
  animKey: string
  search: string
  products: Producto[]
  categories: CatalogCategoria[]
  onVerMas: (catId: unknown) => void
  page: number
  needsGustos?: boolean
}) {
  return (
    <div ref={gridRef as RefObject<HTMLDivElement>}>
      {cuerpoCatalogo({
        shouldRender, loading, filtered, hasFilters, onClearFilters, flatGrid,
        animKey, search, filteredSlice,
        products, categories, onVerMas, page,
        needsGustos,
      })}
      {filteredPages > 1 && flatGrid && (
        <CatalogGridPagination
          filteredPages={filteredPages}
          filterViewPage={filterViewPage}
          onPageChange={onPageChange}
        />
      )}
    </div>
  )
}

