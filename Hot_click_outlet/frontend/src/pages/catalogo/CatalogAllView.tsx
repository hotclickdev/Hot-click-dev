import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { RefObject } from 'react'
import Chip from '@/components/comprador/Chip'
import { RetryBanner } from '@/components/ui/RetryBanner'
import { RUTA_BUSCAR_FOTO } from '@/pages/buscar/rutasBuscar'
import CatalogProductGrid from './CatalogProductGrid'
import EncabezadoCatalogoMovil from './EncabezadoCatalogoMovil'
import EntendiChips from './EntendiChips'
import FiltrosPanel from './FiltrosPanel'
import HojaFiltros from './HojaFiltros'
import { topeDeRango } from './rangoPrecioHelpers'
import FiltrosRapidos from './FiltrosRapidos'
import OrdenarResultados from './OrdenarResultados'
import AsistenteEnGrilla from './AsistenteEnGrilla'
import { buildCategoryTree } from './catalogoHelpers'
import { busquedasRelacionadas, chipsEntendi, tiendasDelCatalogo, type ChipEntendi } from './buscarExplorar'
import type { CatalogoPageModel } from './useCatalogoPage'

/**
 * Catálogo con resultados: búsqueda (Figma `26:722`, `30:1824`) o categoría abierta (`43:1530`).
 * Móvil: encabezado propio, filtros rápidos y barra de resultados. Desktop: título, "Entendí", columna de filtros y grilla.
 */
