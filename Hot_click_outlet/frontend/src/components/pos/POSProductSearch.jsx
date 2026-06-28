import { useState, useRef, useCallback, useEffect } from 'react'
import { productService } from '@/services/productService'
import api from '@/services/api'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)

// Paleta de colores para las tarjetas de categoría
const CAT_COLORS = [
  { bg: 'rgba(23,71,168,0.15)',  border: 'rgba(23,71,168,0.35)',  text: '#7aa3ff' },
  { bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.35)', text: '#34d399' },
  { bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.35)', text: '#fbbf24' },
  { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.35)',  text: '#f87171' },
  { bg: 'rgba(100,144,234,0.15)', border: 'rgba(100,144,234,0.35)', text: 'var(--hc-blue-400)' },
  { bg: 'rgba(229,169,61,0.15)', border: 'rgba(229,169,61,0.35)', text: '#E5A93D' },
  { bg: 'rgba(20,184,166,0.15)', border: 'rgba(20,184,166,0.35)', text: '#14b8a6' },
  { bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.35)', text: '#ec4899' },
]

function CatColor(idx) { return CAT_COLORS[idx % CAT_COLORS.length] }

export default function POSProductSearch({ onAdd }) {
  const [categorias, setCategorias]     = useState([])
  const [catSel, setCatSel]             = useState(null)   // { id, nombreCategoria }
  const [productos, setProductos]       = useState([])
  const [loadingCat, setLoadingCat]     = useState(false)
  const [loadingProd, setLoadingProd]   = useState(false)
  const [query, setQuery]               = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const inputRef   = useRef(null)
  const timerRef   = useRef(null)
  const scanBuffer = useRef('')
  const scanTimer  = useRef(null)

  // Cargar categorías con productos en la empresa
  useEffect(() => {
    setLoadingCat(true)
    api.get('/categorias')
      .then(({ data }) => {
        const cats = Array.isArray(data) ? data : (data?.data ?? [])
        setCategorias(cats)
      })
      .catch(() => {})
      .finally(() => setLoadingCat(false))
  }, [])

  const cargarPorCategoria = useCallback((cat) => {
    setCatSel(cat)
    setQuery('')
    setSearchResults([])
    setLoadingProd(true)
    api.get(`/productos/pos/categoria/${cat.id}`)
      .then(({ data }) => {
        const list = data?.data ?? []
        setProductos(Array.isArray(list) ? list : [])
      })
      .catch(() => setProductos([]))
      .finally(() => setLoadingProd(false))
  }, [])

  const buscar = useCallback((q) => {
    if (!q || q.trim().length < 2) { setSearchResults([]); return }
    setSearchLoading(true)
    productService.buscar(q.trim())
      .then(setSearchResults)
      .catch(() => setSearchResults([]))
      .finally(() => setSearchLoading(false))
  }, [])

  const handleChange = (e) => {
    const v = e.target.value
    setQuery(v)
    if (v) setCatSel(null)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => buscar(v), 200)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const lista = query ? searchResults : productos
      if (lista.length === 1) handleAdd(lista[0])
      return
    }
    clearTimeout(scanTimer.current)
    scanBuffer.current += e.key.length === 1 ? e.key : ''
    scanTimer.current = setTimeout(() => {
      const code = scanBuffer.current.trim()
      scanBuffer.current = ''
      if (code.length >= 4) buscar(code)
    }, 80)
  }

  const handleAdd = (producto) => {
    const stock = producto.stockActual ?? producto.stock ?? 0
    if (stock <= 0) return
    onAdd(producto)
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Búsqueda */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--hc-muted)' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Buscar o escanear barcode… (F2)"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
          style={{
            backgroundColor: 'var(--hc-surface)',
            border: `1px solid ${query ? 'rgba(23,71,168,0.4)' : 'rgba(255,255,255,0.08)'}`,
            color: 'var(--hc-text)',
          }}
        />
        {(searchLoading || loadingProd) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--hc-accent)', borderTopColor: 'transparent' }}/>
        )}
      </div>

      {/* Vista: categorías o productos */}
      {query ? (
        /* ── Resultados de búsqueda ──────────────────────── */
        <div className="flex-1 overflow-y-auto">
          {searchResults.length === 0 && !searchLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>Sin resultados para "{query}"</p>
            </div>
          ) : (
            <ProductGrid items={searchResults} onAdd={handleAdd} />
          )}
        </div>
      ) : (
        /* ── Categorías ─────────────────────────────────── */
        <>
          {catSel ? (
            /* ── Productos de la categoría ──────────────── */
            <>
              <div className="flex items-center gap-2">
                <button onClick={() => { setCatSel(null); setProductos([]) }}
                  className="p-1.5 rounded-lg hover:bg-white/8 transition-colors"
                  style={{ color: 'var(--hc-muted)' }}>
                  ← Volver
                </button>
                <span className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
                  {catSel.nombreCategoria}
                </span>
                <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                  ({productos.length} productos)
                </span>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ProductGrid items={productos} onAdd={handleAdd} />
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {loadingCat ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 rounded-full animate-spin"
                    style={{ borderColor: 'var(--hc-accent)', borderTopColor: 'transparent' }}/>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {categorias.map((cat, i) => {
                    const c = CatColor(i)
                    return (
                      <button key={cat.id}
                        onClick={() => cargarPorCategoria(cat)}
                        className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl text-center transition-all hover:scale-[1.03] active:scale-[0.97]"
                        style={{ backgroundColor: c.bg, border: `1.5px solid ${c.border}`, minHeight: 80 }}>
                        <span className="text-2xl">
                          {categoryEmoji(cat.nombreCategoria)}
                        </span>
                        <span className="text-xs font-semibold leading-tight" style={{ color: c.text }}>
                          {cat.nombreCategoria}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ProductGrid({ items, onAdd }) {
  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2 opacity-40">
        <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>Sin productos en esta categoría</p>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {items.map(p => {
        const stock   = p.stockActual ?? p.stock ?? 0
        const agotado = stock <= 0
        const bajo    = stock > 0 && stock <= (p.stockMinimo ?? 5)
        let borderColor = 'rgba(255,255,255,0.07)'
        if (agotado) borderColor = 'rgba(239,68,68,0.2)'
        else if (bajo) borderColor = 'rgba(251,191,36,0.25)'
        let stockCls = 'text-[10px] font-medium'
        if (agotado) stockCls += ' text-red-400'
        else if (bajo) stockCls += ' text-yellow-400'
        const stockStyle = agotado || bajo ? {} : { color: 'var(--hc-muted)' }
        return (
          <button key={p.id ?? p.idProducto}
            onClick={() => agotado || onAdd(p)}
            disabled={agotado}
            className="flex flex-col rounded-2xl overflow-hidden text-left transition-all hover:scale-[1.02] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--hc-surface)',
              border: `1.5px solid ${borderColor}`,
            }}>
            {/* Imagen */}
            <div className="w-full aspect-square overflow-hidden"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
              {p.imagenPrincipalUrl ? (
                <img src={p.imagenPrincipalUrl} alt={p.nombreProducto}
                  className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl opacity-30">
                  📦
                </div>
              )}
            </div>
            {/* Info */}
            <div className="p-2 flex flex-col gap-0.5">
              <p className="text-xs font-medium line-clamp-2 leading-tight"
                style={{ color: 'var(--hc-text)' }}>
                {p.nombreProducto ?? p.nombre}
              </p>
              <p className="text-sm font-bold" style={{ color: 'var(--hc-accent)' }}>
                ₡{fmt(p.precioEfectivo ?? p.precioVenta ?? p.precio)}
              </p>
              <p className={stockCls} style={stockStyle}>
                {agotado ? 'Agotado' : `Stock: ${stock}`}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function categoryEmoji(nombre) {
  const n = (nombre ?? '').toLowerCase()
  if (n.includes('ropa') || n.includes('tela') || n.includes('camis')) return '👕'
  if (n.includes('electro') || n.includes('celul') || n.includes('tecnol')) return '📱'
  if (n.includes('juguete') || n.includes('niño')) return '🧸'
  if (n.includes('deport') || n.includes('sport')) return '⚽'
  if (n.includes('comida') || n.includes('aliment') || n.includes('bebida')) return '🍔'
  if (n.includes('mueble') || n.includes('hogar') || n.includes('casa')) return '🛋️'
  if (n.includes('herram') || n.includes('tool')) return '🔧'
  if (n.includes('cosmetic') || n.includes('belleza') || n.includes('perfum')) return '💄'
  if (n.includes('libro') || n.includes('escolar') || n.includes('papeler')) return '📚'
  if (n.includes('auto') || n.includes('moto') || n.includes('vehic')) return '🚗'
  if (n.includes('mascota') || n.includes('pet')) return '🐾'
  if (n.includes('joya') || n.includes('acceso')) return '💍'
  return '📦'
}
