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
import MultiImagePicker from '@/components/ui/MultiImagePicker'

const MAX_FOTOS = 10

const SEO_LANGS = [
  { code: 'es', flag: '🇨🇷', label: 'ES', name: 'Español' },
  { code: 'en', flag: '🇺🇸', label: 'EN', name: 'English' },
  { code: 'pt', flag: '🇧🇷', label: 'PT', name: 'Português' },
  { code: 'fr', flag: '🇫🇷', label: 'FR', name: 'Français' },
]

const EMPTY_FORM = {
  nombre: '', titulo: '', descripcion: '', descripcionLarga: '',
  especificaciones: '', comoUsar: '', marca: '', marcaId: '',
  precioVenta: '', precioCompra: '', stock: '1', talla: '', garantiaDias: '0',
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
    const valid = Array.from(fileList)
      .filter(f => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024)
      .slice(0, remaining)
    if (valid.length > 0) onAddFiles(valid)
  }, [files.length, onAddFiles])

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  return (
    <div className="space-y-3">
      {/* Grid de previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {previews.map((src, idx) => (
            <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-[#1a1a1f] border border-white/8">
              <img src={src} alt={`foto ${idx + 1}`} className="w-full h-full object-cover" />
              {idx === 0 && (
                <span className="absolute bottom-0 inset-x-0 text-center text-[9px] bg-[#4f7cff]/80 text-white py-0.5">
                  Principal
                </span>
              )}
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] leading-none"
              >✕</button>
            </div>
          ))}
          {/* Celda para agregar más */}
          {files.length < MAX_FOTOS && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-white/15 hover:border-[#4f7cff]/50 hover:bg-white/3 flex flex-col items-center justify-center gap-1 transition-all text-[#8e8e9a] hover:text-[#4f7cff]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[10px]">Agregar</span>
            </button>
          )}
        </div>
      )}

      {/* Zona de drop principal (solo si no hay fotos aún) */}
      {previews.length === 0 && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`cursor-pointer border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 ${
            dragging ? 'border-[#4f7cff] bg-[#4f7cff]/5' : 'border-white/15 hover:border-[#4f7cff]/50 hover:bg-white/3'
          }`}
        >
          <svg className="w-12 h-12 mx-auto mb-4 text-[#4f7cff]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="text-base font-semibold text-[#e8e8ed]">Arrastrá las fotos del producto aquí</p>
          <p className="text-sm text-[#8e8e9a] mt-1">o hacé clic para seleccionar · hasta {MAX_FOTOS} fotos</p>
          <p className="text-xs text-[#8e8e9a]/50 mt-0.5">JPG, PNG, WebP — máx 5 MB c/u</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
      />

      {previews.length > 0 && (
        <p className="text-xs text-[#8e8e9a]">
          {files.length}/{MAX_FOTOS} fotos · la primera será la imagen principal
        </p>
      )}
    </div>
  )
}

