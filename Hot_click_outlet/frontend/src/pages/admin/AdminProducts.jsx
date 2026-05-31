import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useDebounce } from '@/hooks/useDebounce'
import { useStickyState } from '@/hooks/useStickyState'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { RetryBanner } from '@/components/ui/RetryBanner'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { productService, denormalizeProduct, normalizeProduct } from '@/services/productService'
import { warehouseService } from '@/services/orderService'
import { marcaService } from '@/services/marcaService'
import ImportExportBar from '@/components/admin/ImportExportBar'
import MultiImagePicker from '@/components/ui/MultiImagePicker'
import { useToast } from '@/components/ui/Toast'
import { formatPrice, conditionLabel, conditionVariant } from '@/utils/format'

const EMPTY_FORM = {
  nombre: '', titulo: '', descripcion: '',
  precioCompra: '', precioVenta: '', stock: '',
  condicion: 'NUEVO', categoriaId: '', marcaId: '', imagenUrl: '', bodegaId: '', destacado: false,
  especificaciones: '', comoUsar: '', imagenes: [],
  metaTitle: '', metaDescription: '', metaKeywords: '',
  videoUrl: '',
}

function toSlug(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function SeoStatusIcon({ product }) {
  const hasTitle = !!(product.metaTitle)
  const hasDesc = !!(product.metaDescription)
  const both = hasTitle && hasDesc
  const none = !hasTitle && !hasDesc
  const tip = both
    ? `Título: ${product.metaTitle}\nDescripción: ${product.metaDescription}`
    : none
    ? 'Sin título ni descripción SEO'
    : hasTitle
    ? `Título: ${product.metaTitle}\nFalta meta descripción`
    : `Falta título SEO\nDescripción: ${product.metaDescription}`
  return (
    <span title={tip} className="text-base cursor-default select-none">
      {both ? '✅' : none ? '❌' : '⚠️'}
    </span>
  )
}

function CharCounter({ current, max, min = 0 }) {
  const color = current === 0 ? 'text-[#5e5e6e]' : current < min ? 'text-amber-400' : current > max ? 'text-red-400' : 'text-emerald-400'
  return <span className={`text-xs tabular-nums ${color}`}>{current}/{max}</span>
}

const STOCK_OPTIONS = [
  { label: 'Todos', value: '' },
  { label: 'En stock', value: 'ok' },
  { label: 'Stock bajo (≤3)', value: 'low' },
  { label: 'Agotado', value: 'out' },
]

const ta = 'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm placeholder:text-[#8e8e9a]/40 focus:outline-none focus:border-[#4f7cff]/60 focus:ring-2 focus:ring-[#4f7cff]/10 resize-y transition-all'

export default function AdminProducts() {
  const { t } = useTranslation()
  const toast = useToast()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [bodegas, setBodegas] = useState([])
  const [marcas, setMarcas] = useState([])
  const [loading, setLoading] = useState(true)
  const [prodPage, setProdPage] = useState(0)
  const PROD_PAGE_SIZE = 50
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [search, setSearch]         = useStickyState('hc-prod-search', '')
  const [filterCat, setFilterCat]   = useStickyState('hc-prod-cat', '')
  const [filterCond, setFilterCond] = useStickyState('hc-prod-cond', '')
  const [filterStock, setFilterStock] = useStickyState('hc-prod-stock', '')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [showDiscardModal, setShowDiscardModal] = useState(false)
  const editInitialFormRef = useRef(null)
  const loadIdRef = useRef(0)
  const debouncedSearch = useDebounce(search, 280)
  const [carruselOpen, setCarruselOpen] = useState(true)
  const [seoOpen, setSeoOpen] = useState(false)
  const [seoAutoTitle, setSeoAutoTitle] = useState(true)
  const [seoAutoDesc, setSeoAutoDesc] = useState(true)

  const load = async (page = prodPage) => {
    const id = ++loadIdRef.current
    setLoading(true)
    setLoadError(false)
    try {
      const [{ data: prods }, { data: cats }, { data: bods }, { data: marcsR }] = await Promise.all([
        productService.adminGetAll(page, PROD_PAGE_SIZE),
        productService.getCategories(),
        warehouseService.getAll(),
        marcaService.getAll(),
      ])
      if (id !== loadIdRef.current) return // stale — se disparó una carga más reciente
      const pageData = prods.content ?? prods ?? []
      setProducts(pageData)
      setTotalProds(prods.totalElements ?? pageData.length)
      setCategories(cats ?? [])
      setBodegas(Array.isArray(bods) ? bods : bods?.content ?? [])
      setMarcas(Array.isArray(marcsR) ? marcsR : [])
    } catch {
      if (id === loadIdRef.current) setLoadError(true)
    } finally {
      if (id === loadIdRef.current) setLoading(false)
    }
  }

  const [totalProds, setTotalProds] = useState(0)

  useEffect(() => { load(prodPage) }, [prodPage])

  const openNew = () => {
    setEditing(null)
    editInitialFormRef.current = null
    setSeoAutoTitle(true)
    setSeoAutoDesc(true)
    setSeoOpen(false)
    setForm({ ...EMPTY_FORM, bodegaId: bodegas[0]?.id ?? '' })
    setModalOpen(true)
  }

  const openEdit = async (p) => {
    setEditing(p)
    setSeoAutoTitle(false)
    setSeoAutoDesc(false)
    setForm({
      nombre:           p.nombre          ?? '',
      titulo:           p.titulo          ?? '',
      descripcion:      p.descripcion     ?? '',
      precioCompra:     p.precioCompra    ?? '',
      precioVenta:      p.precioVenta     ?? p.precio ?? '',
      stock:            p.stock           ?? '',
      condicion:        p.condicion       ?? 'NUEVO',
      categoriaId:      p.categoriaId     ?? '',
      marcaId:          p.marcaId         ? String(p.marcaId) : '',
      imagenUrl:        p.imagenUrl       ?? '',
      bodegaId:         p.bodegaId        ?? bodegas[0]?.id ?? '',
      destacado:        p.destacado       ?? false,
      especificaciones: p.especificaciones ?? '',
      comoUsar:         p.comoUsar        ?? '',
      imagenes:         p.imagenUrl ? [p.imagenUrl] : [],
      metaTitle:        p.metaTitle        ?? '',
      metaDescription:  p.metaDescription  ?? '',
      metaKeywords:     p.metaKeywords     ?? '',
      videoUrl:         p.videoUrl         ?? '',
    })
    setModalOpen(true)
    try {
      const { data: imgs } = await productService.getImagenes(p.id)
      const urls = (Array.isArray(imgs) ? imgs : []).map((i) => i.urlImagen ?? i)
      if (urls.length > 0) {
        setForm((prev) => {
          const updated = { ...prev, imagenes: urls }
          editInitialFormRef.current = JSON.stringify(updated)
          return updated
        })
      } else {
        editInitialFormRef.current = JSON.stringify({
          nombre: p.nombre ?? '', titulo: p.titulo ?? '', descripcion: p.descripcion ?? '',
          precioCompra: p.precioCompra ?? '', precioVenta: p.precioVenta ?? p.precio ?? '',
          stock: p.stock ?? '', condicion: p.condicion ?? 'NUEVO',
          categoriaId: p.categoriaId ?? '', marcaId: p.marcaId ? String(p.marcaId) : '',
          imagenUrl: p.imagenUrl ?? '', bodegaId: p.bodegaId ?? bodegas[0]?.id ?? '',
          destacado: p.destacado ?? false, especificaciones: p.especificaciones ?? '',
          comoUsar: p.comoUsar ?? '', imagenes: p.imagenUrl ? [p.imagenUrl] : [],
          metaTitle: p.metaTitle ?? '', metaDescription: p.metaDescription ?? '',
          metaKeywords: p.metaKeywords ?? '', videoUrl: p.videoUrl ?? '',
        })
      }
    } catch {
      editInitialFormRef.current = JSON.stringify(form)
    }
  }

  // Carrusel: productos ordenados por ordenCarrusel
  const carruselSlots = products
    .filter((p) => p.enCarrusel)
    .sort((a, b) => (a.ordenCarrusel ?? 0) - (b.ordenCarrusel ?? 0))
    .slice(0, 5)

  const handleToggleCarrusel = async (p) => {
    const yaEsta = p.enCarrusel
    if (yaEsta) {
      // Quitar del carrusel
      setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, enCarrusel: false, ordenCarrusel: 0 } : x))
      try { await productService.toggleCarrusel(p.id, false, 0) }
      catch { setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, enCarrusel: true } : x)) }
    } else {
      if (carruselSlots.length >= 5) { toast({ message: 'El carrusel ya tiene 5 productos (máximo)', type: 'error' }); return }
      // Reassign all existing carousel orders + new one to ensure sequential values
      const existing = [...carruselSlots]
      const allAssignments = [
        ...existing.map((s, i) => ({ id: s.id, orden: i + 1 })),
        { id: p.id, orden: existing.length + 1 },
      ]
      setProducts((prev) => prev.map((x) => {
        const a = allAssignments.find((n) => n.id === x.id)
        return a ? { ...x, enCarrusel: true, ordenCarrusel: a.orden } : x
      }))
      try {
        await Promise.all(allAssignments.map(({ id, orden }) =>
          productService.toggleCarrusel(id, true, orden)
        ))
      } catch { setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, enCarrusel: false } : x)) }
    }
  }

  const handleCarruselMover = async (p, dir) => {
    const sorted = [...products]
      .filter((x) => x.enCarrusel)
      .sort((a, b) => (a.ordenCarrusel ?? 0) - (b.ordenCarrusel ?? 0))

    const idx = sorted.findIndex((x) => x.id === p.id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    // Swap positions in the array
    const reordered = [...sorted]
    ;[reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]]

    // Assign sequential orders 1…N so values are always distinct
    const assignments = reordered.map((s, i) => ({ id: s.id, orden: i + 1 }))

    // Optimistic update
    setProducts((prev) => prev.map((x) => {
      const a = assignments.find((n) => n.id === x.id)
      return a ? { ...x, ordenCarrusel: a.orden } : x
    }))

    try {
      await Promise.all(assignments.map(({ id, orden }) =>
        productService.toggleCarrusel(id, true, orden)
      ))
    } catch {
      toast({ message: 'Error al reordenar el carrusel', type: 'error' })
      load()
    }
  }

  const handleToggleDestacado = async (p) => {
    const nuevoValor = !p.destacado
    setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, destacado: nuevoValor } : x))
    try {
      await productService.toggleDestacado(p.id, nuevoValor)
    } catch {
      setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, destacado: p.destacado } : x))
      toast({ message: 'Error al actualizar destacado', type: 'error' })
    }
  }

  useEffect(() => {
    if (!seoAutoTitle || !modalOpen) return
    setForm(p => ({ ...p, metaTitle: p.nombre ? `${p.nombre} | HOTCLICK Outlet`.slice(0, 60) : '' }))
  }, [form.nombre, seoAutoTitle, modalOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!seoAutoDesc || !modalOpen) return
    const precio = form.precioVenta ? Number(form.precioVenta).toLocaleString('es-CR') : ''
    const base = form.descripcion || ''
    const suggested = base
      ? `${base}${precio ? ` | Precio: ₡${precio}` : ''} | Envíos a todo Costa Rica`.slice(0, 160)
      : ''
    setForm(p => ({ ...p, metaDescription: suggested }))
  }, [form.descripcion, form.precioVenta, seoAutoDesc, modalOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.categoriaId) {
      toast({ message: 'Selecciona una categoría', type: 'error' }); return
    }
    if (!form.bodegaId && bodegas.length > 0) {
      toast({ message: 'Selecciona una bodega', type: 'error' }); return
    }
    setSaving(true)
    try {
      const dto = denormalizeProduct(form)
      if (form.imagenes.length > 0) dto.imagenPrincipalUrl = form.imagenes[0]
      let productoId
      if (editing) {
        await productService.update(editing.id, dto)
        productoId = editing.id
        toast({ message: 'Producto actualizado', type: 'success' })
      } else {
        const res = await productService.create(dto)
        productoId = res.data?.id ?? res.data?.data?.id
        toast({ message: 'Producto creado', type: 'success' })
      }
      if (productoId && form.imagenes.length > 0) {
        await productService.sincronizarImagenes(productoId, form.imagenes)
      }
      editInitialFormRef.current = null
      setModalOpen(false)
      load()
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Error al guardar'
      toast({ message: msg, type: 'error' })
    } finally { setSaving(false) }
  }

  const handleDelete = useCallback((id, nombre) => {
    setDeleteTarget({ id, nombre })
  }, [])

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const { id } = deleteTarget
    setDeleteTarget(null)
    try {
      await productService.delete(id)
      toast({ message: 'Producto eliminado', type: 'success' })
      setProducts((prev) => prev.filter((p) => p.id !== id))
    } catch { toast({ message: 'Error al eliminar', type: 'error' }) }
  }

  const filtered = useMemo(() => products.filter((p) => {
    if (debouncedSearch && !p.nombre?.toLowerCase().includes(debouncedSearch.toLowerCase())) return false
    if (filterCat && String(p.categoriaId) !== String(filterCat)) return false
    if (filterCond && p.condicion !== filterCond) return false
    if (filterStock === 'ok' && p.stock <= 3) return false
    if (filterStock === 'low' && (p.stock === 0 || p.stock > 3)) return false
    if (filterStock === 'out' && p.stock !== 0) return false
    return true
  }), [products, debouncedSearch, filterCat, filterCond, filterStock])

  const hasFilters = filterCat || filterCond || filterStock || !!search
  const clearFilters = () => { setFilterCat(''); setFilterCond(''); setFilterStock(''); setSearch(''); setProdPage(0) }
  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }))
  const setField = (f, v) => setForm((prev) => ({ ...prev, [f]: v }))

  const isModalDirty = editing && editInitialFormRef.current
    ? JSON.stringify(form) !== editInitialFormRef.current
    : false

  const handleModalClose = () => {
    if (isModalDirty) { setShowDiscardModal(true); return }
    setModalOpen(false)
  }

  return (
    <>
      <div className="space-y-5">
        {loadError && !loading && (
          <RetryBanner message="Error al cargar los productos. Verificá tu conexión." onRetry={() => load(prodPage)} />
        )}

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[#e8e8ed]">{t('admin.products.title')}</h1>
            <p className="text-sm text-[#8e8e9a] mt-1">{filtered.length} de {totalProds} productos</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ImportExportBar
              data={products.map((p) => ({
                nombre: p.nombre,
                precioCompra: p.precioCompra,
                precioVenta: p.precioVenta,
                stock: p.stock,
                condicion: p.condicion,
                categoriaId: p.categoriaId,
                categoriaNombre: p.categoriaNombre,
                bodegaId: p.bodegaId,
                bodegaNombre: p.bodegaNombre,
                marcaId: p.marcaId ?? '',
                marcaNombre: p.marcaNombre ?? '',
                destacado: p.destacado ? 'SI' : 'NO',
                descripcion: p.descripcion ?? '',
              }))}
              columns={['nombre','precioCompra','precioVenta','stock','condicion','categoriaId','categoriaNombre','bodegaId','bodegaNombre','marcaId','marcaNombre','destacado','descripcion']}
              filename="productos"
              sheetName="Productos"
              importColumns={['nombre','precioCompra','precioVenta','stock','condicion','categoriaId','bodegaId','marcaId','descripcion']}
              mapImportRow={(row) => ({
                nombreProducto: row.nombre ?? row.nombreProducto ?? '',
                precioCompra: Number(row.precioCompra) || 0,
                precioVenta: Number(row.precioVenta) || 0,
                stockActual: Number(row.stock ?? row.stockActual) || 0,
                condicion: row.condicion ?? 'NUEVO',
                categoriaId: row.categoriaId ? Number(row.categoriaId) : null,
                bodegaId: row.bodegaId ? Number(row.bodegaId) : (bodegas[0]?.id ?? null),
                marcaId: row.marcaId ? Number(row.marcaId) : null,
                descripcionCorta: row.descripcion ?? row.descripcionCorta ?? '',
                visibleCatalogo: true,
              })}
              onImport={async (rows) => {
                await productService.importBulk(rows)
                load(0)
              }}
            />
            <Button onClick={openNew}>+ {t('admin.products.new')}</Button>
          </div>
        </div>

        {/* ── Carrusel del inicio ── */}
        <div className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: 'var(--hc-surface)' }}>
          <button
            onClick={() => setCarruselOpen((o) => !o)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)' }}>
                <svg className="w-4 h-4" style={{ color: '#a855f7' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M12 3v3m0 12v3M3 12h3m12 0h3m-2.636-6.364-2.122 2.122M8.758 15.242l-2.122 2.122m0-12.728 2.122 2.122m6.364 6.364 2.122 2.122"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-[#e8e8ed]">Carrusel del inicio</p>
                <p className="text-xs text-[#8e8e9a]">{carruselSlots.length}/5 productos · se muestran en el hero de la tienda</p>
              </div>
            </div>
            <svg className={`w-4 h-4 text-[#8e8e9a] transition-transform duration-200 ${carruselOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>

          {carruselOpen && (
            <div className="border-t border-white/8 px-5 py-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {Array.from({ length: 5 }, (_, i) => {
                  const slot = carruselSlots[i]
                  const slotColor = ['rgba(79,124,255,0.2)', 'rgba(168,85,247,0.2)', 'rgba(16,185,129,0.2)', 'rgba(245,158,11,0.2)', 'rgba(244,63,94,0.2)'][i]
                  const slotBorder = ['rgba(79,124,255,0.4)', 'rgba(168,85,247,0.4)', 'rgba(16,185,129,0.4)', 'rgba(245,158,11,0.4)', 'rgba(244,63,94,0.4)'][i]
                  return (
                    <div
                      key={i}
                      className="relative rounded-xl overflow-hidden flex flex-col"
                      style={{ border: `1px solid ${slot ? slotBorder : 'rgba(255,255,255,0.08)'}`, background: slot ? slotColor : 'rgba(255,255,255,0.02)', minHeight: 120 }}
                    >
                      <div className="absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: slot ? slotBorder : 'var(--hc-surface-2)', color: 'var(--hc-text)' }}>
                        {i + 1}
                      </div>
                      {slot ? (
                        <>
                          <div className="flex-1 flex items-center justify-center pt-6 pb-2 px-2">
                            {slot.imagenUrl ? (
                              <img src={slot.imagenUrl} alt={slot.nombre} className="w-16 h-16 object-contain" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }} />
                            ) : (
                              <span className="text-3xl">📦</span>
                            )}
                          </div>
                          <div className="px-2 pb-2">
                            <p className="text-[10px] font-medium text-[#e8e8ed] text-center line-clamp-1">{slot.nombre}</p>
                          </div>
                          <div className="flex items-center justify-between px-1.5 pb-1.5 gap-1">
                            <button
                              onClick={() => handleCarruselMover(slot, -1)}
                              disabled={i === 0}
                              className="flex-1 h-6 rounded-lg text-[10px] text-[#8e8e9a] hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
                            >←</button>
                            <button
                              onClick={() => handleToggleCarrusel(slot)}
                              className="h-6 px-1.5 rounded-lg text-[10px] text-red-400 hover:bg-red-500/15 transition-colors"
                            >✕</button>
                            <button
                              onClick={() => handleCarruselMover(slot, 1)}
                              disabled={i === carruselSlots.length - 1}
                              className="flex-1 h-6 rounded-lg text-[10px] text-[#8e8e9a] hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
                            >→</button>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center gap-1 text-[#8e8e9a] py-4">
                          <span className="text-2xl opacity-30">+</span>
                          <span className="text-[10px]">Vacío</span>
                          <span className="text-[9px] opacity-60">Usá el botón de carrusel en la tabla</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="text-[10px] text-[#8e8e9a] mt-3">
                Para agregar un producto al carrusel, presioná el botón de carrusel en la columna de la tabla. Máximo 5 productos.
              </p>
            </div>
          )}
        </div>

        {/* Mobile: búsqueda + filtros rápidos */}
        <div className="md:hidden space-y-2">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8e9a]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setProdPage(0) }}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#111114] border border-white/10 text-[#e8e8ed] text-sm placeholder-[#8e8e9a] focus:outline-none focus:border-[#4f7cff]/60"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {hasFilters && (
              <button onClick={clearFilters} className="shrink-0 px-3 py-1.5 rounded-full text-xs border border-red-500/30 text-red-400">
                ✕ Limpiar
              </button>
            )}
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="shrink-0 h-8 px-2.5 rounded-full bg-[#111114] border border-white/10 text-[#e8e8ed] text-xs focus:outline-none"
            >
              <option value="">Categoría</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.nombreCategoria ?? c.nombre}</option>)}
            </select>
            {[['', 'Condición'], ['NUEVO', 'Nuevo'], ['COMO_NUEVO', 'Como nuevo'], ['USADO', 'Usado']].map(([val, lbl]) => (
              <button key={val} onClick={() => setFilterCond(val)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs border transition-all ${
                  filterCond === val ? 'bg-[#4f7cff]/15 text-white border-[#4f7cff]/40' : 'text-[#8e8e9a] border-white/10'
                }`}>{lbl}</button>
            ))}
          </div>
        </div>

        {/* Aviso de scope cuando hay búsqueda activa y catálogo paginado */}
        {debouncedSearch && totalProds > PROD_PAGE_SIZE && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
            style={{ backgroundColor: 'rgba(79,124,255,0.06)', border: '1px solid rgba(79,124,255,0.18)', color: '#7fa0ff' }}>
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Buscando en los {PROD_PAGE_SIZE} productos de la página actual. Para buscar en todo el catálogo, limpiá el texto y navegá por páginas.
          </div>
        )}

        <div className="flex gap-5">
          {/* Left: Filters panel — solo desktop */}
          <aside className="w-52 shrink-0 space-y-5 hidden md:block">
            <div className="bg-[#111114] border border-white/8 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider">Filtros</span>
                {hasFilters && (
                  <button onClick={clearFilters} className="text-[10px] text-[#4f7cff] hover:underline">Limpiar</button>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-[#8e8e9a]">Categoría</label>
                <select
                  value={filterCat}
                  onChange={(e) => setFilterCat(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-xs focus:outline-none focus:border-[#4f7cff]/60"
                >
                  <option value="">Todas</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombreCategoria ?? c.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-[#8e8e9a]">Condición</label>
                <div className="space-y-1">
                  {[['', 'Todas'], ['NUEVO', 'Nuevo'], ['COMO_NUEVO', 'Como nuevo'], ['USADO', 'Usado']].map(([val, lbl]) => (
                    <button
                      key={val}
                      onClick={() => setFilterCond(val)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                        filterCond === val ? 'bg-[#4f7cff]/15 text-white border border-[#4f7cff]/20' : 'text-[#8e8e9a] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-[#8e8e9a]">Stock</label>
                <div className="space-y-1">
                  {STOCK_OPTIONS.map(({ label: lbl, value: val }) => (
                    <button
                      key={val}
                      onClick={() => setFilterStock(val)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                        filterStock === val ? 'bg-[#4f7cff]/15 text-white border border-[#4f7cff]/20' : 'text-[#8e8e9a] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Right: search + table */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Buscador desktop */}
            <div className="relative hidden md:block">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8e9a]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Buscar por nombre..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setProdPage(0) }}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#111114] border border-white/10 text-[#e8e8ed] text-sm placeholder-[#8e8e9a] focus:outline-none focus:border-[#4f7cff]/60 transition-colors"
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><Spinner size="lg" /></div>
            ) : (
              <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/8">
                        {['★', 'Pos.', 'ID', t('admin.products.name'), t('admin.products.price'), t('admin.products.stock'), t('admin.products.category'), 'SEO', t('admin.products.actions')].map((h) => (
                          <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#8e8e9a] uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filtered.map((p) => (
                        <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-white/3 transition-colors">
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleToggleDestacado(p)}
                              title={p.destacado ? 'Quitar destacado' : 'Marcar como destacado'}
                              className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
                                p.destacado
                                  ? 'text-amber-400 bg-amber-500/15 hover:bg-amber-500/25'
                                  : 'text-[#8e8e9a]/40 hover:text-amber-400 hover:bg-amber-500/10'
                              }`}
                            >
                              <StarIcon filled={p.destacado} />
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleToggleCarrusel(p)}
                              title={p.enCarrusel ? `Quitar del carrusel (pos. ${p.ordenCarrusel})` : carruselSlots.length >= 5 ? 'Carrusel lleno (5/5)' : 'Agregar al carrusel'}
                              className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all text-sm ${
                                p.enCarrusel
                                  ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300'
                                  : carruselSlots.length >= 5
                                  ? 'text-[#8e8e9a]/20 cursor-not-allowed'
                                  : 'text-[#8e8e9a]/40 hover:text-purple-400 hover:bg-purple-500/10'
                              }`}
                            >
                              {p.enCarrusel ? (
                                <span className="text-[10px] font-bold">{p.ordenCarrusel}</span>
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="3"/><path d="M12 3v3m0 12v3M3 12h3m12 0h3m-2.636-6.364-2.122 2.122M8.758 15.242l-2.122 2.122m0-12.728 2.122 2.122m6.364 6.364 2.122 2.122"/>
                                </svg>
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-[#8e8e9a] text-xs">#{p.id}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {p.imagenUrl ? (
                                <img src={p.imagenUrl} alt={p.nombre} className="w-8 h-8 rounded-lg object-cover bg-[#1a1a1f]" />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-[#1a1a1f] flex items-center justify-center">
                                  <svg className="w-4 h-4 text-[#8e8e9a]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                                  </svg>
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className="font-medium text-[#e8e8ed] truncate block" title={p.nombre}>{p.nombre}</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {p.categoriaNombre && <span className="text-[10px] text-[#8e8e9a]">{p.categoriaNombre}</span>}
                                  {p.especificaciones && <span className="text-[9px] text-[#4f7cff]/70 bg-[#4f7cff]/10 px-1.5 py-0.5 rounded-full">con specs</span>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium text-[#e8e8ed]">{formatPrice(p.precio)}</td>
                          <td className="px-4 py-3">
                            <Badge variant={p.stock === 0 ? 'danger' : p.stock <= 3 ? 'warning' : 'success'}>{p.stock}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={conditionVariant(p.condicion)}>{conditionLabel(p.condicion)}</Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <SeoStatusIcon product={p} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button onClick={() => openEdit(p)} className="px-3 py-1 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-[#8e8e9a] hover:text-white transition-colors">{t('admin.products.edit')}</button>
                              <button onClick={() => handleDelete(p.id, p.nombre)} className="px-3 py-1 text-xs rounded-lg bg-red-500/8 hover:bg-red-500/15 text-red-400 transition-colors">{t('admin.products.delete')}</button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                  {filtered.length === 0 && (
                    <div className="text-center py-14">
                      {search || hasFilters ? (
                        <div className="space-y-2">
                          <p className="text-[#8e8e9a] text-sm">Sin resultados para los filtros actuales</p>
                          <button onClick={clearFilters} className="text-xs text-[#4f7cff] hover:underline">Limpiar filtros →</button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ backgroundColor: 'rgba(79,124,255,0.1)', border: '1px solid rgba(79,124,255,0.15)' }}>
                            <svg className="w-7 h-7" style={{ color: '#4f7cff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                          </div>
                          <p className="font-semibold text-[#e8e8ed]">Sin productos publicados</p>
                          <p className="text-sm text-[#8e8e9a] max-w-xs mx-auto">Tu catálogo está vacío. Agregá tu primer producto para comenzar a vender.</p>
                          <button
                            onClick={openNew}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold mt-1 transition-opacity hover:opacity-80"
                            style={{ backgroundColor: '#4f7cff', color: '#fff' }}
                          >
                            + Crear primer producto
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {totalProds > PROD_PAGE_SIZE && (
                  <div className="px-4 py-3 border-t border-white/8 flex items-center justify-between text-xs text-[#8e8e9a]">
                    <span>Página {prodPage + 1} · {products.length} de {totalProds} productos</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setProdPage((p) => Math.max(0, p - 1))}
                        disabled={prodPage === 0}
                        className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 hover:bg-white/10 transition-colors"
                      >
                        ← Anterior
                      </button>
                      <button
                        onClick={() => setProdPage((p) => p + 1)}
                        disabled={(prodPage + 1) * PROD_PAGE_SIZE >= totalProds}
                        className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 disabled:opacity-30 hover:bg-white/10 transition-colors"
                      >
                        Siguiente →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal crear / editar ── */}
      <Modal open={modalOpen} onClose={handleModalClose} title={editing ? t('admin.products.edit') : t('admin.products.new')} size="lg">
        <form onSubmit={handleSave} className="space-y-4">

          {/* Información básica */}
          <Input label="Nombre *" value={form.nombre} onChange={set('nombre')} required />
          <Input label="Título visible en tienda" value={form.titulo} onChange={set('titulo')} hint="Si está vacío se usa el nombre. Este título lo ven los clientes." />
          <Input label="Descripción corta" value={form.descripcion} onChange={set('descripcion')} />

          {/* Precios */}
          <div className="border-t border-white/8 pt-4">
            <p className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider mb-3">Precios</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Precio compra (₡) *" type="number" step="1" min="0" value={form.precioCompra} onChange={set('precioCompra')} required hint="Costo de adquisición" />
              <Input label="Precio venta (₡) *" type="number" step="1" min="0" value={form.precioVenta} onChange={set('precioVenta')} required hint="Precio al público" />
            </div>
            {form.precioCompra && form.precioVenta && (
              <div className="flex gap-2 mt-2 text-xs">
                <span className="text-[#8e8e9a]">Margen:</span>
                <span className={Number(form.precioVenta) > Number(form.precioCompra) ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
                  ₡{(Number(form.precioVenta) - Number(form.precioCompra)).toLocaleString('es-CR')}
                  {' '}({Number(form.precioCompra) > 0 ? `${(((Number(form.precioVenta) - Number(form.precioCompra)) / Number(form.precioCompra)) * 100).toFixed(1)}%` : '—'})
                </span>
              </div>
            )}
          </div>

          {/* Inventario */}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Stock *" type="number" min="0" value={form.stock} onChange={set('stock')} required />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#e8e8ed]">Condición</label>
              <select value={form.condicion} onChange={set('condicion')} className="h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60">
                <option value="NUEVO">Nuevo</option>
                <option value="COMO_NUEVO">Como nuevo</option>
                <option value="USADO">Usado</option>
              </select>
            </div>
          </div>

          {/* Alerta: sin categorías */}
          {categories.length === 0 && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}>
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              <span>
                <span className="font-semibold">Sin categorías creadas.</span> Necesitás crear al menos una antes de publicar un producto.{' '}
                <Link to="/admin/categorias" className="underline font-medium" onClick={() => setModalOpen(false)}>Crear categoría →</Link>
              </span>
            </div>
          )}

          {/* Categoría + Bodega */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#e8e8ed]">Categoría *</label>
              <select value={form.categoriaId} onChange={set('categoriaId')} required className="h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60">
                <option value="">Selecciona categoría</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.nombreCategoria ?? c.nombre}</option>)}
              </select>
            </div>
            {bodegas.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#e8e8ed]">Bodega *</label>
                <select value={form.bodegaId} onChange={set('bodegaId')} className="h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60" required>
                  <option value="">Selecciona bodega</option>
                  {bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombreBodega ?? b.nombre}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Marca */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#e8e8ed]">Marca</label>
            <select value={form.marcaId} onChange={set('marcaId')} className="h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60">
              <option value="">— Sin marca —</option>
              {marcas.map((m) => (
                <option key={m.id} value={m.id}>{m.nombreMarca}</option>
              ))}
            </select>
          </div>

          <MultiImagePicker
            imagenes={form.imagenes}
            onChange={(imgs) => setForm((prev) => ({ ...prev, imagenes: imgs, imagenUrl: imgs[0] ?? prev.imagenUrl }))}
          />

          {/* Destacado */}
          <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/4 border border-white/8">
            <div>
              <p className="text-sm font-medium text-[#e8e8ed]">Destacado</p>
              <p className="text-xs text-[#8e8e9a]">Aparece primero en el inicio de la tienda</p>
            </div>
            <button
              type="button"
              onClick={() => setField('destacado', !form.destacado)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${form.destacado ? 'bg-amber-400' : 'bg-white/15'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${form.destacado ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* ── Contenido del producto ── */}
          <div className="border-t border-white/8 pt-4 space-y-4">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider">Contenido del producto</p>
              <span className="text-[10px] text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-full">visible para el cliente</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#e8e8ed]">
                Especificaciones técnicas
                {form.especificaciones && <span className="ml-2 text-[10px] text-[#4f7cff] bg-[#4f7cff]/10 px-1.5 py-0.5 rounded-full">✓ con contenido</span>}
              </label>
              <textarea
                value={form.especificaciones}
                onChange={(e) => setField('especificaciones', e.target.value)}
                rows={5}
                placeholder={"- Marca: Samsung\n- Modelo: Galaxy A54\n- Color: Negro\n- Almacenamiento: 128GB\n- RAM: 6GB"}
                className={`${ta} min-h-[110px] font-mono text-xs`}
              />
              <p className="text-xs text-[#8e8e9a]">Una línea = un punto. Se muestra como lista al cliente en la ficha del producto.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#e8e8ed]">
                Cómo usar
                {form.comoUsar && <span className="ml-2 text-[10px] text-[#4f7cff] bg-[#4f7cff]/10 px-1.5 py-0.5 rounded-full">✓ con contenido</span>}
              </label>
              <textarea
                value={form.comoUsar}
                onChange={(e) => setField('comoUsar', e.target.value)}
                rows={4}
                placeholder={"1. Cargue el dispositivo completamente antes de usar\n2. Inserte la tarjeta SIM\n3. Encienda con el botón lateral\n4. Siga las instrucciones en pantalla"}
                className={`${ta} min-h-[90px]`}
              />
              <p className="text-xs text-[#8e8e9a]">Pasos numerados. Ej: "1. Primer paso". Se muestra como lista ordenada al cliente.</p>
            </div>

            {/* ── Video del producto ── */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#e8e8ed] flex items-center gap-2">
                <span>Video del producto</span>
                {form.videoUrl && (() => {
                  const u = form.videoUrl
                  if (/youtube|youtu\.be/.test(u)) return <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full">▶ YouTube</span>
                  if (/tiktok/.test(u)) return <span className="text-[10px] text-white bg-white/10 px-1.5 py-0.5 rounded-full">▶ TikTok</span>
                  if (/instagram/.test(u)) return <span className="text-[10px] text-pink-400 bg-pink-500/10 px-1.5 py-0.5 rounded-full">▶ Instagram</span>
                  return <span className="text-[10px] text-[#8e8e9a] bg-white/5 px-1.5 py-0.5 rounded-full">▶ con video</span>
                })()}
              </label>
              <input
                type="url"
                value={form.videoUrl}
                onChange={(e) => setField('videoUrl', e.target.value)}
                placeholder="YouTube, TikTok o Instagram..."
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm placeholder:text-[#8e8e9a]/40 focus:outline-none focus:border-[#4f7cff]/60 focus:ring-2 focus:ring-[#4f7cff]/10 transition-all"
              />
              <p className="text-xs text-[#8e8e9a]">Pega el link de YouTube, TikTok o Instagram. Se mostrará como video embed en la página de detalle.</p>
            </div>
          </div>

          {/* ── SEO ── */}
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <button
              type="button"
              onClick={() => setSeoOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#e8e8ed]">SEO</span>
                <span className="text-base">🎯</span>
                {form.metaTitle && form.metaDescription
                  ? <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Optimizado</span>
                  : <span className="text-[10px] text-[#8e8e9a] bg-white/5 px-2 py-0.5 rounded-full">Sin configurar</span>
                }
              </div>
              <svg className={`w-4 h-4 text-[#8e8e9a] transition-transform duration-200 ${seoOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            {seoOpen && (
              <div className="border-t border-white/10 px-4 py-4 space-y-4">
                {/* Título SEO */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <label className="text-sm font-medium text-[#e8e8ed]">Título SEO</label>
                      <span title="Aparece en Google. Usa entre 50-60 caracteres, incluye la palabra principal." className="text-[#8e8e9a] cursor-help text-xs">ⓘ</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {seoAutoTitle && <span className="text-[10px] text-[#4f7cff]">auto</span>}
                      <CharCounter current={(form.metaTitle || '').length} max={60} min={30} />
                    </div>
                  </div>
                  <input
                    value={form.metaTitle || ''}
                    maxLength={60}
                    placeholder="Nombre del producto | HOTCLICK Outlet"
                    onChange={e => { setSeoAutoTitle(false); setField('metaTitle', e.target.value) }}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm placeholder:text-[#8e8e9a]/40 focus:outline-none focus:border-[#4f7cff]/60 transition-all"
                  />
                </div>

                {/* Meta Descripción */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <label className="text-sm font-medium text-[#e8e8ed]">Meta Descripción</label>
                      <span title="Aparece debajo del título en Google. Usa entre 120-160 caracteres." className="text-[#8e8e9a] cursor-help text-xs">ⓘ</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {seoAutoDesc && <span className="text-[10px] text-[#4f7cff]">auto</span>}
                      <CharCounter current={(form.metaDescription || '').length} max={160} min={120} />
                    </div>
                  </div>
                  <textarea
                    value={form.metaDescription || ''}
                    maxLength={160}
                    rows={3}
                    placeholder="Descripción del producto | Precio: ₡X | Envíos a todo Costa Rica"
                    onChange={e => { setSeoAutoDesc(false); setField('metaDescription', e.target.value) }}
                    className={`${ta} resize-none`}
                  />
                </div>

                {/* Vista previa Google */}
                <div>
                  <p className="text-xs text-[#8e8e9a] mb-2">Vista previa en Google</p>
                  <div className="rounded-xl bg-white px-4 py-3 space-y-0.5">
                    <p className="text-xs text-green-700 truncate">
                      hotclick.com › productos › {form.nombre ? toSlug(form.nombre) : '…'}
                    </p>
                    <p className="text-base text-blue-700 truncate leading-snug">
                      {form.metaTitle || 'Título SEO del producto'}
                    </p>
                    <p className="text-sm text-[#4d5156] line-clamp-2 leading-snug">
                      {form.metaDescription || 'La meta descripción aparecerá aquí…'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={saving} className="flex-1">{editing ? t('admin.products.saved') : t('admin.products.new')}</Button>
            <Button type="button" variant="secondary" onClick={handleModalClose}>{t('common.cancel')}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={showDiscardModal}
        onClose={() => setShowDiscardModal(false)}
        onConfirm={() => { setShowDiscardModal(false); setModalOpen(false); editInitialFormRef.current = null }}
        title="Cambios sin guardar"
        message="Hay cambios sin guardar en este producto. ¿Salir sin guardar?"
        confirmLabel="Descartar cambios"
        danger={false}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Eliminar producto"
        message={`¿Eliminar "${deleteTarget?.nombre}"? Esta acción no se puede deshacer.`}
      />
    </>
  )
}

function StarIcon({ filled }) {
  return filled ? (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ) : (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  )
}
