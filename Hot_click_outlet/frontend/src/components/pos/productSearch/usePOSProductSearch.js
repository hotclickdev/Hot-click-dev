import { useState, useRef, useCallback, useEffect } from 'react'
import { productService } from '@/services/productService'
import api from '@/services/api'
import { listaDesdeRespuesta } from './posProductSearchHelpers'

/** Estado y handlers del buscador POS — bit-idéntico al original. */
export function usePOSProductSearch() {
  const [categorias, setCategorias]     = useState([])
  const [catSel, setCatSel]             = useState(null)
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

  useEffect(() => {
    setLoadingCat(true)
    api.get('/productos/pos/categorias')
      .then(({ data }) => setCategorias(listaDesdeRespuesta(data)))
      .catch((err) => { console.error('[usePOSProductSearch] categorias', err) })
      .finally(() => setLoadingCat(false))
  }, [])

  const cargarPorCategoria = useCallback((cat) => {
    setCatSel(cat)
    setQuery('')
    setSearchResults([])
    setLoadingProd(true)
    api.get(`/productos/pos/categoria/${cat.id}`)
      .then(({ data }) => setProductos(listaDesdeRespuesta(data)))
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

  const handleKeyDown = (e, onAdd) => {
    if (e.key === 'Enter') {
      const lista = query ? searchResults : productos
      if (lista.length === 1) handleAdd(lista[0], onAdd)
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

  const handleAdd = (producto, onAdd) => {
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
    handleChange,
    handleKeyDown,
    handleAdd,
  }
}