function AnalisisProgress({ previews, currentIdx }) {
  const total = previews.length
  const progress = total > 0 ? Math.round(((currentIdx) / total) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Imagen actual (grande) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.25 }}
          className="relative rounded-2xl overflow-hidden bg-[#1a1a1f] border border-white/8 aspect-video flex items-center justify-center"
        >
          {previews[currentIdx] && (
            <img
              src={previews[currentIdx]}
              alt={`Imagen ${currentIdx + 1}`}
              className="max-h-72 max-w-full object-contain"
            />
          )}
          {/* Overlay animado */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
              <span className="text-sm font-medium text-white">
                {currentIdx === 0
                  ? 'Analizando con Vision AI…'
                  : `Procesando imagen ${currentIdx + 1}…`
                }
              </span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Contador */}
      <div className="flex items-center justify-between text-xs text-[#8e8e9a]">
        <span>Imagen {currentIdx + 1} de {total}</span>
        <span>{progress}%</span>
      </div>

      {/* Barra de progreso */}
      <div className="h-1 rounded-full bg-white/8 overflow-hidden">
        <motion.div
          className="h-full bg-[#4f7cff] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Miniaturas con estado */}
      <div className="flex gap-2 flex-wrap">
        {previews.map((src, idx) => (
          <div
            key={idx}
            className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
              idx < currentIdx
                ? 'border-green-500/70 opacity-60'
                : idx === currentIdx
                  ? 'border-[#4f7cff] scale-110'
                  : 'border-white/10 opacity-30'
            }`}
          >
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

// ── Tag selector ─────────────────────────────────────────────────────────────
const TAG_GROUPS = [
  {
    label: '🏠 Ambiente',
    tags: ['sala','cocina','dormitorio','baño','jardín','oficina','comedor','terraza','garaje','lavandería'],
  },
  {
    label: '🪑 Tipo de producto',
    tags: ['mueble','decoración','iluminación','textil','electrodoméstico','herramienta','arte','almacenamiento','colchón','espejo'],
  },
  {
    label: '🎨 Estilo',
    tags: ['moderno','rústico','minimalista','clásico','industrial','bohemio','escandinavo','tropical'],
  },
  {
    label: '👥 Para quién',
    tags: ['niños','mascotas','adultos','familia','pareja','soltero','oficina en casa'],
  },
]

function TagSelector({ value, onChange }) {
  const selected = new Set(
    (value || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
  )

  function toggle(tag) {
    const next = new Set(selected)
    next.has(tag) ? next.delete(tag) : next.add(tag)
    onChange([...next].join(','))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold" style={{ color: '#e8e8ed' }}>
          Tags del chat 🛍️
        </label>
        {selected.size > 0 && (
          <button type="button" onClick={() => onChange('')}
            className="text-[10px] hover:underline" style={{ color: '#8e8e9a' }}>
            Limpiar ({selected.size})
          </button>
        )}
      </div>

      {TAG_GROUPS.map(group => (
        <div key={group.label} className="space-y-1.5">
          <p className="text-[10px] font-medium" style={{ color: '#8e8e9a' }}>{group.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {group.tags.map(tag => {
              const active = selected.has(tag)
              return (
                <button key={tag} type="button" onClick={() => toggle(tag)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                  style={{
                    backgroundColor: active ? 'var(--hc-accent, #4f7cff)' : 'rgba(255,255,255,0.07)',
                    color:           active ? '#fff' : '#8e8e9a',
                    border:          active ? '1px solid transparent' : '1px solid rgba(255,255,255,0.12)',
                  }}>
                  {tag}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <p className="text-[10px]" style={{ color: '#8e8e9a' }}>
        Seleccioná los que mejor describen este producto. El chat los usa para recomendarlo.
        {selected.size > 0 && <span className="ml-1 text-[#4f7cff]">({selected.size} seleccionados)</span>}
      </p>
    </div>
  )
}

export default function AdminNuevoProducto() {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const [paso, setPaso] = useState(1)

  // Paso 1: archivos locales seleccionados
  const [imagenesFile, setImagenesFile] = useState([])
  const [previewUrls, setPreviewUrls] = useState([])

  // Análisis
  const [analizando, setAnalizando] = useState(false)
  const [analizandoIdx, setAnalizandoIdx] = useState(-1)
  const [etiquetas, setEtiquetas] = useState([])
  const [fuenteDetalles, setFuenteDetalles] = useState(null)

  // Borrador
  const DRAFT_KEY = 'hotclick-draft-producto'
  const [tieneBorrador, setTieneBorrador] = useState(() => !!localStorage.getItem(DRAFT_KEY))
  const [autoSaveLabel, setAutoSaveLabel] = useState('')
  const draftTimerRef = useRef(null)

  // Formulario
  const [form, setForm] = useState(EMPTY_FORM)
  const [categories, setCategories] = useState([])
  const [bodegas, setBodegas] = useState([])
  const [marcas, setMarcas] = useState([])
  const [saving, setSaving] = useState(false)
  const [nuevaMarca, setNuevaMarca] = useState('')
  const [creandoMarca, setCreandoMarca] = useState(false)
  const [showNuevaMarca, setShowNuevaMarca] = useState(false)
  const [seoOpen, setSeoOpen] = useState(false)
  const [seoLang, setSeoLang] = useState('es')
  const [seoAuto, setSeoAuto] = useState({ es: true, en: true, pt: true, fr: true })

  // compat aliases for existing useEffects
  const seoAutoTitle = seoAuto.es
  const seoAutoDesc  = seoAuto.es
  const setSeoAutoTitle = (v) => setSeoAuto(p => ({ ...p, es: v }))
  const setSeoAutoDesc  = (v) => setSeoAuto(p => ({ ...p, es: v }))

  useEffect(() => {
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
    }).catch(() => {})
  }, [])

  const guardarBorrador = () => {
    try {
      const draft = { ...form, imagenes: [], seoByLang: form.seoByLang }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
      setTieneBorrador(true)
      toast({ message: 'Borrador guardado', type: 'success' })
    } catch { toast({ message: 'No se pudo guardar el borrador', type: 'error' }) }
  }

  const cargarBorrador = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw)
      setForm({ ...EMPTY_FORM, ...draft })
      toast({ message: 'Borrador cargado', type: 'success' })
    } catch { toast({ message: 'Error al cargar el borrador', type: 'error' }) }
  }

  const limpiarBorrador = () => {
    localStorage.removeItem(DRAFT_KEY)
    setTieneBorrador(false)
    setForm(EMPTY_FORM)
  }

  // Auto-save con debounce 800ms — no persiste imágenes (objetos File no serializables)
  useEffect(() => {
    if (!form.nombre && !form.descripcion && !form.precioVenta) return
    clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      try {
        const draft = { ...form, imagenes: [] }
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
        setTieneBorrador(true)
        setAutoSaveLabel('Guardado automáticamente')
        setTimeout(() => setAutoSaveLabel(''), 2500)
      } catch { /* incógnito o storage lleno — el formulario sigue funcionando */ }
    }, 800)
    return () => clearTimeout(draftTimerRef.current)
  }, [form]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const nombre = form.nombre || ''
    const precio = form.precioVenta ? Number(form.precioVenta).toLocaleString('es-CR') : ''
    const desc = form.descripcion || ''
    setForm(p => {
      const next = { ...p.seoByLang }
      if (seoAuto.es) {
        next.es = {
          title: nombre ? `${nombre} | HOTCLICK Outlet`.slice(0, 60) : '',
          description: desc ? `${desc}${precio ? ` | Precio: ₡${precio}` : ''} | Envíos a todo Costa Rica`.slice(0, 160) : '',
        }
      }
      if (seoAuto.en) {
        next.en = {
          title: nombre ? `${nombre} | HOTCLICK Outlet`.slice(0, 60) : '',
          description: desc ? `${desc} | Free shipping in Costa Rica | HOTCLICK`.slice(0, 160) : '',
        }
      }
      if (seoAuto.pt) {
        next.pt = {
          title: nombre ? `${nombre} | HOTCLICK Outlet`.slice(0, 60) : '',
          description: desc ? `${desc} | Envio grátis pelo Costa Rica | HOTCLICK`.slice(0, 160) : '',
        }
      }
      if (seoAuto.fr) {
        next.fr = {
          title: nombre ? `${nombre} | HOTCLICK Outlet`.slice(0, 60) : '',
          description: desc ? `${desc} | Livraison gratuite au Costa Rica | HOTCLICK`.slice(0, 160) : '',
        }
      }
      return {
        ...p,
        metaTitle: next.es.title,
        metaDescription: next.es.description,
        seoByLang: next,
      }
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
    } finally {
      setCreandoMarca(false)
    }
  }

  // Limpiar blob URLs al desmontar
  useEffect(() => {
    return () => { previewUrls.forEach(url => URL.revokeObjectURL(url)) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddFiles = useCallback((files) => {
    const newPreviews = files.map(f => URL.createObjectURL(f))
    setImagenesFile(prev => [...prev, ...files])
    setPreviewUrls(prev => [...prev, ...newPreviews])
  }, [])

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
      // Subir todas las imágenes + analizar todas con IA en paralelo
      const fdAnalisis = new FormData()
      imagenesFile.forEach(f => fdAnalisis.append('imagenes', f))

      const uploadPromises = imagenesFile.map((f, i) => {
        setAnalizandoIdx(i)
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

      // Avanzar el índice visualmente mientras suben
      for (let i = 0; i < imagenesFile.length; i++) {
        setAnalizandoIdx(i)
      }

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
      setForm(prev => ({
        ...prev,
        nombre:           d.nombre           ?? '',
        titulo:           d.titulo           ?? (d.nombre ? d.nombre.slice(0, 40) : ''),
        descripcion:      d.descripcionCorta ?? '',
        descripcionLarga: d.descripcionLarga ?? '',
        especificaciones: d.especificaciones ?? '',
        comoUsar:         d.comoUsar         ?? '',
        marca:            marcaDetectada,
        marcaId:          marcaMatch ? String(marcaMatch.id) : '',
        precioVenta:      d.precioSugerido > 0 ? String(d.precioSugerido) : '',
        bodegaId:         bodegas[0]?.id ? String(bodegas[0].id) : '',
        talla:            d.talla        ?? '',
        imagenUrl:        uploadedUrls[0] ?? '',
        imagenes:         uploadedUrls,
      }))
      setPaso(2)
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al procesar imágenes', type: 'error' })
    } finally {
      setAnalizando(false)
      setAnalizandoIdx(-1)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.categoriaId) { toast({ message: 'Seleccioná una categoría', type: 'error' }); return }
    if (!form.bodegaId && bodegas.length > 0) { toast({ message: 'Seleccioná una bodega', type: 'error' }); return }
    setSaving(true)
    try {
      const imagenUrl = form.imagenes[0] ?? form.imagenUrl ?? ''
      const sl = form.seoByLang ?? {}
      const dto = denormalizeProduct({
        ...form,
        imagenUrl,
        metaTitle:          sl.es?.title        || form.metaTitle        || '',
        metaDescription:    sl.es?.description  || form.metaDescription  || '',
        metaKeywords:       form.metaKeywords    || '',
        tags:               form.tags            || '',
        metaTitleEn:        sl.en?.title        || '',
        metaTitlePt:        sl.pt?.title        || '',
        metaTitleFr:        sl.fr?.title        || '',
        metaDescriptionEn:  sl.en?.description  || '',
        metaDescriptionPt:  sl.pt?.description  || '',
        metaDescriptionFr:  sl.fr?.description  || '',
      })
      const res = await productService.create(dto)
      const productoId = res.data?.data?.id ?? res.data?.id

      // Sincronizar imágenes por separado — un fallo aquí no cancela la creación
      if (productoId && form.imagenes.length > 0) {
        try {
          await productService.sincronizarImagenes(productoId, form.imagenes)
        } catch {
          toast({ message: 'Producto creado pero hubo un error al guardar las fotos. Edita el producto para agregarlas.', type: 'warning' })
        }
      }

      try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignorar */ }
      setTieneBorrador(false)
      toast({ message: 'Producto creado correctamente', type: 'success' })
      navigate('/admin/productos')
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al guardar', type: 'error' })
    } finally { setSaving(false) }
  }

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  return (
    <>
      <div className="space-y-5 max-w-2xl mx-auto xl:mx-0 xl:max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          {paso === 2 && !analizando && (
            <button onClick={() => setPaso(1)}
              className="p-2 rounded-xl hover:bg-white/5 text-[#8e8e9a] hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-[#e8e8ed]">
              {paso === 1 ? t('admin.nuevoProducto.title') : t('admin.nuevoProducto.name')}
            </h1>
            <p className="text-sm text-[#8e8e9a] mt-1">
              {analizando
                ? `Procesando ${imagenesFile.length} foto${imagenesFile.length !== 1 ? 's' : ''}…`
                : paso === 1
                  ? t('admin.nuevoProducto.analyze')
                  : t('admin.nuevoProducto.result')
              }
            </p>
          </div>
        </div>

        {/* Aviso borrador guardado */}
        {tieneBorrador && paso === 1 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(79,124,255,0.08)', border: '1px solid rgba(79,124,255,0.25)' }}>
            <svg className="w-4 h-4 text-[#4f7cff] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span style={{ color: '#a0b4ff' }} className="flex-1">Tenés un borrador guardado.</span>
            <button onClick={cargarBorrador} className="text-xs font-semibold px-3 py-1 rounded-lg"
              style={{ background: '#4f7cff', color: '#fff' }}>Cargar</button>
            <button onClick={limpiarBorrador} className="text-xs px-2 py-1 rounded-lg"
              style={{ color: '#8e8e9a' }}>Descartar</button>
          </div>
        )}

        {/* Aviso sin bodegas */}
        {bodegas.length === 0 && paso === 2 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span className="text-amber-300 flex-1">No tenés bodegas creadas. El producto no podrá guardarse sin una bodega.</span>
            <a href="/admin/bodegas" className="text-xs font-semibold px-3 py-1 rounded-lg"
              style={{ background: 'rgba(245,158,11,0.2)', color: '#fbbf24' }}>Crear bodega →</a>
          </div>
        )}

        {/* ── Paso 1: seleccionar fotos ── */}
        {paso === 1 && !analizando && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <MultiUploadZone
              files={imagenesFile}
              previews={previewUrls}
              onAddFiles={handleAddFiles}
              onRemove={handleRemoveFile}
            />
            {imagenesFile.length > 0 && (
              <Button onClick={handleAnalizar} className="w-full">
                {t('admin.nuevoProducto.analyze')}
                {imagenesFile.length > 1 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-white/10 text-xs font-semibold">
                    {imagenesFile.length}
                  </span>
                )}
              </Button>
            )}
          </motion.div>
        )}

        {/* ── Análisis en curso ── */}
        {analizando && analizandoIdx >= 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <AnalisisProgress previews={previewUrls} currentIdx={analizandoIdx} />
          </motion.div>
        )}

        {/* ── Paso 2: formulario ── */}
        {paso === 2 && !analizando && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            {/* Chip de etiquetas Vision */}
            {etiquetas.length > 0 && (
              <div className="rounded-xl bg-[#4f7cff]/8 border border-[#4f7cff]/20 p-4 space-y-2">
                <p className="text-xs font-semibold text-[#4f7cff] uppercase tracking-wide">
                  Detectado por Vision AI{fuenteDetalles ? ` · datos de ${fuenteDetalles}` : ''}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {etiquetas.slice(0, 6).map((e, i) => (
                    <span key={i} className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      i === 0
                        ? 'bg-[#4f7cff]/20 text-[#4f7cff] border border-[#4f7cff]/30'
                        : 'bg-white/5 text-[#8e8e9a] border border-white/10'
                    }`}>{e}</span>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {/* Nombre y Título */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label required>Nombre del producto</Label>
                  <input className={inp} value={form.nombre} onChange={set('nombre')}
                    placeholder="Ej: Tenis Nike Air Max 90 Blanco" required maxLength={80} />
                  <p className={`text-xs mt-1 text-right ${form.nombre.length >= 72 ? 'text-amber-500' : 'text-gray-400'}`}>
                    {form.nombre.length}/80
                  </p>
                </div>
                <div>
                  <Label>Título para FB Marketplace</Label>
                  <input className={inp} value={form.titulo} onChange={set('titulo')}
                    placeholder="Ej: Tenis Nike Air Max Blanco" maxLength={40} />
                  <p className={`text-xs mt-1 text-right ${form.titulo.length >= 36 ? 'text-amber-500' : 'text-gray-400'}`}>
                    {form.titulo.length}/40
                  </p>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <Label>Descripción corta</Label>
                <textarea className={ta} rows={3} value={form.descripcion} onChange={set('descripcion')}
                  placeholder="Ej: Tenis running con suela de aire, talla 42, color blanco." maxLength={200} />
                <p className={`text-xs mt-1 text-right ${form.descripcion.length >= 180 ? 'text-amber-500' : 'text-gray-400'}`}>
                  {form.descripcion.length}/200
                </p>
              </div>

              {/* Especificaciones */}
              <div>
                <Label>Especificaciones técnicas</Label>
                <textarea className={ta} rows={5} value={form.especificaciones} onChange={set('especificaciones')}
                  placeholder={'Marca: \nModelo: \nMaterial: \nTalla: \nColor: '} maxLength={500} />
                <p className={`text-xs mt-1 text-right ${form.especificaciones.length >= 450 ? 'text-amber-500' : 'text-gray-400'}`}>
                  {form.especificaciones.length}/500
                </p>
              </div>

              {/* Cómo usar */}
              <div>
                <Label>Cómo usar</Label>
                <textarea className={ta} rows={3} value={form.comoUsar} onChange={set('comoUsar')}
                  placeholder="Ej: Lavar a mano. No usar secadora." maxLength={150} />
                <p className={`text-xs mt-1 text-right ${form.comoUsar.length >= 135 ? 'text-amber-500' : 'text-gray-400'}`}>
                  {form.comoUsar.length}/150
                </p>
              </div>

              {/* Nombre de marca detectada (texto libre) + selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nombre de marca</Label>
                  <input
                    className={inp}
                    value={form.marca}
                    onChange={set('marca')}
                    placeholder="Ej: Nike, Samsung, Zara..."
                    maxLength={40}
                  />
                  <p className={`text-xs mt-1 text-right ${form.marca.length >= 36 ? 'text-amber-500' : 'text-gray-400'}`}>
                    {form.marca.length}/40
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label>Marca (catálogo)</Label>
                    <button
                      type="button"
                      onClick={() => setShowNuevaMarca(v => !v)}
                      className="text-[10px] text-[#4f7cff] hover:underline"
                    >
                      {showNuevaMarca ? 'Cancelar' : '+ Nueva marca'}
                    </button>
                  </div>
                  {showNuevaMarca ? (
                    <div className="flex gap-2">
                      <input
                        className={inp}
                        value={nuevaMarca}
                        onChange={e => setNuevaMarca(e.target.value)}
                        placeholder="Nombre de la nueva marca"
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleCrearMarca())}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleCrearMarca}
                        disabled={creandoMarca || !nuevaMarca.trim()}
                        className="shrink-0 px-4 py-2 rounded-xl bg-[#4f7cff] text-white text-sm font-medium disabled:opacity-40 transition-opacity"
                      >
                        {creandoMarca ? '...' : 'Crear'}
                      </button>
                    </div>
                  ) : (
                    <select
                      className={sel}
                      value={form.marcaId}
                      onChange={e => setForm(p => ({ ...p, marcaId: e.target.value }))}
                    >
                      <option value="">-- Sin marca --</option>
                      {marcas.map(m => (
                        <option key={m.id} value={m.id}>{m.nombreMarca}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Precios y Stock */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label required>Precio compra (₡)</Label>
                  <input className={inp} type="number" value={form.precioCompra} onChange={set('precioCompra')}
                    placeholder="0" required min="0" />
                </div>
                <div>
                  <Label required>Precio venta al público (₡)</Label>
                  <input className={inp} type="number" value={form.precioVenta} onChange={set('precioVenta')}
                    placeholder="0" required min="0" />
                </div>
                <div>
                  <Label>Stock inicial</Label>
                  <input className={inp} type="number" value={form.stock} onChange={set('stock')}
                    placeholder="1" min="0" />
                </div>
              </div>

              {/* Tags para el chat de descubrimiento */}
              <TagSelector value={form.tags ?? ''} onChange={v => setForm(p => ({ ...p, tags: v }))} />

              {/* SKU + Barcode */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>SKU <span className="text-[#8e8e9a] font-normal">(código interno)</span></Label>
                  <input className={inp} type="text" value={form.sku ?? ''} onChange={set('sku')}
                    placeholder="Ej: HC-001" />
                </div>
                <div>
                  <Label>Barcode <span className="text-[#8e8e9a] font-normal">(EAN / UPC)</span></Label>
                  <input className={inp} type="text" value={form.barcode ?? ''} onChange={set('barcode')}
                    placeholder="Ej: 7501234567890" />
                </div>
              </div>

              {/* Garantía */}
              <div>
                <Label>Días de garantía <span className="text-[#8e8e9a] font-normal">(0 = sin garantía)</span></Label>
                <div className="flex items-center gap-3">
                  <input className={`${inp} w-36`} type="number" value={form.garantiaDias} onChange={set('garantiaDias')}
                    placeholder="0" min="0" />
                  <div className="flex gap-2 flex-wrap">
                    {[0, 30, 90, 180, 365].map(d => (
                      <button key={d} type="button"
                        onClick={() => setForm(p => ({ ...p, garantiaDias: String(d) }))}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                          String(form.garantiaDias) === String(d)
                            ? 'bg-[#4f7cff]/20 border-[#4f7cff]/60 text-[#4f7cff]'
                            : 'bg-white/4 border-white/10 text-[#8e8e9a] hover:border-white/25 hover:text-white'
                        }`}
                      >{d === 0 ? 'Sin' : d === 365 ? '1 año' : `${d}d`}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Talla */}
              <div>
                <Label>Talla <span className="text-[#8e8e9a] font-normal">(número para zapatos · letra para ropa · dejar vacío si no aplica)</span></Label>
                <div className="flex flex-wrap gap-2">
                  {/* Tallas letras */}
                  {['XS','S','M','L','XL','XXL','XXXL'].map(t => (
                    <button
                      key={t} type="button"
                      onClick={() => setForm(p => ({ ...p, talla: p.talla === t ? '' : t }))}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                        form.talla === t
                          ? 'bg-[#4f7cff]/20 border-[#4f7cff]/60 text-[#4f7cff]'
                          : 'bg-white/4 border-white/10 text-[#8e8e9a] hover:border-white/25 hover:text-white'
                      }`}
                    >{t}</button>
                  ))}
                  <span className="text-[#8e8e9a]/30 self-center text-xs">|</span>
                  {/* Tallas número */}
                  {['35','36','37','38','39','40','41','42','43','44','45'].map(t => (
                    <button
                      key={t} type="button"
                      onClick={() => setForm(p => ({ ...p, talla: p.talla === t ? '' : t }))}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                        form.talla === t
                          ? 'bg-[#4f7cff]/20 border-[#4f7cff]/60 text-[#4f7cff]'
                          : 'bg-white/4 border-white/10 text-[#8e8e9a] hover:border-white/25 hover:text-white'
                      }`}
                    >{t}</button>
                  ))}
                  {/* Campo libre */}
                  <input
                    className={`${inp} w-24`}
                    value={form.talla}
                    onChange={set('talla')}
                    placeholder="Otra…"
                    maxLength={20}
                  />
                </div>
              </div>

              {/* Condición, Categoría, Bodega */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <select className={sel} value={form.categoriaId} onChange={set('categoriaId')} required>
                    <option value="">-- Seleccionar --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombreCategoria ?? c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label required={bodegas.length > 0}>Bodega</Label>
                  <select className={sel} value={form.bodegaId} onChange={set('bodegaId')}
                    required={bodegas.length > 0}>
                    <option value="">-- Seleccionar --</option>
                    {bodegas.map((b) => (
                      <option key={b.id} value={b.id}>{b.nombreBodega ?? b.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Imágenes (ya vienen precargadas del paso 1) */}
              <MultiImagePicker
                imagenes={form.imagenes}
                onChange={(imgs) => setForm((p) => ({ ...p, imagenes: imgs, imagenUrl: imgs[0] ?? p.imagenUrl }))}
              />

              {/* ── SEO ── */}
              <div className="rounded-2xl border border-white/10 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSeoOpen(o => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-colors"
                  aria-expanded={seoOpen}
                  aria-controls="seo-panel"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#e8e8ed]">SEO</span>
                    <span className="text-base" aria-hidden="true">🎯</span>
                    {form.seoByLang.es.title && form.seoByLang.es.description
                      ? <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Optimizado</span>
                      : <span className="text-[10px] text-[#8e8e9a] bg-white/5 px-2 py-0.5 rounded-full">Sin configurar</span>
                    }
                    {/* Idiomas configurados */}
                    <div className="flex items-center gap-0.5 ml-1" aria-label="Idiomas con SEO configurado">
                      {SEO_LANGS.map(l => {
                        const filled = !!(form.seoByLang[l.code]?.title)
                        return (
                          <span
                            key={l.code}
                            title={`${l.name}: ${filled ? 'configurado' : 'vacío'}`}
                            className={`text-[11px] transition-opacity ${filled ? 'opacity-100' : 'opacity-25'}`}
                          >
                            {l.flag}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                  <svg className={`w-4 h-4 text-[#8e8e9a] transition-transform duration-200 ${seoOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
                </button>

                {seoOpen && (
                  <div id="seo-panel" className="border-t border-white/10 px-4 py-4 space-y-4">

                    {/* Selector de idioma */}
                    <div>
                      <p className="text-xs text-[#8e8e9a] mb-2">
                        Configura el título y descripción en cada idioma — Google mostrará el contenido según el país del visitante.
                      </p>
                      <div className="flex gap-1.5 flex-wrap" role="tablist" aria-label="Idioma del SEO">
                        {SEO_LANGS.map(l => {
                          const filled = !!(form.seoByLang[l.code]?.title)
                          const active = seoLang === l.code
                          return (
                            <button
                              key={l.code}
                              type="button"
                              role="tab"
                              aria-selected={active}
                              onClick={() => setSeoLang(l.code)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                                active
                                  ? 'bg-[#4f7cff]/15 border-[#4f7cff]/40 text-[#4f7cff]'
                                  : 'bg-white/4 border-white/10 text-[#8e8e9a] hover:text-[#e8e8ed] hover:bg-white/6'
                              }`}
                            >
                              <span>{l.flag}</span>
                              <span>{l.label}</span>
                              {filled && !active && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" aria-label="configurado" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Campos del idioma activo */}
                    {(() => {
                      const langMeta = SEO_LANGS.find(l => l.code === seoLang)
                      const currentSeo = form.seoByLang[seoLang] ?? { title: '', description: '' }
                      const isEs = seoLang === 'es'
                      const titleLen = currentSeo.title.length
                      const descLen = currentSeo.description.length

                      const handleTitleChange = (val) => {
                        setSeoAuto(prev => ({ ...prev, [seoLang]: false }))
                        setForm(p => ({
                          ...p,
                          metaTitle: isEs ? val : p.metaTitle,
                          seoByLang: { ...p.seoByLang, [seoLang]: { ...p.seoByLang[seoLang], title: val } },
                        }))
                      }
                      const handleDescChange = (val) => {
                        setSeoAuto(prev => ({ ...prev, [seoLang]: false }))
                        setForm(p => ({
                          ...p,
                          metaDescription: isEs ? val : p.metaDescription,
                          seoByLang: { ...p.seoByLang, [seoLang]: { ...p.seoByLang[seoLang], description: val } },
                        }))
                      }

                      return (
                        <div className="space-y-4" role="tabpanel" aria-label={`SEO en ${langMeta?.name}`}>
                          {/* Indicador de idioma activo */}
                          <div className="flex items-center gap-2 text-xs text-[#8e8e9a]">
                            <span className="text-base">{langMeta?.flag}</span>
                            <span>Editando en <strong className="text-[#e8e8ed]">{langMeta?.name}</strong></span>
                            {isEs && <span className="text-[#4f7cff]">· idioma principal</span>}
                          </div>

                          {/* Título SEO */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <label htmlFor={`seo-title-${seoLang}`} className="text-xs text-[#8e8e9a]">
                                  Título SEO
                                </label>
                                <span
                                  title="Aparece en Google. Usa entre 50-60 caracteres, incluye la palabra principal."
                                  className="text-[#8e8e9a] cursor-help text-xs"
                                  aria-label="Ayuda: Aparece en Google. Usa entre 50-60 caracteres"
                                >ⓘ</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {seoAuto[seoLang] && <span className="text-[10px] text-[#4f7cff]">auto</span>}
                                <CharCounter current={titleLen} max={60} min={30} />
                              </div>
                            </div>
                            <input
                              id={`seo-title-${seoLang}`}
                              className={inp}
                              value={currentSeo.title}
                              maxLength={60}
                              placeholder={isEs ? 'Nombre del producto | HOTCLICK Outlet' : `Product name in ${langMeta?.name} | HOTCLICK Outlet`}
                              onChange={e => handleTitleChange(e.target.value)}
                              aria-describedby={`seo-title-hint-${seoLang}`}
                            />
                            <p id={`seo-title-hint-${seoLang}`} className="sr-only">
                              Título que aparece en Google para visitantes de habla {langMeta?.name}. Entre 50 y 60 caracteres.
                            </p>
                          </div>

                          {/* Meta Descripción */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <label htmlFor={`seo-desc-${seoLang}`} className="text-xs text-[#8e8e9a]">
                                  Meta Descripción
                                </label>
                                <span
                                  title="Aparece debajo del título en Google. Usa entre 120-160 caracteres."
                                  className="text-[#8e8e9a] cursor-help text-xs"
                                  aria-label="Ayuda: Aparece debajo del título en Google. Usa entre 120-160 caracteres"
                                >ⓘ</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {seoAuto[seoLang] && <span className="text-[10px] text-[#4f7cff]">auto</span>}
                                <CharCounter current={descLen} max={160} min={120} />
                              </div>
                            </div>
                            <textarea
                              id={`seo-desc-${seoLang}`}
                              className={ta}
                              rows={3}
                              value={currentSeo.description}
                              maxLength={160}
                              placeholder={isEs
                                ? 'Descripción del producto | Precio: ₡X | Envíos a todo Costa Rica'
                                : `Product description in ${langMeta?.name} | Free shipping`
                              }
                              onChange={e => handleDescChange(e.target.value)}
                              aria-describedby={`seo-desc-hint-${seoLang}`}
                            />
                            <p id={`seo-desc-hint-${seoLang}`} className="sr-only">
                              Descripción que aparece en Google para visitantes de habla {langMeta?.name}. Entre 120 y 160 caracteres.
                            </p>
                          </div>

                          {/* URL amigable (solo lectura) */}
                          {form.nombre && (
                            <div>
                              <p className="text-xs text-[#8e8e9a] mb-1.5">URL amigable (generada)</p>
                              <p className="text-xs text-[#4f7cff] bg-[#4f7cff]/8 border border-[#4f7cff]/20 rounded-xl px-3 py-2 font-mono truncate" aria-label={`URL del producto: hotclick.com/productos/${toSlug(form.nombre)}`}>
                                hotclick.com/productos/{toSlug(form.nombre) || '…'}
                              </p>
                            </div>
                          )}

                          {/* Vista previa Google */}
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <p className="text-xs text-[#8e8e9a]">Vista previa en Google</p>
                              <span className="text-[10px] text-[#8e8e9a] bg-white/5 px-2 py-0.5 rounded-full flex items-center gap-1">
                                {langMeta?.flag} {langMeta?.name}
                              </span>
                            </div>
                            <div className="rounded-xl bg-white px-4 py-3 space-y-0.5" aria-label={`Vista previa de Google en ${langMeta?.name}`}>
                              <p className="text-xs text-green-700 truncate font-normal">
                                hotclick.com › productos › {form.nombre ? toSlug(form.nombre) : '…'}
                              </p>
                              <p className="text-base text-blue-700 truncate font-normal leading-snug">
                                {currentSeo.title || `Título SEO en ${langMeta?.name}`}
                              </p>
                              <p className="text-sm text-[#4d5156] line-clamp-2 leading-snug">
                                {currentSeo.description || `La meta descripción en ${langMeta?.name} aparecerá aquí…`}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-2 flex-wrap">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving
                    ? <><Spinner size="sm" /><span className="ml-2">{t('common.loading')}</span></>
                    : t('admin.nuevoProducto.save')
                  }
                </Button>
                <button
                  type="button"
                  onClick={guardarBorrador}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-[#8e8e9a] hover:text-white hover:bg-white/5 text-sm transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                  Borrador
                </button>
                {autoSaveLabel && (
                  <span className="text-xs text-emerald-400/80 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
                    {autoSaveLabel}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => navigate('/admin/productos')}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-[#8e8e9a] hover:text-white hover:bg-white/5 text-sm transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </>
  )
}
