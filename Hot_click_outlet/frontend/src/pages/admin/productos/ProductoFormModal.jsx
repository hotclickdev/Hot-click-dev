import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import CategoriaSelect from '@/components/admin/CategoriaSelect'
import MultiImagePicker from '@/components/ui/MultiImagePicker'
import CharCounter from '../nuevo-producto/CharCounter'
import { toSlug } from '../nuevo-producto/toSlug'
import { ta, inpStyle as taStyle } from '../nuevo-producto/productFormUi'
import { margenForm } from './productosHelpers'

function setCampo(setForm, campo) {
  return (e) => setForm((prev) => ({ ...prev, [campo]: e.target.value }))
}

function setField(setForm, campo, valor) {
  setForm((prev) => ({ ...prev, [campo]: valor }))
}

function BadgeConContenido({ visible }) {
  if (!visible) return null
  return <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full" style={{ color: 'var(--hc-accent)', backgroundColor: 'rgba(23,71,168,0.08)' }}>✓ con contenido</span>
}

function etiquetaVideo(url) {
  if (!url) return null
  if (/youtube|youtu\.be/.test(url)) return { label: '▶ YouTube', color: '#a8291f', bg: 'rgba(220,38,38,0.08)' }
  if (/tiktok/.test(url)) return { label: '▶ TikTok', color: 'var(--hc-text)', bg: 'var(--hc-surface-2)' }
  if (/instagram/.test(url)) return { label: '▶ Instagram', color: '#be185d', bg: 'rgba(219,39,119,0.08)' }
  return { label: '▶ con video', color: 'var(--hc-muted)', bg: 'var(--hc-surface-2)' }
}

function TargetIcon() {
  return (
    <svg className="w-4 h-4" style={{ color: 'var(--hc-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  )
}

function AlertaSinCategorias({ onCerrar }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#8a5a00' }}>
      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
      <span>
        <span className="font-semibold">Sin categorías creadas.</span>{' '}Necesitás crear al menos una antes de publicar un producto.{' '}
        <Link to="/admin/categorias" className="underline font-medium" onClick={onCerrar}>Crear categoría →</Link>
      </span>
    </div>
  )
}

function BloquePrecios({ form, setForm }) {
  const margen = form.precioCompra && form.precioVenta ? margenForm(form.precioCompra, form.precioVenta) : null
  return (
    <div className="pt-4" style={{ borderTop: '1px solid var(--hc-border)' }}>
      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--hc-muted)' }}>Precios</p>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Precio compra (₡) *" type="number" step="1" min="0" value={form.precioCompra} onChange={setCampo(setForm, 'precioCompra')} required hint="Costo de adquisición" />
        <Input label="Precio venta (₡) *" type="number" step="1" min={form.precioCompra || 0} value={form.precioVenta} onChange={setCampo(setForm, 'precioVenta')} required hint="Debe ser ≥ precio de compra" />
      </div>
      {margen && (
        <div className="flex gap-2 mt-2 text-xs">
          <span style={{ color: 'var(--hc-muted)' }}>Margen:</span>
          <span className="font-medium" style={{ color: margen.positivo ? '#1E7F4F' : '#a8291f' }}>
            ₡{margen.monto.toLocaleString('es-CR')}
            {' '}({margen.pct ? `${margen.pct}%` : '—'})
          </span>
        </div>
      )}
    </div>
  )
}

function BloqueInventario({ form, setForm }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Input label="Stock *" type="number" min="0" value={form.stock} onChange={setCampo(setForm, 'stock')} required />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>Condición</label>
        <select value={form.condicion} onChange={setCampo(setForm, 'condicion')} className="h-11 px-3 rounded-xl text-sm focus:outline-none" style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
          <option value="NUEVO">Nuevo</option>
          <option value="COMO_NUEVO">Como nuevo</option>
          <option value="USADO">Usado</option>
        </select>
      </div>
    </div>
  )
}

