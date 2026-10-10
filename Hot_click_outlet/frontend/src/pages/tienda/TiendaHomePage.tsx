import { useState, useEffect, useCallback, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import IconoFigma from '@/components/comprador/IconoFigma'
import tiendaService from '@/services/tiendaService'
import useTiendaStore from '@/store/tiendaStore'
import { ICONOS_TIENDA } from './iconosTienda'
import TiendaPortada from './TiendaPortada'
import TiendaEncabezadoNegocio from './TiendaEncabezadoNegocio'
import TiendaComoComprarle from './TiendaComoComprarle'
import TiendaProductoCard from './TiendaProductoCard'
import { VerPedidoEscritorio } from './TiendaBarraPedido'
import EsqueletoCatalogo from './EsqueletoCatalogo'
import TiendaCatalogoError from './TiendaCatalogoError'
import TiendaCatalogoNuevo from './TiendaCatalogoNuevo'
import TiendaCatalogoBusquedaVacia from './TiendaCatalogoBusquedaVacia'
import { descripcionVisible } from '@/pages/admin/mi-empresa/miEmpresaHelpers'
import type { Producto } from '@/types/producto'
import type { Id } from '@/types/api'

type CategoriaTienda = { id: Id; nombreCategoria?: string }

const TITULO_SECCION = 'font-display text-[17px] font-bold leading-[normal] text-hc-n-900 lg:text-lg lg:leading-[23px]'

/**
 * Perfil del negocio en /tienda/:slug (Figma `29:922` móvil, `29:2308` escritorio, `51:2468` con los
 * colores de la tienda): portada, encabezado, sobre nosotros, catálogo con buscador y categorías, y "Cómo comprarle".
 * Los colores de marca salen de `--t-secondary` (portada, logo) y `--t-accent` (acciones y chip activo).
 */
export default function TiendaHomePage() {
  const { t } = useTranslation()
  const { slug } = useParams()
  const { agregarAlCarrito, empresa, totalItems, totalImporte } = useTiendaStore()
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<CategoriaTienda[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProductos, setTotalProductos] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [query, setQuery] = useState('')
  const [catActiva, setCatActiva] = useState<Id | null>(null)
  const [agregados, setAgregados] = useState<Record<string, boolean>>({})

  const cargarProductos = useCallback((p = 0, q = query, catId: Id | null = catActiva) => {
    setLoading(true)
    setLoadError(false)
    tiendaService.getProductos(slug as string, { page: p, size: 20, q: q || undefined, categoriaId: catId || undefined })
      .then((res) => {
        setProductos(res.content ?? [])
        setTotalPages(res.totalPages ?? 1)
        setTotalProductos((res as { totalElements?: number }).totalElements ?? res.content?.length ?? 0)
        setPage(p)
      })
      .catch((err: unknown) => {
        console.error('[TiendaHomePage] productos', err)
        setLoadError(true)
        setProductos([])
      })
      .finally(() => setLoading(false))
  }, [slug, query, catActiva]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    tiendaService.getCategorias(slug as string).then((data: unknown) => setCategorias(data as CategoriaTienda[])).catch((err: unknown) => {
      console.error('[TiendaHomePage] categorias', err)
    })
    cargarProductos(0, '', null)
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  const hayFiltro = Boolean(query || catActiva)
  const catalogoNuevo = !loading && !loadError && productos.length === 0 && !hayFiltro
  const busquedaVacia = !loading && !loadError && productos.length === 0 && hayFiltro
  const nombre = (empresa?.nombreComercial ?? slug) as string
  const sobreNosotros = descripcionVisible(empresa?.descripcion ?? '')

  const buscar = (e: FormEvent) => {
    e.preventDefault()
    setQuery(busqueda)
    setCatActiva(null)
    cargarProductos(0, busqueda, null)
  }

  const filtrarCategoria = (catId: Id | null) => {
    const nueva = catId === catActiva ? null : catId
    setCatActiva(nueva)
    setQuery('')
    setBusqueda('')
    cargarProductos(0, '', nueva)
  }

  const limpiarFiltros = () => {
    setQuery('')
    setBusqueda('')
    setCatActiva(null)
    cargarProductos(0, '', null)
  }

  const handleAgregar = (producto: Producto) => {
    agregarAlCarrito(producto, 1)
    setAgregados((prev) => ({ ...prev, [String(producto.id)]: true }))
    setTimeout(() => setAgregados((prev) => ({ ...prev, [String(producto.id)]: false })), 1200)
  }

  return (
    <div>
      <TiendaPortada nombre={nombre} portadaUrl={empresa?.ogImagenUrl} />
      <TiendaEncabezadoNegocio empresa={empresa} nombre={nombre} />

      <div className="mx-auto grid max-w-[1232px] grid-cols-1 px-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-10 lg:pb-14 lg:pt-8">
        {sobreNosotros && (
          <section className="flex flex-col gap-2 pb-[6px] pt-[18px] lg:col-start-1 lg:row-start-1 lg:gap-5 lg:pb-0 lg:pt-0">
            <h2 className={TITULO_SECCION}>{t('tienda.sobreNosotros')}</h2>
            <p className="text-sm leading-[21px] text-hc-n-600 wrap-anywhere">{sobreNosotros}</p>
          </section>
        )}

        <section className="flex flex-col gap-3 pb-[6px] pt-5 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:gap-4 lg:pb-0 lg:pt-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-3 lg:justify-start lg:gap-4">
              <h2 className="font-display text-[17px] font-bold leading-[normal] text-hc-n-900 lg:text-[22px] lg:leading-7">{catalogoNuevo ? t('tienda.productos') : t('tienda.productosTotal', { total: totalProductos })}</h2>
              <VerPedidoEscritorio slug={slug as string} cantidad={totalItems()} total={totalImporte()} />
            </div>
            {!catalogoNuevo && !loadError && (
              <BuscadorTienda nombre={nombre} busqueda={busqueda} onBusqueda={setBusqueda} onBuscar={buscar} />
            )}
          </div>

          {!catalogoNuevo && !loadError && (
            <FiltrosCategoria categorias={categorias} catActiva={catActiva} onFiltrar={filtrarCategoria} />
          )}

          {loading && <EsqueletoCatalogo />}
          {!loading && loadError && (
            <TiendaCatalogoError onRetry={() => cargarProductos(page, query, catActiva)} />
          )}
          {catalogoNuevo && <TiendaCatalogoNuevo nombre={nombre} />}
          {busquedaVacia && <TiendaCatalogoBusquedaVacia onLimpiar={limpiarFiltros} />}
          {!loading && !loadError && productos.length > 0 && (
            <div className="grid grid-cols-[repeat(2,minmax(0,167px))] justify-between gap-y-4 sm:grid-cols-[repeat(auto-fill,167px)] sm:justify-start sm:gap-x-4 sm:gap-y-5">
              {productos.map((p) => (
                <TiendaProductoCard
                  key={p.id}
                  slug={slug as string}
                  producto={p}
                  vendedor={nombre}
                  agregado={!!agregados[String(p.id)]}
                  onAgregar={handleAgregar}
                />
              ))}
            </div>
          )}

          {!catalogoNuevo && !loadError && (
            <PaginacionTienda page={page} totalPages={totalPages} onCargar={cargarProductos} />
          )}
        </section>

        <section className="flex flex-col gap-3 pb-7 pt-[22px] lg:col-start-1 lg:row-start-2 lg:gap-5 lg:self-start lg:pb-0 lg:pt-5">
          <h2 className={TITULO_SECCION}>{t('tienda.comoComprarle')}</h2>
          <TiendaComoComprarle empresa={empresa} />
        </section>
      </div>
    </div>
  )
}

function BuscadorTienda({
  nombre, busqueda, onBusqueda, onBuscar,
}: {
  nombre: string
  busqueda: string
  onBusqueda: (v: string) => void
  onBuscar: (e: FormEvent) => void
}) {
  const { t } = useTranslation()
  return (
    <form
      onSubmit={onBuscar}
      role="search"
      className="flex items-center gap-2 rounded-[12px] border border-[var(--t-border)] bg-[var(--t-surface)] px-3 py-[11px] lg:h-11 lg:w-[320px] lg:px-[14px]"
    >
      <IconoFigma src={ICONOS_TIENDA.buscar} size={17} className="text-hc-n-500" />
      <input
        type="search"
        value={busqueda}
        onChange={(e) => onBusqueda(e.target.value)}
        placeholder={t('tienda.buscarEn', { nombre })}
        aria-label={t('tienda.buscarEn', { nombre })}
        enterKeyHint="search"
        className="hc-input-libre h-4 min-w-0 flex-1 bg-transparent p-0 text-sm leading-4 text-hc-n-900 outline-none placeholder:text-hc-n-500"
      />
    </form>
  )
}

function FiltrosCategoria({
  categorias, catActiva, onFiltrar,
}: {
  categorias: CategoriaTienda[]
  catActiva: Id | null
  onFiltrar: (id: Id | null) => void
}) {
  const { t } = useTranslation()
  if (categorias.length === 0) return null
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none lg:mx-0 lg:px-0">
      <ChipCategoria activa={catActiva === null} onClick={() => onFiltrar(null)}>{t('tienda.todo')}</ChipCategoria>
      {categorias.map((c) => (
        <ChipCategoria key={c.id} activa={catActiva === c.id} onClick={() => onFiltrar(c.id)}>
          {c.nombreCategoria}
        </ChipCategoria>
      ))}
    </div>
  )
}

function ChipCategoria({ activa, onClick, children }: { activa: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={`shrink-0 whitespace-nowrap rounded-full border px-[14px] py-2 text-[13px] font-medium leading-[normal] ${
        activa ? 'text-white' : 'border-[var(--t-border)] bg-[var(--t-surface)] text-hc-n-900'
      }`}
      style={activa ? { backgroundColor: 'var(--t-accent)', borderColor: 'var(--t-accent)' } : undefined}
    >
      {children}
    </button>
  )
}

function PaginacionTienda({
  page, totalPages, onCargar,
}: {
  page: number
  totalPages: number
  onCargar: (p: number) => void
}) {
  const { t } = useTranslation()
  if (totalPages <= 1) return null
  return (
    <div className="flex justify-center gap-2 pt-4">
      <button
        type="button"
        disabled={page === 0}
        onClick={() => onCargar(page - 1)}
        className="min-h-11 rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-4 py-[10px] text-[13px] font-semibold text-hc-n-900 disabled:opacity-40"
      >
        {t('common.previous')}
      </button>
      <span className="px-4 py-2 text-sm text-[var(--t-muted)]">
        {page + 1} / {totalPages}
      </span>
      <button
        type="button"
        disabled={page + 1 >= totalPages}
        onClick={() => onCargar(page + 1)}
        className="min-h-11 rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-4 py-[10px] text-[13px] font-semibold text-hc-n-900 disabled:opacity-40"
      >
        {t('common.next')}
      </button>
    </div>
  )
}