export default function CatalogAllView({
  catalogo, productGridRef, shouldRenderGrid,
}: {
  catalogo: CatalogoPageModel
  productGridRef: RefObject<Element | null>
  shouldRenderGrid: boolean
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    products, categories, marcas, loading, error, retry, page,
    search, setSearch, category, setCategory, marcasFilter, toggleMarca, sort, setSort,
    filterStock, setFilterStock, priceMin, setPriceMin, priceMax, setPriceMax,
    filterViewPage, setFilterViewPage, clearFilters, filtered,
    categoryTotalCount, hasFilters, flatGrid,
    filteredPages, filteredSlice, activeCatName, gridAnimKey,
    tieneGustos, extras, setExtras, filtrosAbiertos, setFiltrosAbiertos,
  } = catalogo

  const consulta = search.trim()
  const modoBusqueda = consulta !== ''
  const sinResultados = modoBusqueda && !loading && !error && filtered.length === 0 && sort !== 'para_vos'
  const tituloCategoria = activeCatName ?? t('products.allProducts')
  const titulo = modoBusqueda ? t('products.resultsTitle', { q: consulta }) : tituloCategoria

  const tiendas = useMemo(() => tiendasDelCatalogo(products), [products])
  const precioTope = useMemo(() => topeDeRango(products.map((p) => p.precio ?? 0)), [products])
  const hayRetiro = useMemo(() => products.some((p) => p.bodegaPermiteRetiro === true), [products])
  const marcasActivas = useMemo(
    () => marcas.filter((m) => marcasFilter.has(String(m.id))).map((m) => ({ id: String(m.id), nombre: m.nombreMarca ?? String(m.id) })),
    [marcas, marcasFilter],
  )
  const chips = chipsEntendi({
    search, categoriaNombre: activeCatName ?? null, priceMin, priceMax, extra: extras,
    marcas: marcasActivas, soloConStock: filterStock === 'ok',
  })
  const relacionadas = modoBusqueda && filtered.length > 0 ? busquedasRelacionadas(consulta, filtered) : []

  const arbol = useMemo(() => buildCategoryTree(categories), [categories])
  const nodoPadre = category
    ? arbol.find((r) => String(r.id) === category || r.children?.some((c) => String(c.id) === category))
    : undefined
  const subcategorias = (nodoPadre?.children?.length ?? 0) > 0 ? nodoPadre?.children ?? [] : []

  const quitarChip = (chip: ChipEntendi) => {
    if (chip.tipo === 'busqueda') setSearch('')
    else if (chip.tipo === 'categoria') setCategory('')
    else if (chip.tipo === 'precio') { setPriceMin(''); setPriceMax('') }
    else if (chip.tipo === 'tienda') setExtras((prev) => ({ ...prev, tiendas: new Set([...prev.tiendas].filter((x) => x !== chip.valor)) }))
    else if (chip.tipo === 'pedido') setExtras((prev) => ({ ...prev, hechoAPedido: false }))
    else if (chip.tipo === 'marca') toggleMarca(chip.valor)
    else if (chip.tipo === 'stock') setFilterStock('')
    else setExtras((prev) => ({ ...prev, retiroEnTienda: false }))
  }

  const volver = () => {
    const historial = globalThis.history?.state as { idx?: number } | null
    if ((historial?.idx ?? 0) > 0) navigate(-1)
    else navigate('/')
  }

  const propsFiltros = {
    priceMin, priceMax, setPriceMin, setPriceMax,
    categories, categoryTotalCount, category, setCategory,
    tiendas, extras, setExtras,
    soloConStock: filterStock === 'ok', setSoloConStock: (v: boolean) => setFilterStock(v ? 'ok' : ''),
    hayRetiro, precioTope,
  }

  const textoCantidad = modoBusqueda
    ? t('products.countForQuery', { count: filtered.length, q: consulta })
    : t('products.countProducts', { count: filtered.length })

  return (
    <>
      <EncabezadoCatalogoMovil
        modo={modoBusqueda ? 'busqueda' : 'categoria'}
        titulo={tituloCategoria}
        search={search}
        setSearch={setSearch}
        onAtras={volver}
        onBuscarConFoto={() => navigate(RUTA_BUSCAR_FOTO)}
        sinResultados={sinResultados}
      >
        {modoBusqueda && (
          <EntendiChips
            chips={chips}
            onQuitar={quitarChip}
            onAbrirFiltros={() => setFiltrosAbiertos(true)}
            onLimpiar={clearFilters}
          />
        )}
      </EncabezadoCatalogoMovil>

      {!modoBusqueda && (
        <FiltrosRapidos
          subcategorias={subcategorias}
          categoriaPadre={nodoPadre ? String(nodoPadre.id) : undefined}
          categoria={category}
          setCategory={setCategory}
          extras={extras}
          setExtras={setExtras}
          priceMin={priceMin}
          priceMax={priceMax}
          setPriceMin={setPriceMin}
          setPriceMax={setPriceMax}
          tiendas={tiendas}
        />
      )}

      <div className="mx-auto flex w-full max-w-[1440px] flex-col lg:gap-[18px] lg:px-8 lg:pb-14 lg:pt-6 xl:px-[120px]">
        <div className="hidden items-center justify-between lg:flex">
          <div className="flex flex-col gap-[2px]">
            <h1 className="font-display text-[26px] font-bold leading-[normal] text-hc-n-900">{titulo}</h1>
            <p className="text-[14px] leading-[normal] text-hc-n-600">{t('products.countProducts', { count: filtered.length })}</p>
          </div>
          <OrdenarResultados sort={sort} setSort={setSort} variante="escritorio" />
        </div>

        <div className="hidden lg:block">
          <EntendiChips chips={chips} onQuitar={quitarChip} onAbrirFiltros={() => setFiltrosAbiertos(true)} onLimpiar={clearFilters} />
        </div>

        <div className="lg:flex lg:items-start lg:gap-8">
          <aside className="hidden shrink-0 lg:block">
            <FiltrosPanel {...propsFiltros} variante="columna" />
          </aside>

          <div className="min-w-0 flex-1">
            <div className={`items-center justify-between px-4 pb-1 lg:hidden ${sinResultados ? 'hidden' : 'flex'} ${modoBusqueda ? 'pt-3.5' : 'pt-3'}`}>
              <p className="text-[14px] font-semibold leading-[normal] text-hc-n-900">{textoCantidad}</p>
              <OrdenarResultados sort={sort} setSort={setSort} variante="movil" />
            </div>

            <div className="flex flex-col gap-3 px-4 pb-1 pt-2 lg:gap-5 lg:p-0">
              {error ? (
                <RetryBanner message="No pudimos cargar los productos. Verificá tu conexión." onRetry={retry} />
              ) : (
                <CatalogProductGrid
                  gridRef={productGridRef}
                  shouldRender={shouldRenderGrid}
                  loading={loading}
                  filtered={filtered}
                  filteredSlice={filteredSlice}
                  filteredPages={filteredPages}
                  filterViewPage={filterViewPage}
                  onPageChange={setFilterViewPage}
                  hasFilters={hasFilters}
                  onClearFilters={clearFilters}
                  flatGrid={flatGrid}
                  animKey={gridAnimKey}
                  search={search}
                  products={products}
                  categories={categories}
                  onVerMas={(catId) => { setCategory(String(catId)); globalThis.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  page={page}
                  needsGustos={sort === 'para_vos' && !tieneGustos}
                />
              )}

              {modoBusqueda && filtered.length > 0 && <AsistenteEnGrilla consulta={consulta} variante="linea" />}

              {relacionadas.length > 0 && (
                <section className="flex flex-col gap-[10px] pb-6 pt-[18px] lg:flex-row lg:flex-wrap lg:items-center lg:gap-2 lg:p-0">
                  <h2 className="text-[13px] font-semibold leading-[normal] text-hc-n-600 lg:font-normal">
                    {t('products.relatedSearches')}<span className="hidden lg:inline">:</span>
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {relacionadas.map((r) => <Chip key={r} texto={r} onClick={() => setSearch(r)} />)}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </div>

      <HojaFiltros
        abierta={filtrosAbiertos}
        onCerrar={() => setFiltrosAbiertos(false)}
        onLimpiar={clearFilters}
        cantidad={filtered.length}
      >
        <FiltrosPanel {...propsFiltros} variante="hoja" />
      </HojaFiltros>
    </>
  )
}
