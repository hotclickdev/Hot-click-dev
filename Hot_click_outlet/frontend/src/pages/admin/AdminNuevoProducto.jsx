import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { publicacionService } from '@/services/publicacionService'
import { productService, denormalizeProduct } from '@/services/productService'
import { warehouseService } from '@/services/orderService'
import { marcaService } from '@/services/marcaService'
import EmpresaProfileCard from '@/components/admin/EmpresaProfileCard'

const MAX_FOTOS = 10

const SEO_LANGS = [
  { code: 'es', flag: '🇨🇷', label: 'ES', name: 'Español' },
  { code: 'en', flag: '🇺🇸', label: 'EN', name: 'English' },
  { code: 'pt', flag: '🇧🇷', label: 'PT', name: 'Português' },
  { code: 'fr', flag: '🇫🇷', label: 'FR', name: 'Français' },
]

const EMPTY_FORM = {
  nombre: '', titulo: '', descripcion: '', descripcionLarga: '',
  especificaciones: '', comoUsar: '', marcaId: '',
  precioVenta: '', precioCompra: '', stock: '1', talla: '', tallasCantidad: [], garantiaDias: '0',
  condicion: 'NUEVO', categoriaId: '', bodegaId: '', imagenUrl: '', imagenes: [],
  sku: '', barcode: '',
  metaTitle: '', metaDescription: '', metaKeywords: '',
  tags: '',
  seoByLang: {
    es: { title: '', description: '' },
    en: { title: '', description: '' },
    pt: { title: '', description: '' },
    fr: { title: '', description: '' },
  },
}

const STEPS = [
  { id: 'fotos',         title: 'Fotos del producto',           subtitle: 'Subí fotos para que la IA complete los datos automáticamente', optional: true },
  { id: 'nombre',        title: '¿Cómo se llama el producto?',  subtitle: null, validate: f => !!f.nombre.trim(), validateMsg: 'El nombre es obligatorio' },
  { id: 'descripcion',   title: 'Describí el producto',         subtitle: 'Una frase corta que verán los clientes en la tienda', optional: true },
  { id: 'precios',       title: 'Precios y stock',              subtitle: null, validate: f => !!f.precioVenta, validateMsg: 'El precio de venta es obligatorio' },
  { id: 'clasificacion', title: 'Clasificación',                subtitle: 'Categoría, marca, condición y bodega', validate: f => !!f.categoriaId, validateMsg: 'La categoría es obligatoria' },
  { id: 'detalles',      title: 'Detalles del producto',        subtitle: 'Talla, garantía, SKU y código de barras', optional: true },
  { id: 'contenido',     title: 'Especificaciones y tags',      subtitle: 'Información técnica y etiquetas de búsqueda', optional: true },
  { id: 'seo',           title: 'SEO',                          subtitle: 'Cómo aparece este producto en Google', optional: true },
]

