import { useState, useRef, useCallback, useEffect } from 'react'
import { productService } from '@/services/productService'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)

export default function POSProductSearch({ onAdd }) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const timerRef   = useRef(null)
  const inputRef   = useRef(null)
  // Scanner: detecta entrada rápida de lector de barras (≥4 chars en <200ms)
  const scanBuffer = useRef('')
  const scanTimer  = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const buscar = useCallback((q) => {
    if (!q || q.trim().length < 2) { setResults([]); return }
    setLoading(true)
    productService.buscar(q.trim())
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (e) => {
    const v = e.target.value
    setQuery(v)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => buscar(v), 200)
  }

  const handleKeyDown = (e) => {
    // Enter con 1 resultado → agregar directo
    if (e.key === 'Enter') {
      if (results.length === 1) {
        handleAdd(results[0])
      }
      return
    }

    // Scanner mode: caracteres llegan muy rápido (lector de barras)
    clearTimeout(scanTimer.current)
    scanBuffer.current += e.key.length === 1 ? e.key : ''
    scanTimer.current = setTimeout(() => {
      const code = scanBuffer.current.trim()
      scanBuffer.current = ''
      if (code.length >= 4) {
        // Buscar exacto por barcode/SKU primero, luego texto
        buscar(code)
      }
    }, 80)
  }

  const handleAdd = (producto) => {
    const stock = producto.stockActual ?? producto.stock ?? 0
    if (stock <= 0) return
    onAdd(producto)
    setQuery('')
    setResults([])
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Input búsqueda */}
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
          placeholder="Nombre, SKU o escanea barcode…  (F2)"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
          style={{
            backgroundColor: 'var(--hc-surface)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--hc-text)',
          }}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--hc-accent)', borderTopColor: 'transparent' }}/>
        )}
      </div>

      {/* Grid resultados */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 overflow-y-auto flex-1">
          {results.map(p => {
            const stock   = p.stockActual ?? p.stock ?? 0
            const agotado = stock <= 0
            const bajo    = !agotado && stock <= (p.stockMinimo ?? 5)
            return (
              <button
                key={p.id ?? p.idProducto}
                onClick={() => handleAdd(p)}
                disabled={agotado}
                className="flex flex-col rounded-xl p-3 text-left transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--hc-surface)',
                  border: `1px solid ${agotado ? 'rgba(239,68,68,0.3)' : bajo ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                {p.imagenPrincipalUrl && (
                  <img src={p.imagenPrincipalUrl} alt={p.nombreProducto}
                    className="w-full h-20 object-cover rounded-lg mb-2" />
                )}
                <p className="text-xs font-medium line-clamp-2" style={{ color: 'var(--hc-text)' }}>
                  {p.nombreProducto ?? p.nombre}
                </p>
                {(p.sku || p.barcode) && (
                  <p className="text-[10px] mt-0.5 font-mono" style={{ color: 'var(--hc-muted)' }}>
                    {p.sku ?? p.barcode}
                  </p>
                )}
                <p className="text-sm font-bold mt-1" style={{ color: 'var(--hc-accent)' }}>
                  ₡{fmt(p.precioEfectivo ?? p.precioVenta ?? p.precio)}
                </p>
                <p className={`text-[10px] mt-0.5 font-medium ${agotado ? 'text-red-400' : bajo ? 'text-yellow-400' : ''}`}
                  style={!agotado && !bajo ? { color: 'var(--hc-muted)' } : {}}>
                  {agotado ? 'Agotado' : `Stock: ${stock}`}
                </p>
              </button>
            )
          })}
        </div>
      )}

      {results.length === 0 && query && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>Sin resultados para "{query}"</p>
        </div>
      )}

      {results.length === 0 && !query && (
        <div className="flex-1 flex items-center justify-center opacity-30">
          <div className="text-center space-y-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" strokeWidth={1}
              viewBox="0 0 24 24" style={{ color: 'var(--hc-muted)' }}>
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <path d="M8 21h8M12 17v4"/><path d="M6 7h4M6 10h6M6 13h2"/>
            </svg>
            <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>Buscá o escaneá un producto</p>
          </div>
        </div>
      )}
    </div>
  )
}
