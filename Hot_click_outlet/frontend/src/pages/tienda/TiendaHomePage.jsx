import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'
import tiendaService from '@/services/tiendaService'
import useTiendaStore from '@/store/tiendaStore'
import { CLASE_INPUT_TIENDA } from './tiendaTheme'
import TiendaProductoCard from './TiendaProductoCard'
import EsqueletoCatalogo from './EsqueletoCatalogo'
import TiendaCatalogoError from './TiendaCatalogoError'
import TiendaCatalogoNuevo from './TiendaCatalogoNuevo'
import TiendaCatalogoBusquedaVacia from './TiendaCatalogoBusquedaVacia'

export default function TiendaHomePage() {
  const { slug } = useParams()
  const { agregarAlCarrito, empresa } = useTiendaStore()
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [busqueda, setBusqueda] = useState('')
  const [query, setQuery] = useState('')
  const [catActiva, setCatActiva] = useState(null)
  const [agregados, setAgregados] = useState({})

  const cargarProductos = useCallback((p = 0, q = query, catId = catActiva) => {
    setLoading(true)
    setLoadError(false)
    tiendaService.getProductos(slug, { page: p, size: 20, q: q || undefined, categoriaId: catId || undefined })
      .then((res) => {
        setProductos(res.content ?? [])
        setTotalPages(res.totalPages ?? 1)
        setPage(p)
      })
      .catch((err) => {
        console.error('[TiendaHomePage] productos', err)
        setLoadError(true)
        setProductos([])
      })
      .finally(() => setLoading(false))
  }, [slug, query, catActiva]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    tiendaService.getCategorias(slug).then(setCategorias).catch((err) => {
      console.error('[TiendaHomePage] categorias', err)
    })
    cargarProductos(0, '', null)
  }, [slug]) // eslint-disable-line react-hooks/exhaustive-deps

  const hayFiltro = Boolean(query || catActiva)
  const catalogoNuevo = !loading && !loadError && productos.length === 0 && !hayFiltro
  const busquedaVacia = !loading && !loadError && productos.length === 0 && hayFiltro
  const nombre = empresa?.nombreComercial ?? slug

  const buscar = (e) => {
    e.preventDefault()
    setQuery(busqueda)
    setCatActiva(null)
    cargarProductos(0, busqueda, null)
  }

  const filtrarCategoria = (catId) => {
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

  const handleAgregar = (producto) => {
    agregarAlCarrito(producto, 1)
    setAgregados((prev) => ({ ...prev, [producto.id]: true }))
    setTimeout(() => setAgregados((prev) => ({ ...prev, [producto.id]: false })), 1200)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {empresa?.tagline && !catalogoNuevo && (
        <p className="text-center text-[var(--t-muted)] text-sm">{empresa.tagline}</p>
      )}

      {!catalogoNuevo && !loadError && (
        <BuscadorTienda busqueda={busqueda} onBusqueda={setBusqueda} onBuscar={buscar} />
      )}

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
        <GrillaProductos
          slug={slug}
          productos={productos}
          agregados={agregados}
          onAgregar={handleAgregar}
        />
      )}

      {!catalogoNuevo && !loadError && (
        <PaginacionTienda page={page} totalPages={totalPages} onCargar={cargarProductos} />
      )}
    </div>
  )
}

function BuscadorTienda({ busqueda, onBusqueda, onBuscar }) {
  return (
    <form onSubmit={onBuscar} className="flex gap-2">
      <div className="relative flex-1">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--t-muted)]" />
        <input
          type="search"
          placeholder="Buscar productos..."
          value={busqueda}
          onChange={(e) => onBusqueda(e.target.value)}
          className={`${CLASE_INPUT_TIENDA} pl-9`}
        />
      </div>
      <button
        type="submit"
        className="px-4 min-h-[44px] rounded-lg text-white text-sm font-medium"
        style={{ backgroundColor: 'var(--t-primary)' }}
      >
        Buscar
      </button>
    </form>
  )
}

function GrillaProductos({ slug, productos, agregados, onAgregar }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {productos.map((p) => (
        <TiendaProductoCard
          key={p.id}
          slug={slug}
          producto={p}
          agregado={!!agregados[p.id]}
          onAgregar={onAgregar}
        />
      ))}
    </div>
  )
}

function FiltrosCategoria({ categorias, catActiva, onFiltrar }) {
  if (categorias.length === 0) return null
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      <ChipCategoria activa={catActiva === null} onClick={() => onFiltrar(null)}>
        <FunnelIcon className="inline h-3 w-3 mr-1" />Todos
      </ChipCategoria>
      {categorias.map((c) => (
        <ChipCategoria key={c.id} activa={catActiva === c.id} onClick={() => onFiltrar(c.id)}>
          {c.nombreCategoria}
        </ChipCategoria>
      ))}
    </div>
  )
}

function ChipCategoria({ activa, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 min-h-[44px] rounded-full text-xs font-medium border transition-colors ${
        activa ? 'text-white border-transparent' : 'bg-[var(--t-surface)] border-[var(--t-border)] text-[var(--t-muted)]'
      }`}
      style={activa ? { backgroundColor: 'var(--t-secondary)', borderColor: 'var(--t-secondary)' } : {}}
    >
      {children}
    </button>
  )
}

function PaginacionTienda({ page, totalPages, onCargar }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex justify-center gap-2 pt-4">
      <button
        type="button"
        disabled={page === 0}
        onClick={() => onCargar(page - 1)}
        className="px-4 py-2 min-h-[44px] rounded-lg border border-[var(--t-border)] text-sm disabled:opacity-40"
      >
        Anterior
      </button>
      <span className="px-4 py-2 text-sm text-[var(--t-muted)]">
        {page + 1} / {totalPages}
      </span>
      <button
        type="button"
        disabled={page + 1 >= totalPages}
        onClick={() => onCargar(page + 1)}
        className="px-4 py-2 min-h-[44px] rounded-lg border border-[var(--t-border)] text-sm disabled:opacity-40"
      >
        Siguiente
      </button>
    </div>
  )
}
