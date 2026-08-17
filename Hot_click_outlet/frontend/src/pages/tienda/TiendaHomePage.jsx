import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MagnifyingGlassIcon, ShoppingCartIcon, FunnelIcon } from '@heroicons/react/24/outline'
import tiendaService from '@/services/tiendaService'
import useTiendaStore from '@/store/tiendaStore'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(n)

export default function TiendaHomePage() {
  const { slug } = useParams()
  const { agregarAlCarrito, empresa } = useTiendaStore()

  const [productos,   setProductos]   = useState([])
  const [categorias,  setCategorias]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [page,        setPage]        = useState(0)
  const [totalPages,  setTotalPages]  = useState(1)
  const [busqueda,    setBusqueda]    = useState('')
  const [query,       setQuery]       = useState('')
  const [catActiva,   setCatActiva]   = useState(null)
  const [agregados,   setAgregados]   = useState({})   // { [id]: true } para feedback visual

  const cargarProductos = useCallback((p = 0, q = query, catId = catActiva) => {
    setLoading(true)
    tiendaService.getProductos(slug, { page: p, size: 20, q: q || undefined, categoriaId: catId || undefined })
      .then(res => {
        setProductos(res.content ?? [])
        setTotalPages(res.totalPages ?? 1)
        setPage(p)
      })
      .finally(() => setLoading(false))
  }, [slug, query, catActiva])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    tiendaService.getCategorias(slug).then(setCategorias).catch((err) => { console.error('[TiendaHomePage] categorias', err) })
    cargarProductos(0, '', null)
  }, [slug])  // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleAgregar = (producto) => {
    agregarAlCarrito(producto, 1)
    setAgregados(prev => ({ ...prev, [producto.id]: true }))
    setTimeout(() => setAgregados(prev => ({ ...prev, [producto.id]: false })), 1200)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Tagline */}
      {empresa?.tagline && (
        <p className="text-center text-gray-600 text-sm">{empresa.tagline}</p>
      )}

      {/* Buscador */}
      <form onSubmit={buscar} className="flex gap-2">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            placeholder="Buscar productos..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--t-accent)]"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ backgroundColor: 'var(--t-primary)' }}
        >
          Buscar
        </button>
      </form>

      {/* Filtros de categoría */}
      {categorias.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button type="button"
            onClick={() => filtrarCategoria(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              catActiva === null
                ? 'text-white border-transparent'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
            style={catActiva === null ? { backgroundColor: 'var(--t-secondary)', borderColor: 'var(--t-secondary)' } : {}}
          >
            <FunnelIcon className="inline h-3 w-3 mr-1" />Todos
          </button>
          {categorias.map(c => (
            <button type="button"
              key={c.id}
              onClick={() => filtrarCategoria(c.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                catActiva === c.id
                  ? 'text-white border-transparent'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
              style={catActiva === c.id ? { backgroundColor: 'var(--t-secondary)', borderColor: 'var(--t-secondary)' } : {}}
            >
              {c.nombreCategoria}
            </button>
          ))}
        </div>
      )}

      {/* Grid de productos */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...new Array(8)].map((_, i) => (
            <div key={i} className="rounded-xl bg-gray-100 animate-pulse aspect-[3/4]" />
          ))}
        </div>
      ) : productos.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <ShoppingCartIcon className="mx-auto h-12 w-12 mb-3 opacity-30" />
          <p>No hay productos disponibles.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {productos.map(p => (
            <article key={p.id} className="group bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <Link to={`/tienda/${slug}/producto/${p.id}`} className="block overflow-hidden aspect-square bg-gray-50">
                {p.imagenUrl
                  ? <img src={p.imagenUrl} alt={p.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  : <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">📦</div>
                }
              </Link>
              <div className="p-3 flex flex-col flex-1 gap-2">
                <Link to={`/tienda/${slug}/producto/${p.id}`}>
                  <h3 className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug hover:underline">
                    {p.nombre}
                  </h3>
                </Link>
                <p className="text-base font-bold mt-auto" style={{ color: 'var(--t-primary)' }}>
                  ₡{fmt(p.precio)}
                </p>
                <button type="button"
                  onClick={() => handleAgregar(p)}
                  className="w-full py-1.5 rounded-lg text-white text-xs font-semibold transition-opacity"
                  style={{ backgroundColor: agregados[p.id] ? '#22c55e' : 'var(--t-secondary)' }}
                >
                  {agregados[p.id] ? '✓ Agregado' : 'Agregar'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <button type="button"
            disabled={page === 0}
            onClick={() => cargarProductos(page - 1)}
            className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40"
          >
            ← Anterior
          </button>
          <span className="px-4 py-2 text-sm text-gray-500">
            {page + 1} / {totalPages}
          </span>
          <button type="button"
            disabled={page + 1 >= totalPages}
            onClick={() => cargarProductos(page + 1)}
            className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}