function toSlug(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

function CharCounter({ current, max, min = 0 }) {
  const color = current === 0 ? 'text-[#5e5e6e]' : current < min ? 'text-amber-400' : current > max ? 'text-red-400' : 'text-emerald-400'
  return <span className={`text-xs tabular-nums ${color}`}>{current}/{max}</span>
}

const inp = 'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm placeholder:text-[#8e8e9a]/40 focus:outline-none focus:border-[#4f7cff]/60 transition-all'
const ta  = 'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm placeholder:text-[#8e8e9a]/40 focus:outline-none focus:border-[#4f7cff]/60 resize-y transition-all'
const sel = 'w-full px-3 py-2.5 rounded-xl bg-[#111114] border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60 transition-all'

function Label({ children, required }) {
  return (
    <label className="text-xs text-[#8e8e9a] block mb-1.5">
      {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  )
}

function MultiUploadZone({ files, previews, onAddFiles, onRemove }) {
  const inputRef = useRef()
  const [dragging, setDragging] = useState(false)

  const handleFiles = useCallback((fileList) => {
    const remaining = MAX_FOTOS - files.length
    if (remaining <= 0) return
    const all = Array.from(fileList)
    const valid = all.filter(f => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024).slice(0, remaining)
    const dropped = all.length - valid.length
    if (valid.length > 0 || dropped > 0) onAddFiles(valid, dropped)
  }, [files.length, onAddFiles])

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  return (
    <div className="space-y-3">
      {previews.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {previews.map((src, idx) => (
            <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-[#1a1a1f] border border-white/8">
              <img src={src} alt={`foto ${idx + 1}`} className="w-full h-full object-cover" />
              {idx === 0 && (
                <span className="absolute bottom-0 inset-x-0 text-center text-[9px] bg-[#4f7cff]/80 text-white py-0.5">Principal</span>
              )}
              <button type="button" onClick={() => onRemove(idx)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] leading-none">
                ✕
              </button>
            </div>
          ))}
          {files.length < MAX_FOTOS && (
            <button type="button" onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-white/15 hover:border-[#4f7cff]/50 hover:bg-white/3 flex flex-col items-center justify-center gap-1 transition-all text-[#8e8e9a] hover:text-[#4f7cff]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[10px]">Agregar</span>
            </button>
          )}
        </div>
      )}

      {previews.length === 0 && (
        <button type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`w-full border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 ${
            dragging ? 'border-[#4f7cff] bg-[#4f7cff]/5' : 'border-white/15 hover:border-[#4f7cff]/50 hover:bg-white/3'
          }`}>
          <svg className="w-12 h-12 mx-auto mb-4 text-[#4f7cff]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="text-base font-semibold text-[#e8e8ed]">Arrastrá las fotos del producto aquí</p>
          <p className="text-sm text-[#8e8e9a] mt-1">o hacé clic para seleccionar · hasta {MAX_FOTOS} fotos</p>
          <p className="text-xs text-[#8e8e9a]/50 mt-0.5">JPG, PNG, WebP — máx 5 MB c/u</p>
        </button>
      )}

      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }} />

      {previews.length > 0 && (
        <p className="text-xs text-[#8e8e9a]">{files.length}/{MAX_FOTOS} fotos · la primera será la imagen principal</p>
      )}
    </div>
  )
}

function AnalisisProgress({ previews, currentIdx }) {
  const total = previews.length
  const progress = total > 0 ? Math.round((currentIdx / total) * 100) : 0
  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        <motion.div key={currentIdx} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.25 }}
          className="relative rounded-2xl overflow-hidden bg-[#1a1a1f] border border-white/8 aspect-video flex items-center justify-center">
          {previews[currentIdx] && (
            <img src={previews[currentIdx]} alt={`Imagen ${currentIdx + 1}`} className="max-h-72 max-w-full object-contain" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
              <span className="text-sm font-medium text-white">
                {currentIdx === 0 ? 'Analizando con Vision AI…' : `Procesando imagen ${currentIdx + 1}…`}
              </span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="flex items-center justify-between text-xs text-[#8e8e9a]">
        <span>Imagen {currentIdx + 1} de {total}</span><span>{progress}%</span>
      </div>
      <div className="h-1 rounded-full bg-white/8 overflow-hidden">
        <motion.div className="h-full bg-[#4f7cff] rounded-full" initial={{ width: 0 }}
          animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      </div>
      <div className="flex gap-2 flex-wrap">
        {previews.map((src, idx) => (
          <div key={idx} className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
            idx < currentIdx ? 'border-green-500/70 opacity-60' : idx === currentIdx ? 'border-[#4f7cff] scale-110' : 'border-white/10 opacity-30'
          }`}>
            <img src={src} alt="" className="w-full h-full object-cover" />
            {idx < currentIdx && (
              <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const KNOWN_TRADEMARKS = new Set([
  'nike','adidas','apple','samsung','sony','lg','nintendo','levi\'s','levis',
  'puma','reebok','under armour','underarmour','gucci','louis vuitton','rolex',
  'zara','h&m','ikea','microsoft','google','amazon','coca-cola','pepsi',
  'new balance','vans','converse','jordan','fila','bose','beats','dyson',
  'philips','hp','dell','lenovo','asus','acer',
])

const TAG_GROUPS = [
  { label: 'Ambiente', tags: ['sala','cocina','dormitorio','baño','jardín','oficina','comedor','terraza','garaje','lavandería'] },
  { label: 'Tipo de producto', tags: ['mueble','decoración','iluminación','textil','electrodoméstico','herramienta','arte','almacenamiento','colchón','espejo'] },
  { label: 'Estilo', tags: ['moderno','rústico','minimalista','clásico','industrial','bohemio','escandinavo','tropical'] },
  { label: 'Para quién', tags: ['niños','mascotas','adultos','familia','pareja','soltero','oficina en casa'] },
]

function TagSelector({ value, onChange }) {
  const selected = new Set((value || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean))
  function toggle(tag) {
    const next = new Set(selected)
    next.has(tag) ? next.delete(tag) : next.add(tag)
    onChange([...next].join(','))
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[#F4F6F9]">Tags del chat</label>
        {selected.size > 0 && (
          <button type="button" onClick={() => onChange('')} className="text-[10px] text-[#A7B0BC] hover:underline">
            Limpiar ({selected.size})
          </button>
        )}
      </div>
      {TAG_GROUPS.map(group => (
        <div key={group.label} className="space-y-1.5">
          <p className="text-[10px] font-medium text-[#A7B0BC]">{group.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {group.tags.map(tag => {
              const active = selected.has(tag)
              return (
                <button key={tag} type="button" onClick={() => toggle(tag)}
                  className="px-3 py-2 rounded-full text-xs font-medium transition-all min-h-[36px]"
                  style={{
                    backgroundColor: active ? 'var(--hc-accent, #4f7cff)' : 'rgba(255,255,255,0.07)',
                    color: active ? '#fff' : '#A7B0BC',
                    border: active ? '1px solid transparent' : '1px solid rgba(255,255,255,0.12)',
                  }}>
                  {tag}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <p className="text-[10px] text-[#A7B0BC]">
        Seleccioná los que mejor describen este producto. El chat los usa para recomendarlo.
        {selected.size > 0 && <span className="ml-1 text-[#4f7cff]">({selected.size} seleccionados)</span>}
      </p>
    </div>
  )
}

function MarcaCombobox({ marcas, value, onChange, showNuevaMarca, setShowNuevaMarca, nuevaMarca, setNuevaMarca, creandoMarca, onCrear }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef()

  const selected = marcas.find(m => String(m.id) === String(value))
  const filtered = marcas.filter(m => m.nombreMarca.toLowerCase().includes(search.toLowerCase()))

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (showNuevaMarca) {
    return (
      <div className="flex gap-2">
        <input className={inp} value={nuevaMarca} onChange={e => setNuevaMarca(e.target.value)}
          placeholder="Nombre de la nueva marca"
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), onCrear())}
          autoFocus />
        <button type="button" onClick={onCrear} disabled={creandoMarca || !nuevaMarca.trim()}
          className="shrink-0 px-4 py-2 rounded-xl bg-[#4f7cff] text-white text-sm font-medium disabled:opacity-40 transition-opacity">
          {creandoMarca ? '...' : 'Crear'}
        </button>
        <button type="button" onClick={() => setShowNuevaMarca(false)}
          className="shrink-0 px-3 py-2 rounded-xl border border-white/10 text-[#8e8e9a] text-sm">✕</button>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button type="button"
        onClick={() => { setOpen(o => !o); setSearch('') }}
        className={`${inp} flex items-center justify-between w-full text-left`}>
        <span className={selected ? 'text-[#e8e8ed]' : 'text-[#8e8e9a]/40'}>
          {selected ? selected.nombreMarca : '-- Sin marca --'}
        </span>
        <svg className={`w-4 h-4 text-[#8e8e9a] transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-xl bg-[#1a1a1f] border border-white/15 shadow-xl overflow-hidden">
          <div className="p-2 border-b border-white/8">
            <input className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[#e8e8ed] text-sm placeholder:text-[#8e8e9a]/40 focus:outline-none focus:border-[#4f7cff]/60"
              placeholder="Buscar marca…" value={search} onChange={e => setSearch(e.target.value)}
              autoFocus onClick={e => e.stopPropagation()} />
          </div>
          <div className="max-h-48 overflow-y-auto">
            <button type="button" onClick={() => { onChange(''); setOpen(false) }}
              className="w-full text-left px-4 py-2.5 text-sm text-[#8e8e9a] hover:bg-white/5 transition-colors">
              -- Sin marca --
            </button>
            {filtered.map(m => (
              <button key={m.id} type="button" onClick={() => { onChange(String(m.id)); setOpen(false) }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  String(m.id) === String(value) ? 'bg-[#4f7cff]/15 text-[#4f7cff]' : 'text-[#e8e8ed] hover:bg-white/5'
                }`}>
                {m.nombreMarca}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-4 py-3 text-sm text-[#8e8e9a]">Sin resultados</p>}
          </div>
          <div className="border-t border-white/8 p-2">
            <button type="button" onClick={() => { setShowNuevaMarca(true); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm text-[#4f7cff] hover:bg-[#4f7cff]/8 rounded-lg transition-colors">
              + Crear nueva marca
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Panel izquierdo con fotos o placeholder
function PhotoPanel({ previews, imagenes }) {
  const photos = previews.length > 0 ? previews : imagenes
  if (photos.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-[11px] font-semibold text-[#8e8e9a]/50 uppercase tracking-wider">Fotos del producto</p>
        <div className="aspect-square rounded-2xl border-2 border-dashed border-white/8 flex flex-col items-center justify-center gap-3 bg-white/2">
          <svg className="w-10 h-10 text-white/8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          <span className="text-xs text-[#8e8e9a]/25 text-center leading-relaxed">Las fotos<br/>aparecerán aquí</span>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold text-[#8e8e9a]/50 uppercase tracking-wider">
        {photos.length} foto{photos.length !== 1 ? 's' : ''}
      </p>
      <div className="aspect-square rounded-2xl overflow-hidden bg-[#1a1a1f] border border-white/8">
        <img src={photos[0]} alt="Principal" className="w-full h-full object-cover" />
      </div>
      {photos.length > 1 && (
        <div className="grid grid-cols-4 gap-1.5">
          {photos.slice(1, 9).map((src, idx) => (
            <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-[#1a1a1f] border border-white/8">
              <img src={src} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-[#8e8e9a]/35">Primera foto = imagen principal</p>
    </div>
  )
}

// Indicador de progreso de pasos
function WizardProgress({ step, steps }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#8e8e9a]">Paso {step + 1} de {steps.length}</span>
        {steps[step]?.optional && (
          <span className="text-[10px] text-[#8e8e9a]/50 bg-white/4 px-2 py-0.5 rounded-full border border-white/8">Opcional</span>
        )}
      </div>
      <div className="flex gap-1">
        {steps.map((_, idx) => (
          <div key={idx} className={`h-1 flex-1 rounded-full transition-all duration-300 ${
            idx < step ? 'bg-[#4f7cff]' : idx === step ? 'bg-[#4f7cff]/50' : 'bg-white/8'
          }`} />
        ))}
      </div>
    </div>
  )
}

export default function AdminNuevoProducto() {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()

  const [wizardStep, setWizardStep] = useState(0)
  const [done, setDone] = useState(false)
  const [validationMsg, setValidationMsg] = useState('')

  const [imagenesFile, setImagenesFile] = useState([])
  const [previewUrls, setPreviewUrls] = useState([])

  const [analizando, setAnalizando] = useState(false)
  const [analizandoIdx, setAnalizandoIdx] = useState(-1)
  const [etiquetas, setEtiquetas] = useState([])
  const [fuenteDetalles, setFuenteDetalles] = useState(null)

  const DRAFT_KEY = 'hotclick-draft-producto'
  const [tieneBorrador, setTieneBorrador] = useState(() => !!localStorage.getItem(DRAFT_KEY))
  const [autoSaveLabel, setAutoSaveLabel] = useState('')
  const draftTimerRef = useRef(null)

  const [form, setForm] = useState(EMPTY_FORM)
  const [categories, setCategories] = useState([])
  const [bodegas, setBodegas] = useState([])
  const [marcas, setMarcas] = useState([])
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [saving, setSaving] = useState(false)
  const [nuevaMarca, setNuevaMarca] = useState('')
  const [creandoMarca, setCreandoMarca] = useState(false)
  const [showNuevaMarca, setShowNuevaMarca] = useState(false)
  const [seoLang, setSeoLang] = useState('es')
  const [seoAuto, setSeoAuto] = useState({ es: true, en: true, pt: true, fr: true })
  const [priceWarning, setPriceWarning] = useState(false)
  const [productoCreado, setProductoCreado] = useState(null)
  const [trademarkWarning, setTrademarkWarning] = useState('')
  const idempotencyKey = useRef(crypto.randomUUID())

  useEffect(() => {
    setLoadingCatalog(true)
    Promise.all([
      productService.getCategories(),
      warehouseService.getAll(),
      marcaService.getAll(),
    ]).then(([catsR, bodsR, marcsR]) => {
      setCategories(catsR.data ?? [])
      const bods = Array.isArray(bodsR.data) ? bodsR.data : bodsR.data?.content ?? []
      setBodegas(bods)
      const ms = marcsR.data?.data ?? marcsR.data ?? []
      setMarcas(Array.isArray(ms) ? ms : [])
    }).catch(() => {
      toast({ message: 'Error al cargar categorías o bodegas. Recargá la página.', type: 'error' })
    }).finally(() => setLoadingCatalog(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const guardarBorrador = () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...form, imagenes: [] }))
      setTieneBorrador(true)
      toast({ message: 'Borrador guardado (las fotos no se incluyen)', type: 'success' })
    } catch { toast({ message: 'No se pudo guardar el borrador', type: 'error' }) }
  }

  const cargarBorrador = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      setForm({ ...EMPTY_FORM, ...JSON.parse(raw) })
      setWizardStep(1)
      toast({ message: 'Borrador cargado. Las fotos no se guardaron — volvé a subirlas si son necesarias.', type: 'warning' })
    } catch { toast({ message: 'Error al cargar el borrador', type: 'error' }) }
  }

  const limpiarBorrador = () => {
    localStorage.removeItem(DRAFT_KEY)
    setTieneBorrador(false)
    setForm(EMPTY_FORM)
  }

  useEffect(() => {
    if (!form.nombre && !form.descripcion && !form.precioVenta) return
    clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...form, imagenes: [] }))
        setTieneBorrador(true)
        setAutoSaveLabel('Guardado automáticamente')
        setTimeout(() => setAutoSaveLabel(''), 2500)
      } catch { /* incógnito o storage lleno */ }
    }, 800)
    return () => clearTimeout(draftTimerRef.current)
  }, [form]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const nombre = form.nombre || ''
    const precio = form.precioVenta ? Number(form.precioVenta).toLocaleString('es-CR') : ''
    const desc = form.descripcion || ''
    setForm(p => {
      const next = { ...p.seoByLang }
      if (seoAuto.es) next.es = {
        title: nombre ? `${nombre} | HotClick Outlet`.slice(0, 60) : '',
        description: desc ? `${desc}${precio ? ` | Precio: ₡${precio}` : ''} | Envíos a todo Costa Rica`.slice(0, 160) : '',
      }
      if (seoAuto.en) next.en = {
        title: nombre ? `${nombre} | HotClick Outlet`.slice(0, 60) : '',
        description: desc ? `${desc} | Free shipping in Costa Rica | HotClick`.slice(0, 160) : '',
      }
      if (seoAuto.pt) next.pt = {
        title: nombre ? `${nombre} | HotClick Outlet`.slice(0, 60) : '',
        description: desc ? `${desc} | Envio grátis pelo Costa Rica | HotClick`.slice(0, 160) : '',
      }
      if (seoAuto.fr) next.fr = {
        title: nombre ? `${nombre} | HotClick Outlet`.slice(0, 60) : '',
        description: desc ? `${desc} | Livraison gratuite au Costa Rica | HotClick`.slice(0, 160) : '',
      }
      return { ...p, metaTitle: next.es.title, metaDescription: next.es.description, seoByLang: next }
    })
  }, [form.nombre, form.descripcion, form.precioVenta, JSON.stringify(seoAuto)]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCrearMarca = async () => {
    if (!nuevaMarca.trim()) return
    setCreandoMarca(true)
    try {
      const res = await marcaService.create({ nombreMarca: nuevaMarca.trim() })
      const m = res.data?.data ?? res.data
      setMarcas(prev => [...prev, m])
      setForm(prev => ({ ...prev, marcaId: String(m.id) }))
      setNuevaMarca('')
      setShowNuevaMarca(false)
      toast({ message: `Marca "${m.nombreMarca}" creada`, type: 'success' })
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al crear marca', type: 'error' })
    } finally { setCreandoMarca(false) }
  }

  useEffect(() => {
    return () => { previewUrls.forEach(url => URL.revokeObjectURL(url)) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddFiles = useCallback((files, silentlyDropped = 0) => {
    if (silentlyDropped > 0) {
      toast({ message: `Límite de ${MAX_FOTOS} fotos alcanzado — ${silentlyDropped} foto${silentlyDropped > 1 ? 's' : ''} no se agregó${silentlyDropped > 1 ? 'aron' : ''}.`, type: 'warning' })
    }
    if (files.length === 0) return
    const newPreviews = files.map(f => URL.createObjectURL(f))
    setImagenesFile(prev => [...prev, ...files])
    setPreviewUrls(prev => [...prev, ...newPreviews])
  }, [toast])

  const handleRemoveFile = useCallback((idx) => {
    URL.revokeObjectURL(previewUrls[idx])
    setImagenesFile(prev => prev.filter((_, i) => i !== idx))
    setPreviewUrls(prev => prev.filter((_, i) => i !== idx))
  }, [previewUrls])

  const handleAnalizar = async () => {
    if (imagenesFile.length === 0) {
      toast({ message: 'Seleccioná al menos una imagen', type: 'error' })
      return
    }
    setAnalizando(true)
    try {
      const fdAnalisis = new FormData()
      imagenesFile.forEach(f => fdAnalisis.append('imagenes', f))

      const uploadPromises = imagenesFile.map((f) => {
        const fd = new FormData()
        fd.append('file', f)
        return productService.uploadImage(fd)
          .then(r => r.data?.data?.url ?? r.data?.url ?? '')
          .catch(() => '')
      })

      const [analyzeRes, ...uploadResults] = await Promise.allSettled([
        publicacionService.detallesProducto(fdAnalisis),
        ...uploadPromises,
      ])

      for (let i = 0; i < imagenesFile.length; i++) setAnalizandoIdx(i)

      const uploadedUrls = uploadResults
        .filter(r => r.status === 'fulfilled' && r.value && typeof r.value === 'string')
        .map(r => r.value)

      const failedCount = imagenesFile.length - uploadedUrls.length
      if (failedCount > 0) {
        toast({ message: `${failedCount} foto${failedCount > 1 ? 's' : ''} no se pudo${failedCount > 1 ? 'ieron' : ''} subir`, type: 'warning' })
      }

      let analysisData = null
      if (analyzeRes.status === 'fulfilled') {
        analysisData = analyzeRes.value.data?.data ?? analyzeRes.value.data
      } else {
        toast({ message: 'Análisis IA no disponible — completá el formulario manualmente', type: 'warning' })
      }

      const d = analysisData ?? {}
      setEtiquetas(d.todasEtiquetas ?? [])
      setFuenteDetalles(d.fuenteDetalles ?? null)

      const marcaDetectada = d.marca ?? ''
      const marcaMatch = marcaDetectada
        ? marcas.find(m => m.nombreMarca.toLowerCase() === marcaDetectada.toLowerCase())
        : null

      const aiEtiquetas = (d.todasEtiquetas ?? []).map(e => e.toLowerCase())
      let categoriaAutoId = ''
      if (categories.length > 0 && aiEtiquetas.length > 0) {
        const catMatch = categories.find(c => {
          const catName = (c.nombreCategoria ?? c.nombre ?? '').toLowerCase()
          return aiEtiquetas.some(tag => catName.includes(tag) || tag.includes(catName))
        })
        if (catMatch) categoriaAutoId = String(catMatch.id)
      }

      const nombreIA = (d.nombre ?? '').slice(0, 80)
      setForm(prev => ({
        ...prev,
        nombre:           nombreIA,
        titulo:           (d.titulo ?? nombreIA).slice(0, 40),
        descripcion:      d.descripcionCorta ?? '',
        descripcionLarga: d.descripcionLarga ?? '',
        especificaciones: d.especificaciones ?? '',
        comoUsar:         d.comoUsar         ?? '',
        marcaId:          marcaMatch ? String(marcaMatch.id) : '',
        precioVenta:      d.precioSugerido > 0 ? String(d.precioSugerido) : '',
        bodegaId:         bodegas[0]?.id ? String(bodegas[0].id) : '',
        talla:            d.talla        ?? '',
        imagenUrl:        uploadedUrls[0] ?? '',
        imagenes:         uploadedUrls,
        categoriaId:      categoriaAutoId,
      }))

      const marcaRaw = (d.marca ?? '').toLowerCase().trim()
      setTrademarkWarning(
        marcaRaw && KNOWN_TRADEMARKS.has(marcaRaw)
          ? `La IA detectó la marca "${d.marca}". Verificá que tenés autorización para revender productos de esta marca.`
          : ''
      )
      setWizardStep(1)
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al procesar imágenes', type: 'error' })
    } finally {
      setAnalizando(false)
      setAnalizandoIdx(-1)
    }
  }

  const handleSave = async () => {
    if (!form.categoriaId) {
      toast({ message: 'Seleccioná una categoría', type: 'error' })
      setWizardStep(4)
      return
    }
    if (!form.bodegaId && bodegas.length > 0) {
      toast({ message: 'Seleccioná una bodega', type: 'error' })
      setWizardStep(4)
      return
    }

    const compra = Number(form.precioCompra)
    const venta = Number(form.precioVenta)
    if (compra > 0 && venta > 0 && compra > venta && !priceWarning) {
      setPriceWarning(true)
      toast({ message: `El precio de compra (₡${compra.toLocaleString('es-CR')}) supera al de venta. Corregí los precios o publicá de nuevo para confirmar.`, type: 'warning' })
      return
    }

    setSaving(true)
    try {
      const imagenUrl = form.imagenes[0] ?? form.imagenUrl ?? ''
      const sl = form.seoByLang ?? {}
      const dto = denormalizeProduct({
        ...form, imagenUrl,
        metaTitle:         sl.es?.title       || form.metaTitle        || '',
        metaDescription:   sl.es?.description || form.metaDescription  || '',
        metaKeywords:      form.metaKeywords   || '',
        tags:              form.tags           || '',
        metaTitleEn:       sl.en?.title        || '',
        metaTitlePt:       sl.pt?.title        || '',
        metaTitleFr:       sl.fr?.title        || '',
        metaDescriptionEn: sl.en?.description  || '',
        metaDescriptionPt: sl.pt?.description  || '',
        metaDescriptionFr: sl.fr?.description  || '',
      })
      // 2+ tallas marcadas -> mismo producto en varias filas (una por talla), agrupadas
      // como variantes (mismo mecanismo que ya se usa para colores en el import).
      const paresTalla = (form.tallasCantidad || []).filter(x => x.talla && Number(x.cantidad) > 0)
      let productoId, pendienteAprobacion

      if (paresTalla.length > 1) {
        const grupoVarianteId = crypto.randomUUID()
        for (const par of paresTalla) {
          const dtoTalla = { ...dto, talla: par.talla, stockActual: Number(par.cantidad), grupoVarianteId }
          const res = await productService.create(dtoTalla, { headers: { 'X-Idempotency-Key': crypto.randomUUID() } })
          const creado = res.data?.data ?? res.data
          if (creado?.id && form.imagenes.length > 0) {
            try { await productService.sincronizarImagenes(creado.id, form.imagenes) } catch { /* se avisa una sola vez abajo */ }
          }
          if (!productoId) { productoId = creado?.id; pendienteAprobacion = creado?.visibleCatalogo === false }
        }
      } else {
        const dtoFinal = paresTalla.length === 1
          ? { ...dto, talla: paresTalla[0].talla, stockActual: Number(paresTalla[0].cantidad) }
          : dto
        const res = await productService.create(dtoFinal, { headers: { 'X-Idempotency-Key': idempotencyKey.current } })
        const productoCreadoData = res.data?.data ?? res.data
        productoId = productoCreadoData?.id
        pendienteAprobacion = productoCreadoData?.visibleCatalogo === false

        if (productoId && form.imagenes.length > 0) {
          try {
            await productService.sincronizarImagenes(productoId, form.imagenes)
          } catch {
            toast({ message: 'Producto creado pero hubo un error al guardar las fotos. Editá el producto para agregarlas.', type: 'warning' })
          }
        }
      }

      try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignorar */ }
      setTieneBorrador(false)
      setProductoCreado({ id: productoId, nombre: form.nombre, imagen: imagenUrl, pendienteAprobacion })
      setDone(true)

      const seoTitle = sl.es?.title || form.metaTitle || ''
      if (seoTitle && productoId) {
        productService.adminGetAll(0, 200).then(r => {
          const lista = r.data?.content ?? (Array.isArray(r.data) ? r.data : [])
          const dupes = lista.filter(p => p.metaTitle === seoTitle && p.id !== productoId)
          if (dupes.length > 0) {
            toast({ message: `El título SEO "${seoTitle.slice(0, 45)}…" ya existe en otro producto. Editalo para diferenciarlo.`, type: 'warning' })
          }
        }).catch(() => {})
      }
    } catch (err) {
      const status = err.response?.status
      if (status === 409) {
        toast({ message: 'Este producto ya fue publicado en otra pestaña. Actualizá la página.', type: 'warning' })
        setDone(true)
      } else {
        toast({ message: err.response?.data?.message ?? 'Error al guardar', type: 'error' })
      }
    } finally { setSaving(false) }
  }

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))
  const sinBodegas = !loadingCatalog && bodegas.length === 0

  const handleNext = () => {
    const step = STEPS[wizardStep]
    if (step?.validate && !step.validate(form)) {
      setValidationMsg(step.validateMsg)
      return
    }
    setValidationMsg('')
    if (wizardStep < STEPS.length - 1) setWizardStep(s => s + 1)
  }

  const handlePrev = () => {
    setValidationMsg('')
    if (wizardStep > 0) setWizardStep(s => s - 1)
  }

  const handleReset = () => {
    setForm(EMPTY_FORM)
    setImagenesFile([])
    setPreviewUrls([])
    setProductoCreado(null)
    setTrademarkWarning('')
    setEtiquetas([])
    setPriceWarning(false)
    idempotencyKey.current = crypto.randomUUID()
    setWizardStep(0)
    setDone(false)
  }

  const renderStepContent = () => {
    const id = STEPS[wizardStep]?.id

    // ── Fotos ──
    if (id === 'fotos') return (
      <div className="space-y-4">
        {tieneBorrador && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(23,71,168,0.08)', border: '1px solid rgba(23,71,168,0.25)' }}>
            <svg className="w-4 h-4 text-[#4f7cff] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span style={{ color: '#a0b4ff' }} className="flex-1 text-xs">Tenés un borrador guardado.</span>
            <button onClick={cargarBorrador} className="text-xs font-semibold px-3 py-1 rounded-lg"
              style={{ background: 'var(--hc-accent)', color: '#fff' }}>Cargar</button>
            <button onClick={limpiarBorrador} className="text-xs px-2 py-1 rounded-lg text-[#A7B0BC]">Descartar</button>
          </div>
        )}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span style={{ color: '#fde68a' }} className="text-xs">
            <strong>Subí fotos</strong> y la IA detectará nombre, precio, categoría y descripción automáticamente.
          </span>
        </div>
        {!analizando ? (
          <>
            <MultiUploadZone files={imagenesFile} previews={previewUrls} onAddFiles={handleAddFiles} onRemove={handleRemoveFile} />
            <div className="flex flex-col gap-3 pt-1">
              {imagenesFile.length > 0 && (
                <Button onClick={handleAnalizar}>
                  {t('admin.nuevoProducto.analyze')}
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-white/10 text-xs font-semibold">{imagenesFile.length}</span>
                </Button>
              )}
              <button type="button" onClick={() => setWizardStep(1)}
                className="w-full py-3 rounded-xl border border-white/10 text-[#8e8e9a] hover:text-white hover:bg-white/5 text-sm transition-colors">
                {imagenesFile.length > 0 ? 'Continuar sin analizar →' : 'Ingresar sin fotos →'}
              </button>
            </div>
            <p className="text-xs text-center text-[#8e8e9a]/50">
              ¿Tenés muchos productos?{' '}
              <a href="/admin/productos" className="text-[#4f7cff]/80 hover:text-[#4f7cff] underline transition-colors">
                Importalos desde CSV
              </a>
            </p>
          </>
        ) : (
          <AnalisisProgress previews={previewUrls} currentIdx={analizandoIdx} />
        )}
      </div>
    )

    // ── Nombre ──
    if (id === 'nombre') return (
      <div className="space-y-5">
        {trademarkWarning && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
            style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span className="text-amber-200 text-xs">{trademarkWarning}</span>
          </div>
        )}
        <div>
          <Label required>Nombre del producto</Label>
          <input className={inp} value={form.nombre} onChange={set('nombre')}
            placeholder="Ej: Tenis Nike Air Max 90 Blanco" autoFocus maxLength={80} />
          <p className={`text-xs mt-1 text-right ${form.nombre.length >= 72 ? 'text-amber-500' : 'text-[#8e8e9a]/50'}`}>
            {form.nombre.length}/80
          </p>
        </div>
        <div>
          <Label>Título para FB Marketplace</Label>
          <input className={inp} value={form.titulo} onChange={set('titulo')}
            placeholder="Ej: Tenis Nike Air Max Blanco" maxLength={40} />
          <p className={`text-xs mt-1 text-right ${form.titulo.length >= 36 ? 'text-amber-500' : 'text-[#8e8e9a]/50'}`}>
            {form.titulo.length}/40
          </p>
        </div>
      </div>
    )

    // ── Descripción ──
    if (id === 'descripcion') return (
      <div className="space-y-4">
        <div>
          <Label>Descripción corta</Label>
          <textarea className={ta} rows={4} value={form.descripcion} onChange={set('descripcion')}
            placeholder="Ej: Tenis running con suela de aire, talla 42, color blanco." maxLength={200} autoFocus />
          <p className={`text-xs mt-1 text-right ${form.descripcion.length >= 180 ? 'text-amber-500' : 'text-[#8e8e9a]/50'}`}>
            {form.descripcion.length}/200
          </p>
        </div>
        <div>
          <Label>Descripción larga <span className="text-[#8e8e9a] font-normal">(opcional)</span></Label>
          <textarea className={ta} rows={5} value={form.descripcionLarga} onChange={set('descripcionLarga')}
            placeholder="Descripción completa del producto…" maxLength={2000} />
        </div>
      </div>
    )

    // ── Precios ──
    if (id === 'precios') {
      const compra = Number(form.precioCompra)
      const venta  = Number(form.precioVenta)
      const margen = venta - compra
      const margenPct = compra > 0 ? ((margen / compra) * 100).toFixed(1) : null
      return (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required>Precio de compra (₡)</Label>
              <input className={inp} type="number" value={form.precioCompra}
                onChange={e => { set('precioCompra')(e); setPriceWarning(false) }}
                placeholder="0" min="0" autoFocus />
              <p className="text-xs mt-1 text-[#8e8e9a]/60">Lo que pagaste</p>
            </div>
            <div>
              <Label required>Precio de venta (₡)</Label>
              <input className={`${inp} ${priceWarning ? 'border-amber-500/60' : ''}`} type="number" value={form.precioVenta}
                onChange={e => { set('precioVenta')(e); setPriceWarning(false) }}
                placeholder="0" min="0" />
              <p className="text-xs mt-1 text-[#8e8e9a]/60">Lo que paga el cliente</p>
            </div>
          </div>
          {compra > 0 && venta > 0 && (
            <div className={`px-4 py-3 rounded-xl text-xs ${
              margen < 0
                ? 'bg-red-500/10 border border-red-500/25 text-red-300'
                : 'bg-[#4f7cff]/8 border border-[#4f7cff]/20 text-[#a0b4ff]'
            }`}>
              {margen < 0
                ? 'Estás vendiendo a pérdida — el precio de compra supera al de venta.'
                : `Margen: ₡${margen.toLocaleString('es-CR')}${margenPct ? ` (${margenPct}%)` : ''}`
              }
            </div>
          )}
          <div className="w-36">
            <Label>Stock inicial</Label>
            <input className={inp} type="number" value={form.stock} onChange={set('stock')} placeholder="1" min="0" />
          </div>
        </div>
      )
    }

    // ── Clasificación ──
    if (id === 'clasificacion') return (
      <div className="space-y-5">
        <div>
          <Label>Condición</Label>
          <select className={sel} value={form.condicion} onChange={set('condicion')}>
            <option value="NUEVO">Nuevo</option>
            <option value="COMO_NUEVO">Como nuevo</option>
            <option value="USADO">Usado</option>
          </select>
        </div>
        <div>
          <Label required>Categoría</Label>
          {loadingCatalog ? (
            <div className={`${sel} flex items-center gap-2 text-[#8e8e9a]`}>
              <span className="w-3 h-3 border-2 border-[#8e8e9a]/30 border-t-[#8e8e9a] rounded-full animate-spin shrink-0" />
              <span>Cargando…</span>
            </div>
          ) : categories.length === 0 ? (
            <div className={`${sel} text-red-400 text-sm`}>Sin categorías — recargá la página</div>
          ) : (
            <select className={sel} value={form.categoriaId} onChange={set('categoriaId')} required>
              <option value="">-- Seleccionar --</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.nombreCategoria ?? c.nombre}</option>
              ))}
            </select>
          )}
        </div>
        <div>
          <Label required={bodegas.length > 0}>Bodega / Ubicación</Label>
          {sinBodegas ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <span className="text-amber-300 text-xs flex-1">Sin bodegas creadas — creá una para poder guardar el producto.</span>
              <a href="/admin/bodegas" className="text-xs font-semibold px-3 py-1 rounded-lg"
                style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24' }}>Crear →</a>
            </div>
          ) : loadingCatalog ? (
            <div className={`${sel} flex items-center gap-2 text-[#8e8e9a]`}>
              <span className="w-3 h-3 border-2 border-[#8e8e9a]/30 border-t-[#8e8e9a] rounded-full animate-spin shrink-0" />
              <span>Cargando…</span>
            </div>
          ) : bodegas.length === 1 ? (
            <div className={`${sel} text-[#e8e8ed]`}>{bodegas[0].nombreBodega ?? bodegas[0].nombre}</div>
          ) : (
            <select className={sel} value={form.bodegaId} onChange={set('bodegaId')} required>
              <option value="">-- Seleccionar --</option>
              {bodegas.map(b => (
                <option key={b.id} value={b.id}>{b.nombreBodega ?? b.nombre}</option>
              ))}
            </select>
          )}
        </div>
        <div>
          <Label>Marca</Label>
          <MarcaCombobox
            marcas={marcas} value={form.marcaId}
            onChange={v => setForm(p => ({ ...p, marcaId: v }))}
            showNuevaMarca={showNuevaMarca} setShowNuevaMarca={setShowNuevaMarca}
            nuevaMarca={nuevaMarca} setNuevaMarca={setNuevaMarca}
            creandoMarca={creandoMarca} onCrear={handleCrearMarca}
          />
        </div>
      </div>
    )

    // ── Detalles ──
    if (id === 'detalles') return (
      <div className="space-y-5">
        <div>
          <Label>Talla <span className="text-[#8e8e9a] font-normal">(marcá las que tengas en stock y cuántas — dejá todo vacío si no aplica)</span></Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {['XS','S','M','L','XL','XXL','XXXL','35','36','37','38','39','40','41','42','43','44','45'].map(t => {
              const par = (form.tallasCantidad || []).find(x => x.talla === t)
              return (
                <div key={t} className="flex items-center gap-1">
                  <button type="button"
                    onClick={() => setForm(p => {
                      const actuales = p.tallasCantidad || []
                      const yaEsta = actuales.some(x => x.talla === t)
                      return { ...p, tallasCantidad: yaEsta ? actuales.filter(x => x.talla !== t) : [...actuales, { talla: t, cantidad: 1 }] }
                    })}
                    className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all min-h-[44px] min-w-[44px] ${
                      par
                        ? 'bg-[#4f7cff]/20 border-[#4f7cff]/60 text-[#4f7cff]'
                        : 'bg-white/4 border-white/10 text-[#8e8e9a] hover:border-white/25 hover:text-white'
                    }`}>{t}</button>
                  {par && (
                    <input type="number" min="0" value={par.cantidad}
                      onChange={e => setForm(p => ({
                        ...p,
                        tallasCantidad: (p.tallasCantidad || []).map(x => x.talla === t ? { ...x, cantidad: e.target.value } : x),
                      }))}
                      className={`${inp} w-16 text-center`} title={`Cantidad en talla ${t}`} />
                  )}
                </div>
              )
            })}
          </div>
          <input className={`${inp} w-28`} value={form.talla} onChange={set('talla')} placeholder="Otra talla (una sola)…"
            maxLength={20} disabled={(form.tallasCantidad || []).length > 0} />
          {(form.tallasCantidad || []).length > 1 && (
            <p className="text-xs text-[#8e8e9a] mt-2">
              Se van a crear {form.tallasCantidad.length} productos (mismo nombre, foto y precio), uno por cada talla marcada.
            </p>
          )}
        </div>
        <div>
          <Label>Días de garantía <span className="text-[#8e8e9a] font-normal">(0 = sin garantía)</span></Label>
          <div className="flex items-center gap-3 flex-wrap">
            <input className={`${inp} w-36`} type="number" value={form.garantiaDias} onChange={set('garantiaDias')} placeholder="0" min="0" />
            <div className="flex gap-2 flex-wrap">
              {[0, 30, 90, 180, 365].map(d => (
                <button key={d} type="button" onClick={() => setForm(p => ({ ...p, garantiaDias: String(d) }))}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all min-h-[36px] ${
                    String(form.garantiaDias) === String(d)
                      ? 'bg-[#4f7cff]/20 border-[#4f7cff]/60 text-[#4f7cff]'
                      : 'bg-white/4 border-white/10 text-[#8e8e9a] hover:border-white/25 hover:text-white'
                  }`}>
                  {d === 0 ? 'Sin' : d === 365 ? '1 año' : `${d}d`}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>SKU <span className="text-[#8e8e9a] font-normal">(código interno)</span></Label>
            <input className={inp} type="text" value={form.sku ?? ''} onChange={set('sku')} placeholder="Ej: HC-001" />
          </div>
          <div>
            <Label>Barcode <span className="text-[#8e8e9a] font-normal">(EAN / UPC)</span></Label>
            <input className={inp} type="text" value={form.barcode ?? ''} onChange={set('barcode')} placeholder="Ej: 7501234567890" />
          </div>
        </div>
      </div>
    )

    // ── Contenido ──
    if (id === 'contenido') return (
      <div className="space-y-5">
        <div>
          <Label>Especificaciones técnicas</Label>
          <textarea className={ta} rows={5} value={form.especificaciones} onChange={set('especificaciones')}
            placeholder={'Marca: \nModelo: \nMaterial: \nTalla: \nColor: '} maxLength={500} autoFocus />
          <p className={`text-xs mt-1 text-right ${form.especificaciones.length >= 450 ? 'text-amber-500' : 'text-[#8e8e9a]/50'}`}>
            {form.especificaciones.length}/500
          </p>
        </div>
        <div>
          <Label>Cómo usar / cuidados</Label>
          <textarea className={ta} rows={3} value={form.comoUsar} onChange={set('comoUsar')}
            placeholder="Ej: Lavar a mano. No usar secadora." maxLength={150} />
          <p className={`text-xs mt-1 text-right ${form.comoUsar.length >= 135 ? 'text-amber-500' : 'text-[#8e8e9a]/50'}`}>
            {form.comoUsar.length}/150
          </p>
        </div>
        <TagSelector value={form.tags ?? ''} onChange={v => setForm(p => ({ ...p, tags: v }))} />
      </div>
    )

    // ── SEO ──
    if (id === 'seo') {
      const langMeta   = SEO_LANGS.find(l => l.code === seoLang)
      const currentSeo = form.seoByLang[seoLang] ?? { title: '', description: '' }
      const isEs       = seoLang === 'es'

      const handleTitleChange = (val) => {
        setSeoAuto(prev => ({ ...prev, [seoLang]: false }))
        setForm(p => ({ ...p, metaTitle: isEs ? val : p.metaTitle, seoByLang: { ...p.seoByLang, [seoLang]: { ...p.seoByLang[seoLang], title: val } } }))
      }
      const handleDescChange = (val) => {
        setSeoAuto(prev => ({ ...prev, [seoLang]: false }))
        setForm(p => ({ ...p, metaDescription: isEs ? val : p.metaDescription, seoByLang: { ...p.seoByLang, [seoLang]: { ...p.seoByLang[seoLang], description: val } } }))
      }

      return (
        <div className="space-y-4">
          <p className="text-xs text-[#8e8e9a]">Google mostrará el contenido según el país del visitante.</p>
          <div className="flex gap-1.5 flex-wrap" role="tablist">
            {SEO_LANGS.map(l => {
              const filled = !!(form.seoByLang[l.code]?.title)
              const active = seoLang === l.code
              return (
                <button key={l.code} type="button" role="tab" aria-selected={active} onClick={() => setSeoLang(l.code)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    active ? 'bg-[#4f7cff]/15 border-[#4f7cff]/40 text-[#4f7cff]' : 'bg-white/4 border-white/10 text-[#8e8e9a] hover:text-[#e8e8ed] hover:bg-white/6'
                  }`}>
                  <span>{l.flag}</span><span>{l.label}</span>
                  {filled && !active && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                </button>
              )
            })}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-[#8e8e9a]">Título SEO</label>
                {seoAuto[seoLang] && <span className="text-[10px] text-[#4f7cff]">auto</span>}
              </div>
              <CharCounter current={currentSeo.title.length} max={60} min={30} />
            </div>
            <input className={inp} value={currentSeo.title} maxLength={60}
              placeholder={isEs ? 'Nombre del producto | HotClick Outlet' : 'Product name | HotClick Outlet'}
              onChange={e => handleTitleChange(e.target.value)} autoFocus />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-[#8e8e9a]">Meta Descripción</label>
                {seoAuto[seoLang] && <span className="text-[10px] text-[#4f7cff]">auto</span>}
              </div>
              <CharCounter current={currentSeo.description.length} max={160} min={120} />
            </div>
            <textarea className={ta} rows={3} value={currentSeo.description} maxLength={160}
              placeholder={isEs ? 'Descripción | Precio: ₡X | Envíos a todo Costa Rica' : 'Description | Free shipping'}
              onChange={e => handleDescChange(e.target.value)} />
          </div>
          {form.nombre && (
            <div>
              <p className="text-xs text-[#8e8e9a] mb-1.5">URL generada</p>
              <p className="text-xs text-[#4f7cff] bg-[#4f7cff]/8 border border-[#4f7cff]/20 rounded-xl px-3 py-2 font-mono truncate">
                hotclick.com/productos/{toSlug(form.nombre) || '…'}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-[#8e8e9a] mb-1.5">Vista previa Google · {langMeta?.flag} {langMeta?.name}</p>
            <div className="rounded-xl bg-white px-4 py-3 space-y-0.5">
              <p className="text-xs text-green-700 truncate">hotclick.com › productos › {form.nombre ? toSlug(form.nombre) : '…'}</p>
              <p className="text-base text-blue-700 truncate leading-snug">{currentSeo.title || `Título SEO en ${langMeta?.name}`}</p>
              <p className="text-sm text-[#4d5156] line-clamp-2 leading-snug">{currentSeo.description || 'La meta descripción aparecerá aquí…'}</p>
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  // ── Pantalla de éxito ──
  if (done) {
    return (
      <div className="space-y-6 text-center py-8 max-w-xs mx-auto">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${productoCreado?.pendienteAprobacion ? 'bg-amber-500/15 border border-amber-500/30' : 'bg-emerald-500/15 border border-emerald-500/30'}`}>
          {productoCreado?.pendienteAprobacion ? (
            <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <circle cx="12" cy="12" r="9"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3"/>
            </svg>
          ) : (
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          )}
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#e8e8ed]">
            {productoCreado?.pendienteAprobacion ? 'Producto enviado a revisión' : '¡Producto publicado!'}
          </h2>
          <p className="text-sm text-[#8e8e9a] mt-1">{productoCreado?.nombre}</p>
          {productoCreado?.pendienteAprobacion && (
            <p className="text-xs text-amber-400/90 mt-2">
              Un admin lo va a revisar antes de que aparezca en el catálogo público. Te avisamos cuando esté aprobado.
            </p>
          )}
        </div>
        {productoCreado?.imagen && (
          <img src={productoCreado.imagen} alt=""
            className="w-28 h-28 object-cover rounded-2xl mx-auto border border-white/10" />
        )}
        <div className="flex flex-col gap-3">
          <Button onClick={() => navigate('/admin/productos')}>Ver todos los productos</Button>
          <button type="button" onClick={handleReset}
            className="py-2.5 rounded-xl border border-white/10 text-[#8e8e9a] hover:text-white hover:bg-white/5 text-sm transition-colors">
            Agregar otro producto
          </button>
        </div>
        <div className="text-left rounded-xl bg-[#4f7cff]/8 border border-[#4f7cff]/20 p-4 space-y-2">
          <p className="text-xs font-semibold text-[#4f7cff]">Hacelo aún mejor</p>
          <ul className="text-xs text-[#8e8e9a] space-y-1.5">
            <li>• Editalo para añadir descripción larga y especificaciones</li>
            <li>• Activalo en el carrusel para más visibilidad en la tienda</li>
            {!form.seoByLang?.es?.title && <li>• Configurá el SEO para aparecer en Google</li>}
          </ul>
        </div>
      </div>
    )
  }

  const isLastStep = wizardStep === STEPS.length - 1
  const canQuickPublish = wizardStep >= 4 && !isLastStep && !!form.nombre && !!form.categoriaId

  // ── Layout principal: foto izquierda / wizard derecha ──
  return (
    <div className="flex -mx-4 -my-4 md:-mx-6 md:-mt-6 lg:-mx-8 min-h-[calc(100vh-3.5rem)] md:min-h-screen">

      {/* Panel izquierdo: fotos (solo desktop) */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 border-r border-white/8 p-6 pt-8">
        <div className="flex-1">
          <PhotoPanel previews={previewUrls} imagenes={form.imagenes} />
        </div>
        <div className="mt-6 pt-6 border-t border-white/8">
          <p className="text-[10px] text-[#8e8e9a]/50 mb-2">Creando como:</p>
          <EmpresaProfileCard />
        </div>
      </aside>

      {/* Panel derecho: wizard */}
      <div className="flex-1 min-w-0 flex flex-col px-4 py-6 md:px-8 md:py-8">
        <div className="w-full max-w-lg mx-auto lg:mx-0 flex-1 flex flex-col">

          {/* Barra de progreso */}
          <WizardProgress step={wizardStep} steps={STEPS} />

          {/* Título del paso */}
          <div className="mt-6 mb-6">
            <h1 className="text-2xl font-bold text-[#e8e8ed]">{STEPS[wizardStep].title}</h1>
            {STEPS[wizardStep].subtitle && (
              <p className="text-sm text-[#8e8e9a] mt-1">{STEPS[wizardStep].subtitle}</p>
            )}
          </div>

          {/* Banner etiquetas IA (solo pasos intermedios) */}
          {etiquetas.length > 0 && wizardStep > 0 && !isLastStep && (
            <div className="mb-5 rounded-xl bg-[#4f7cff]/8 border border-[#4f7cff]/20 px-4 py-3 flex items-center gap-3">
              <svg className="w-4 h-4 text-[#4f7cff] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
              <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                {etiquetas.slice(0, 5).map((e, i) => (
                  <span key={i} className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    i === 0 ? 'bg-[#4f7cff]/20 text-[#4f7cff] border border-[#4f7cff]/30' : 'bg-white/5 text-[#8e8e9a] border border-white/10'
                  }`}>{e}</span>
                ))}
              </div>
              {fuenteDetalles && <span className="text-[10px] text-[#8e8e9a]/50 shrink-0">via {fuenteDetalles}</span>}
            </div>
          )}

          {/* Mensaje de validación */}
          {validationMsg && (
            <div className="mb-5 flex items-center gap-2 px-4 py-3 rounded-xl text-xs bg-red-500/10 border border-red-500/25 text-red-300">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {validationMsg}
            </div>
          )}

          {/* Contenido del paso actual con animación */}
          <AnimatePresence mode="wait">
            <motion.div key={wizardStep}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}>
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>

          {/* Navegación Anterior / Siguiente (solo desde paso 1 en adelante) */}
          {wizardStep > 0 && !analizando && (
            <div className="mt-8 flex items-center gap-3 flex-wrap">
              <button onClick={handlePrev}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/10 text-[#8e8e9a] hover:text-white hover:bg-white/5 text-sm transition-colors shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Anterior
              </button>

              {isLastStep ? (
                <Button onClick={handleSave} disabled={saving || sinBodegas} className="flex-1">
                  {saving
                    ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" />Publicando…</span>
                    : sinBodegas ? 'Creá una bodega primero' : 'Publicar producto'
                  }
                </Button>
              ) : (
                <Button onClick={handleNext} className="flex-1">
                  Siguiente
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </Button>
              )}

              {autoSaveLabel && (
                <span className="text-xs text-emerald-400/80 flex items-center gap-1 shrink-0">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                  </svg>
                  {autoSaveLabel}
                </span>
              )}
            </div>
          )}

          {/* Publicar rápido / Guardar borrador — disponible desde clasificación */}
          {canQuickPublish && (
            <div className="mt-4 flex items-center gap-4">
              <button type="button" onClick={handleSave} disabled={saving}
                className="text-sm text-[#4f7cff] hover:text-[#7fa5ff] transition-colors disabled:opacity-50">
                {saving ? 'Publicando…' : 'Publicar ahora →'}
              </button>
              <span className="text-[#8e8e9a]/20 text-xs">·</span>
              <button type="button" onClick={guardarBorrador}
                className="text-sm text-[#8e8e9a]/50 hover:text-[#8e8e9a] transition-colors">
                Guardar borrador
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
