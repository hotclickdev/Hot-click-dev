import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import AdminLayout from '@/layouts/AdminLayout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { productService, denormalizeProduct, normalizeProduct } from '@/services/productService'
import { warehouseService } from '@/services/orderService'
import { useToast } from '@/components/ui/Toast'
import { formatPrice, conditionLabel } from '@/utils/format'

const EMPTY_FORM = {
  nombre: '', titulo: '', descripcion: '',
  precioCompra: '', precioVenta: '', stock: '',
  condicion: 'NUEVO', categoriaId: '', imagenUrl: '', bodegaId: '', destacado: false,
  especificaciones: '', comoUsar: '',
}

const STOCK_OPTIONS = [
  { label: 'Todos', value: '' },
  { label: 'En stock', value: 'ok' },
  { label: 'Stock bajo (≤3)', value: 'low' },
  { label: 'Agotado', value: 'out' },
]

const ta = 'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm placeholder:text-[#8e8e9a]/40 focus:outline-none focus:border-[#4f7cff]/60 focus:ring-2 focus:ring-[#4f7cff]/10 resize-y transition-all'

export default function AdminProducts() {
  const toast = useToast()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [bodegas, setBodegas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterCond, setFilterCond] = useState('')
  const [filterStock, setFilterStock] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [{ data: prods }, { data: cats }, { data: bods }] = await Promise.all([
        productService.getAll(0, 200),
        productService.getCategories(),
        warehouseService.getAll(),
      ])
      setProducts(prods.content ?? prods ?? [])
      setCategories(cats ?? [])
      setBodegas(Array.isArray(bods) ? bods : bods?.content ?? [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, bodegaId: bodegas[0]?.id ?? '' })
    setModalOpen(true)
  }

  const openEdit = (p) => {
    setEditing(p)
    setForm({
      nombre:          p.nombre          ?? '',
      titulo:          p.titulo          ?? '',
      descripcion:     p.descripcion     ?? '',
      precioCompra:    p.precioCompra    ?? '',
      precioVenta:     p.precioVenta     ?? p.precio ?? '',
      stock:           p.stock           ?? '',
      condicion:       p.condicion       ?? 'NUEVO',
      categoriaId:     p.categoriaId     ?? '',
      imagenUrl:       p.imagenUrl       ?? '',
      bodegaId:        p.bodegaId        ?? bodegas[0]?.id ?? '',
      destacado:       p.destacado       ?? false,
      especificaciones: p.especificaciones ?? '',
      comoUsar:        p.comoUsar        ?? '',
    })
    setModalOpen(true)
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

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.bodegaId && bodegas.length > 0) {
      toast({ message: 'Selecciona una bodega', type: 'error' }); return
    }
    setSaving(true)
    try {
      const dto = denormalizeProduct(form)
      if (editing) {
        await productService.update(editing.id, dto)
        toast({ message: 'Producto actualizado', type: 'success' })
      } else {
        await productService.create(dto)
        toast({ message: 'Producto creado', type: 'success' })
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
            <h1 className="text-2xl font-bold text-[#e8e8ed]">Productos</h1>
            <p className="text-sm text-[#8e8e9a] mt-1">{filtered.length} de {products.length} productos</p>
          </div>
          <Button onClick={openNew}>+ Nuevo producto</Button>
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
                        {['★', 'ID', 'Nombre', 'Precio', 'Stock', 'Condición', 'Acciones'].map((h) => (
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
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button onClick={() => openEdit(p)} className="px-3 py-1 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-[#8e8e9a] hover:text-white transition-colors">Editar</button>
                              <button onClick={() => handleDelete(p.id, p.nombre)} className="px-3 py-1 text-xs rounded-lg bg-red-500/8 hover:bg-red-500/15 text-red-400 transition-colors">Eliminar</button>
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
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar producto' : 'Nuevo producto'} size="lg">
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
              <label className="text-sm font-medium text-[#e8e8ed]">Categoría</label>
              <select value={form.categoriaId} onChange={set('categoriaId')} className="h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60">
                <option value="">Sin categoría</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.nombreCategoria ?? c.nombre}</option>)}
              </select>
            </div>
            {bodegas.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#e8e8ed]">Bodega *</label>
                <select value={form.bodegaId} onChange={set('bodegaId')} className="h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60" required>
                  <option value="">Selecciona bodega</option>
                  {bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </div>
            )}
          </div>

          <Input label="URL de imagen" value={form.imagenUrl} onChange={set('imagenUrl')} placeholder="https://..." hint="Pega la URL de la imagen del producto" />

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

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={saving} className="flex-1">{editing ? 'Guardar cambios' : 'Crear producto'}</Button>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
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
