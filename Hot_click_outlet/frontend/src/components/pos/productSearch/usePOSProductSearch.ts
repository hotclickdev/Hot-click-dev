import { useState, useRef, useCallback, useEffect } from 'react'
import { productService } from '@/services/productService'
import api from '@/services/api'
import { listaDesdeRespuesta, type CategoriaPos, type ProductoPos } from './posProductSearchHelpers'

/** Estado y handlers del buscador POS — bit-idéntico al original. */
export function usePOSProductSearch() {
  const [categorias, setCategorias]     = useState<CategoriaPos[]>([])
  const [catSel, setCatSel]             = useState<CategoriaPos | null>(null)
  const [productos, setProductos]       = useState<ProductoPos[]>([])
  const [loadingCat, setLoadingCat]     = useState(false)
  const [loadingProd, setLoadingProd]   = useState(false)
  const [query, setQuery]               = useState('')
  const [searchResults, setSearchResults] = useState<ProductoPos[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const inputRef   = useRef<HTMLInputElement>(null)
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scanBuffer = useRef('')
  const scanTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLoadingCat(true)
    api.get('/productos/pos/categorias')
      .then(({ data }) => setCategorias(listaDesdeRespuesta<CategoriaPos>(data)))
      .catch((err: unknown) => { console.error('[usePOSProductSearch] categorias', err) })
      .finally(() => setLoadingCat(false))
  }, [])

  const cargarPorCategoria = useCallback((cat: CategoriaPos) => {
    setCatSel(cat)
    setQuery('')
    setSearchResults([])
    setLoadingProd(true)
    api.get(`/productos/pos/categoria/${cat.id}`)
      .then(({ data }) => setProductos(listaDesdeRespuesta<ProductoPos>(data)))
      .catch(() => setProductos([]))
      .finally(() => setLoadingProd(false))
  }, [])

  const cargarTodos = useCallback((cats: CategoriaPos[]) => {
    setCatSel(null)
    setQuery('')
    setSearchResults([])
    if (cats.length === 0) { setProductos([]); return }
    setLoadingProd(true)
    Promise.all(cats.map((cat) => api.get(`/productos/pos/categoria/${cat.id}`)))
      .then((respuestas) => {
        const vistos = new Set<string>()
        const todos: ProductoPos[] = []
        for (const { data } of respuestas) {
          for (const p of listaDesdeRespuesta<ProductoPos>(data)) {
            const id = String(p.id ?? p.idProducto ?? '')
            if (!id || vistos.has(id)) continue
            vistos.add(id)
            todos.push(p)
          }
        }
        setProductos(todos)
      })
      .catch(() => setProductos([]))
      .finally(() => setLoadingProd(false))
  }, [])

  useEffect(() => {
    if (categorias.length === 0) return
    cargarTodos(categorias)
  }, [categorias, cargarTodos])

  const buscar = useCallback((q: string) => {
    if (!q || q.trim().length < 2) { setSearchResults([]); return }
    setSearchLoading(true)
    productService.buscar(q.trim())
      .then((lista) => setSearchResults(lista))
      .catch(() => setSearchResults([]))
      .finally(() => setSearchLoading(false))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setQuery(v)
    if (v) setCatSel(null)
    clearTimeout(timerRef.current as ReturnType<typeof setTimeout>)
    timerRef.current = setTimeout(() => buscar(v), 200)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, onAdd: (p: ProductoPos) => void) => {
    if (e.key === 'Enter') {
      const lista = query ? searchResults : productos
      if (lista.length === 1) handleAdd(lista[0], onAdd)
      return
    }
    clearTimeout(scanTimer.current as ReturnType<typeof setTimeout>)
    scanBuffer.current += e.key.length === 1 ? e.key : ''
    scanTimer.current = setTimeout(() => {
      const code = scanBuffer.current.trim()
      scanBuffer.current = ''
      if (code.length >= 4) buscar(code)
    }, 80)
  }

  const handleAdd = (producto: ProductoPos, onAdd: (p: ProductoPos) => void) => {
    const stock = producto.stockActual ?? producto.stock ?? 0
    if (stock <= 0) return
    onAdd(producto)
  }

  return {
    categorias,
    catSel,
    setCatSel,
    productos,
    setProductos,
    loadingCat,
    loadingProd,
    query,
    searchResults,
    searchLoading,
    inputRef,
    cargarPorCategoria,
    cargarTodos,
    handleChange,
    handleKeyDown,
    handleAdd,
  }
}