function BloqueCategoriaBodega({ form, setForm, categories, bodegas }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>Categoría *</label>
        <CategoriaSelect
          categories={categories}
          value={form.categoriaId}
          onChange={(id) => setField(setForm, 'categoriaId', id)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>Bodega *</label>
        <select value={form.bodegaId} onChange={setCampo(setForm, 'bodegaId')} className="h-11 px-3 rounded-xl text-sm focus:outline-none" style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} required={bodegas.length > 0}>
          <option value="">{bodegas.length === 0 ? '— Sin bodegas —' : 'Selecciona bodega'}</option>
          {bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombreBodega ?? b.nombre}</option>)}
        </select>
      </div>
    </div>
  )
}

function BloqueContenido({ form, setForm }) {
  const video = etiquetaVideo(form.videoUrl)
  return (
    <div className="pt-4 space-y-4" style={{ borderTop: '1px solid var(--hc-border)' }}>
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>Contenido del producto</p>
        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: '#1E7F4F', backgroundColor: '#e2f1e8' }}>visible para el cliente</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>
          Especificaciones técnicas
          <BadgeConContenido visible={!!form.especificaciones} />
        </label>
        <textarea
          value={form.especificaciones}
          onChange={(e) => setField(setForm, 'especificaciones', e.target.value)}
          rows={5}
          placeholder={"- Marca: Samsung\n- Modelo: Galaxy A54\n- Color: Negro\n- Almacenamiento: 128GB\n- RAM: 6GB"}
          className={`${ta} min-h-[110px] font-mono text-xs`}
          style={taStyle}
        />
        <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Una línea = un punto. Se muestra como lista al cliente en la ficha del producto.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>
          Cómo usar
          <BadgeConContenido visible={!!form.comoUsar} />
        </label>
        <textarea
          value={form.comoUsar}
          onChange={(e) => setField(setForm, 'comoUsar', e.target.value)}
          rows={4}
          placeholder={"1. Cargue el dispositivo completamente antes de usar\n2. Inserte la tarjeta SIM\n3. Encienda con el botón lateral\n4. Siga las instrucciones en pantalla"}
          className={`${ta} min-h-[90px]`}
          style={taStyle}
        />
        <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Pasos numerados. Ej: "1. Primer paso". Se muestra como lista ordenada al cliente.</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--hc-text)' }}>
          <span>Video del producto</span>
          {video && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ color: video.color, backgroundColor: video.bg }}>{video.label}</span>
          )}
        </label>
        <input
          type="url"
          value={form.videoUrl}
          onChange={(e) => setField(setForm, 'videoUrl', e.target.value)}
          placeholder="YouTube, TikTok o Instagram..."
          className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all"
          style={taStyle}
        />
        <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Pega el link de YouTube, TikTok o Instagram. Se mostrará como video embed en la página de detalle.</p>
      </div>
    </div>
  )
}

