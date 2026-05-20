import { useState, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import AdminLayout from '@/layouts/AdminLayout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { productService, denormalizeProduct, normalizeProduct } from '@/services/productService'
import { warehouseService } from '@/services/orderService'
import { marcaService } from '@/services/marcaService'
import MultiImagePicker from '@/components/ui/MultiImagePicker'
import { useToast } from '@/components/ui/Toast'
import { formatPrice, conditionLabel } from '@/utils/format'

const EMPTY_FORM = {
  nombre: '', titulo: '', descripcion: '',
  precioCompra: '', precioVenta: '', stock: '',
  condicion: 'NUEVO', categoriaId: '', marcaId: '', imagenUrl: '', bodegaId: '', destacado: false,
  especificaciones: '', comoUsar: '', imagenes: [],
  metaTitle: '', metaDescription: '', metaKeywords: '',
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
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterCond, setFilterCond] = useState('')
  const [filterStock, setFilterStock] = useState('')
  const [carruselOpen, setCarruselOpen] = useState(true)
  const [seoOpen, setSeoOpen] = useState(false)
  const [seoAutoTitle, setSeoAutoTitle] = useState(true)
  const [seoAutoDesc, setSeoAutoDesc] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [{ data: prods }, { data: cats }, { data: bods }, { data: marcsR }] = await Promise.all([
        productService.adminGetAll(0, 200),
        productService.getCategories(),
        warehouseService.getAll(),
        marcaService.getAll(),
      ])
      setProducts(prods.content ?? prods ?? [])
      setCategories(cats ?? [])
      setBodegas(Array.isArray(bods) ? bods : bods?.content ?? [])
      setMarcas(Array.isArray(marcsR.data) ? marcsR.data : [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditing(null)
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
    })
    setModalOpen(true)
    try {
      const { data: imgs } = await productService.getImagenes(p.id)
      const urls = (Array.isArray(imgs) ? imgs : []).map((i) => i.urlImagen ?? i)
      if (urls.length > 0) setForm((prev) => ({ ...prev, imagenes: urls }))
    } catch { /* silencioso — usa la imagen principal como fallback */ }
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
      const nuevoOrden = carruselSlots.length + 1
      setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, enCarrusel: true, ordenCarrusel: nuevoOrden } : x))
      try { await productService.toggleCarrusel(p.id, true, nuevoOrden) }
      catch { setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, enCarrusel: false } : x)) }
    }
  }

  const handleCarruselMover = async (p, dir) => {
    const slots = products.filter((x) => x.enCarrusel).sort((a, b) => (a.ordenCarrusel ?? 0) - (b.ordenCarrusel ?? 0))
    const idx = slots.findIndex((x) => x.id === p.id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= slots.length) return
    const other = slots[swapIdx]
    const newOrderA = other.ordenCarrusel
    const newOrderB = p.ordenCarrusel
    setProducts((prev) => prev.map((x) =>
      x.id === p.id ? { ...x, ordenCarrusel: newOrderA }
      : x.id === other.id ? { ...x, ordenCarrusel: newOrderB }
      : x
    ))
    try {
      await Promise.all([
        productService.toggleCarrusel(p.id, true, newOrderA),
        productService.toggleCarrusel(other.id, true, newOrderB),
      ])
    } catch { load() }
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
      setModalOpen(false)
      load()
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Error al guardar'
      toast({ message: msg, type: 'error' })
    } finally { setSaving(false) }
  }

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return
    try {
      await productService.delete(id)
      toast({ message: 'Producto eliminado', type: 'success' })
      setProducts((prev) => prev.filter((p) => p.id !== id))
    } catch { toast({ message: 'Error al eliminar', type: 'error' }) }
  }

  const filtered = useMemo(() => products.filter((p) => {
    if (search && !p.nombre?.toLowerCase().includes(search.toLowerCase())) return false
    if (filterCat && String(p.categoriaId) !== String(filterCat)) return false
    if (filterCond && p.condicion !== filterCond) return false
    if (filterStock === 'ok' && p.stock <= 3) return false
    if (filterStock === 'low' && (p.stock === 0 || p.stock > 3)) return false
    if (filterStock === 'out' && p.stock !== 0) return false
    return true
  }), [products, search, filterCat, filterCond, filterStock])

  const hasFilters = filterCat || filterCond || filterStock
  const clearFilters = () => { setFilterCat(''); setFilterCond(''); setFilterStock(''); setSearch('') }
  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }))
  const setField = (f, v) => setForm((prev) => ({ ...prev, [f]: v }))

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#e8e8ed]">{t('admin.products.title')}</h1>
            <p className="text-sm text-[#8e8e9a] mt-1">{filtered.length} de {products.length} productos</p>
          </div>
          <Button onClick={openNew}>+ {t('admin.products.new')}</Button>
        </div>

        {/* ── Carrusel del inicio ── */}
        <div className="rounded-2xl border border-white/8 overflow-hidden" style={{ background: 'rgba(17,17,20,0.95)' }}>
          <button
            onClick={() => setCarruselOpen((o) => !o)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg" style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)' }}>
                🎠
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
                      <div className="absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: slot ? slotBorder : 'rgba(255,255,255,0.1)', color: '#e8e8ed' }}>
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
                          <span className="text-[9px] opacity-60">Usa 🎠 en la tabla</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="text-[10px] text-[#8e8e9a] mt-3">
                Para agregar un producto al carrusel, presiona el botón <span className="text-purple-400">🎠</span> en la columna de la tabla. Máximo 5 productos.
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
              onChange={(e) => setSearch(e.target.value)}
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
                onChange={(e) => setSearch(e.target.value)}
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
                        {['★', '🎠', 'ID', t('admin.products.name'), t('admin.products.price'), t('admin.products.stock'), t('admin.products.category'), 'SEO', t('admin.products.actions')].map((h) => (
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
                              ) : '🎠'}
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
                                <span className="font-medium text-[#e8e8ed] max-w-[200px] truncate block">{p.nombre}</span>
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
                            <Badge variant={p.condicion === 'NUEVO' ? 'success' : 'warning'}>{conditionLabel(p.condicion)}</Badge>
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
                    <div className="text-center py-12 text-[#8e8e9a]">{search || hasFilters ? 'Sin resultados para los filtros' : 'No hay productos aún'}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal crear / editar ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('admin.products.edit') : t('admin.products.new')} size="lg">
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
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
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
