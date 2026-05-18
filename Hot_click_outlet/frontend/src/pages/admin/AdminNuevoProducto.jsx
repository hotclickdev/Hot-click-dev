import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AdminLayout from '@/layouts/AdminLayout'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { publicacionService } from '@/services/publicacionService'
import { productService, denormalizeProduct } from '@/services/productService'
import { warehouseService } from '@/services/orderService'
import { marcaService } from '@/services/marcaService'
import MultiImagePicker from '@/components/ui/MultiImagePicker'

const MAX_FOTOS = 10

const EMPTY_FORM = {
  nombre: '', titulo: '', descripcion: '', descripcionLarga: '',
  especificaciones: '', comoUsar: '', marca: '', marcaId: '',
  precioVenta: '', precioCompra: '', stock: '1',
  condicion: 'NUEVO', categoriaId: '', bodegaId: '', imagenUrl: '', imagenes: [],
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

  // Formulario
  const [form, setForm] = useState(EMPTY_FORM)
  const [categories, setCategories] = useState([])
  const [bodegas, setBodegas] = useState([])
  const [marcas, setMarcas] = useState([])
  const [saving, setSaving] = useState(false)
  const [nuevaMarca, setNuevaMarca] = useState('')
  const [creandoMarca, setCreandoMarca] = useState(false)
  const [showNuevaMarca, setShowNuevaMarca] = useState(false)

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
      const uploadedUrls = []
      let analysisData = null

      // Primera imagen: analizar + subir en paralelo
      setAnalizandoIdx(0)
      const fd0 = new FormData(); fd0.append('file', imagenesFile[0])
      const fdA = new FormData(); fdA.append('imagen', imagenesFile[0])

      const [analyzeRes, uploadRes0] = await Promise.allSettled([
        publicacionService.detallesProducto(fdA),
        productService.uploadImage(fd0),
      ])

      if (analyzeRes.status === 'fulfilled') {
        analysisData = analyzeRes.value.data
      } else {
        toast({ message: 'Error al analizar — se guardará sin datos de Vision AI', type: 'warning' })
      }
      if (uploadRes0.status === 'fulfilled') {
        const url = uploadRes0.value.data?.data?.url ?? uploadRes0.value.data?.url ?? uploadRes0.value.data ?? ''
        if (url) uploadedUrls.push(url)
      }

      // Imágenes restantes: solo subir
      for (let i = 1; i < imagenesFile.length; i++) {
        setAnalizandoIdx(i)
        const fd = new FormData(); fd.append('file', imagenesFile[i])
        try {
          const r = await productService.uploadImage(fd)
          const url = r.data?.data?.url ?? r.data?.url ?? r.data ?? ''
          if (url && typeof url === 'string') uploadedUrls.push(url)
        } catch (_) { /* imagen fallida — se omite */ }
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
        titulo:           d.nombre           ?? '',
        descripcion:      d.descripcionCorta ?? '',
        descripcionLarga: d.descripcionLarga ?? '',
        especificaciones: d.especificaciones ?? '',
        comoUsar:         d.comoUsar         ?? '',
        marca:            marcaDetectada,
        marcaId:          marcaMatch ? String(marcaMatch.id) : '',
        precioVenta:      d.precioSugerido > 0 ? String(d.precioSugerido) : '',
        bodegaId:         bodegas[0]?.id ? String(bodegas[0].id) : '',
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
      const dto = denormalizeProduct({ ...form, imagenUrl })
      const res = await productService.create(dto)
      const productoId = res.data?.id ?? res.data?.data?.id
      if (productoId && form.imagenes.length > 0) {
        await productService.sincronizarImagenes(productoId, form.imagenes)
      }
      toast({ message: 'Producto creado correctamente', type: 'success' })
      navigate('/admin/productos')
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al guardar', type: 'error' })
    } finally { setSaving(false) }
  }

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  return (
    <AdminLayout>
      <div className="space-y-5 max-w-2xl">
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
                  <input className={inp} value={form.nombre} onChange={set('nombre')} placeholder="Nombre" required />
                </div>
                <div>
                  <Label>Título para FB Marketplace</Label>
                  <input className={inp} value={form.titulo} onChange={set('titulo')} placeholder="Título corto para publicar" />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <Label>Descripción corta</Label>
                <textarea className={ta} rows={3} value={form.descripcion} onChange={set('descripcion')}
                  placeholder="Descripción breve del producto..." />
              </div>

              {/* Especificaciones */}
              <div>
                <Label>Especificaciones técnicas</Label>
                <textarea className={ta} rows={5} value={form.especificaciones} onChange={set('especificaciones')}
                  placeholder="Marca: ...&#10;Modelo: ...&#10;Material: ...&#10;Dimensiones: ..." />
              </div>

              {/* Cómo usar */}
              <div>
                <Label>Cómo usar</Label>
                <textarea className={ta} rows={3} value={form.comoUsar} onChange={set('comoUsar')}
                  placeholder="Instrucciones de uso del producto..." />
              </div>

              {/* Marca */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label>Marca</Label>
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

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving
                    ? <><Spinner size="sm" /><span className="ml-2">{t('common.loading')}</span></>
                    : t('admin.nuevoProducto.save')
                  }
                </Button>
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
    </AdminLayout>
  )
}