function BloqueSeo({
  form, setForm, seoOpen, setSeoOpen, seoAutoTitle, setSeoAutoTitle, seoAutoDesc, setSeoAutoDesc,
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--hc-border)' }}>
      <button
        type="button"
        onClick={() => setSeoOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--hc-surface-2)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>SEO</span>
          <TargetIcon />
          {form.metaTitle && form.metaDescription
            ? <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: '#1E7F4F', backgroundColor: '#e2f1e8' }}>Optimizado</span>
            : <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: 'var(--hc-muted)', backgroundColor: 'var(--hc-surface-2)' }}>Sin configurar</span>
          }
        </div>
        <svg className={`w-4 h-4 transition-transform duration-200 ${seoOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--hc-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {seoOpen && (
        <div className="px-4 py-4 space-y-4" style={{ borderTop: '1px solid var(--hc-border)' }}>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>Título SEO</label>
                <span title="Aparece en Google. Usa entre 50-60 caracteres, incluye la palabra principal." className="cursor-help text-xs" style={{ color: 'var(--hc-muted)' }}>ⓘ</span>
              </div>
              <div className="flex items-center gap-2">
                {seoAutoTitle && <span className="text-[10px]" style={{ color: 'var(--hc-accent)' }}>auto</span>}
                <CharCounter current={(form.metaTitle || '').length} max={60} min={30} />
              </div>
            </div>
            <input
              value={form.metaTitle || ''}
              maxLength={60}
              placeholder="Nombre del producto | HotClick Outlet"
              onChange={(e) => { setSeoAutoTitle(false); setField(setForm, 'metaTitle', e.target.value) }}
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none transition-all"
              style={taStyle}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>Meta Descripción</label>
                <span title="Aparece debajo del título en Google. Usa entre 120-160 caracteres." className="cursor-help text-xs" style={{ color: 'var(--hc-muted)' }}>ⓘ</span>
              </div>
              <div className="flex items-center gap-2">
                {seoAutoDesc && <span className="text-[10px]" style={{ color: 'var(--hc-accent)' }}>auto</span>}
                <CharCounter current={(form.metaDescription || '').length} max={160} min={120} />
              </div>
            </div>
            <textarea
              value={form.metaDescription || ''}
              maxLength={160}
              rows={3}
              placeholder="Descripción del producto | Precio: ₡X | Envíos a todo Costa Rica"
              onChange={(e) => { setSeoAutoDesc(false); setField(setForm, 'metaDescription', e.target.value) }}
              className={`${ta} resize-none`}
              style={taStyle}
            />
          </div>

          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--hc-muted)' }}>Vista previa en Google</p>
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
  )
}

export default function ProductoFormModal({
  open,
  onClose,
  form,
  setForm,
  categories,
  bodegas,
  marcas,
  editing,
  saving,
  seoOpen,
  setSeoOpen,
  seoAutoTitle,
  setSeoAutoTitle,
  seoAutoDesc,
  setSeoAutoDesc,
  onSubmit,
  setModalOpen,
}) {
  const { t } = useTranslation()
  return (
    <Modal open={open} onClose={onClose} title={editing ? t('admin.products.edit') : t('admin.products.new')} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Nombre *" value={form.nombre} onChange={setCampo(setForm, 'nombre')} required />
        <Input label="Título visible en tienda" value={form.titulo} onChange={setCampo(setForm, 'titulo')} hint="Si está vacío se usa el nombre. Este título lo ven los clientes." />
        <Input label="Descripción corta" value={form.descripcion} onChange={setCampo(setForm, 'descripcion')} />

        <BloquePrecios form={form} setForm={setForm} />
        <BloqueInventario form={form} setForm={setForm} />

        {categories.length === 0 && (
          <AlertaSinCategorias onCerrar={() => setModalOpen(false)} />
        )}

        <BloqueCategoriaBodega form={form} setForm={setForm} categories={categories} bodegas={bodegas} />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>Marca</label>
          <select value={form.marcaId} onChange={setCampo(setForm, 'marcaId')} className="h-11 px-3 rounded-xl text-sm focus:outline-none" style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
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

        <div className="flex items-center justify-between py-2.5 px-3 rounded-xl" style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>Destacado</p>
            <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Aparece primero en el inicio de la tienda</p>
          </div>
          <button
            type="button"
            onClick={() => setField(setForm, 'destacado', !form.destacado)}
            className="relative w-11 h-6 rounded-full transition-colors duration-200"
            style={{ backgroundColor: form.destacado ? '#f59e0b' : 'var(--hc-border)' }}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${form.destacado ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        <BloqueContenido form={form} setForm={setForm} />
        <BloqueSeo
          form={form}
          setForm={setForm}
          seoOpen={seoOpen}
          setSeoOpen={setSeoOpen}
          seoAutoTitle={seoAutoTitle}
          setSeoAutoTitle={setSeoAutoTitle}
          seoAutoDesc={seoAutoDesc}
          setSeoAutoDesc={setSeoAutoDesc}
        />

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={saving} className="flex-1">{editing ? t('admin.products.saved') : t('admin.products.new')}</Button>
          <Button type="button" variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        </div>
      </form>
    </Modal>
  )
}
