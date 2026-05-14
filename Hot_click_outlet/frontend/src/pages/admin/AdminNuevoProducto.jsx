import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import AdminLayout from '@/layouts/AdminLayout'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { publicacionService } from '@/services/publicacionService'
import { productService, denormalizeProduct } from '@/services/productService'
import { warehouseService } from '@/services/orderService'

const EMPTY_FORM = {
  nombre: '', titulo: '', descripcion: '', descripcionLarga: '',
  especificaciones: '', comoUsar: '', marca: '',
  precioVenta: '', precioCompra: '', stock: '1',
  condicion: 'NUEVO', categoriaId: '', bodegaId: '', imagenUrl: '',
}

function ImagenUpload({ value, onChange, onUploadingChange }) {
  const toast = useToast()
  const inputRef = useRef()
  const [drag, setDrag] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [localPreview, setLocalPreview] = useState(null)

  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setLocalPreview(URL.createObjectURL(file))
    setUploading(true)
    onUploadingChange?.(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await productService.uploadImage(fd)
      const url = r.data?.url ?? r.data
      if (!url) throw new Error('URL vacía')
      onChange(url)
    } catch (err) {
      toast({ message: err?.response?.data?.message ?? 'Error al subir imagen', type: 'error' })
      setLocalPreview(null)
      onChange('')
    } finally {
      setUploading(false)
      onUploadingChange?.(false)
    }
  }, [onChange, onUploadingChange, toast])

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDrag(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const displaySrc = localPreview || value || null

  return (
    <div className="space-y-2">
      {displaySrc ? (
        <div className="flex items-start gap-3">
          <div className="relative group">
            <img src={displaySrc} alt="Producto"
              className="w-28 h-28 object-cover rounded-xl border border-white/10" />
            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                <Spinner size="sm" />
              </div>
            )}
            <button type="button"
              onClick={() => { setLocalPreview(null); onChange('') }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-400 rounded-full text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              ✕
            </button>
          </div>
          <button type="button"
            onClick={() => inputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl border border-white/10 text-xs text-[#8e8e9a] hover:text-white hover:bg-white/5 transition-colors">
            Cambiar imagen
          </button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          className={`cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
            drag ? 'border-[#4f7cff] bg-[#4f7cff]/5' : 'border-white/15 hover:border-[#4f7cff]/50 hover:bg-white/3'
          }`}
        >
          <input ref={inputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          <svg className="w-8 h-8 mx-auto mb-2 text-[#4f7cff]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-3-3l1.409-1.409a2.25 2.25 0 013.182 0m-9.75 5.25h16.5M13.5 3H21v7.5" />
          </svg>
          <p className="text-sm font-medium text-[#e8e8ed]">Arrastra la imagen del producto</p>
          <p className="text-xs text-[#8e8e9a] mt-0.5">PNG, JPG, WEBP · o haz clic para seleccionar</p>
        </div>
      )}
    </div>
  )
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

function ImageUploadZone({ onFile }) {
  const inputRef = useRef()
  const [drag, setDrag] = useState(false)
  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDrag(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) onFile(file)
  }, [onFile])
  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      className={`cursor-pointer border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 ${
        drag ? 'border-[#4f7cff] bg-[#4f7cff]/5' : 'border-white/15 hover:border-[#4f7cff]/50 hover:bg-white/3'
      }`}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
      <svg className="w-12 h-12 mx-auto mb-4 text-[#4f7cff]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
      <p className="text-base font-semibold text-[#e8e8ed]">Arrastra la foto del producto aquí</p>
      <p className="text-sm text-[#8e8e9a] mt-1">o haz clic para seleccionar · JPG, PNG, WEBP</p>
    </div>
  )
}

export default function AdminNuevoProducto() {
  const { t } = useTranslation()
  const toast = useToast()
  const navigate = useNavigate()
  const [paso, setPaso] = useState(1)
  const [imagen, setImagen] = useState(null)
  const [preview, setPreview] = useState(null)
  const [analizando, setAnalizando] = useState(false)
  const [etiquetas, setEtiquetas] = useState([])
  const [fuenteDetalles, setFuenteDetalles] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [categories, setCategories] = useState([])
  const [bodegas, setBodegas] = useState([])
  const [saving, setSaving] = useState(false)
  const [uploadingImg, setUploadingImg] = useState(false)

  useEffect(() => {
    Promise.all([
      productService.getCategories(),
      warehouseService.getAll(),
    ]).then(([catsR, bodsR]) => {
      setCategories(catsR.data ?? [])
      const bods = Array.isArray(bodsR.data) ? bodsR.data : bodsR.data?.content ?? []
      setBodegas(bods)
    }).catch(() => {})
  }, [])

  const handleImagen = (file) => {
    setImagen(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleAnalizar = async () => {
    if (!imagen) { toast({ message: 'Selecciona una imagen', type: 'error' }); return }
    setAnalizando(true)
    try {
      const fd = new FormData()
      fd.append('imagen', imagen)
      const r = await publicacionService.detallesProducto(fd)
      const d = r.data
      setEtiquetas(d.todasEtiquetas ?? [])
      setFuenteDetalles(d.fuenteDetalles ?? null)
      setForm((prev) => ({
        ...prev,
        nombre:           d.nombre          ?? '',
        titulo:           d.nombre          ?? '',
        descripcion:      d.descripcionCorta ?? '',
        descripcionLarga: d.descripcionLarga ?? '',
        especificaciones: d.especificaciones ?? '',
        comoUsar:         d.comoUsar        ?? '',
        marca:            d.marca           ?? '',
        precioVenta:      d.precioSugerido > 0 ? String(d.precioSugerido) : '',
        bodegaId:         bodegas[0]?.id   ? String(bodegas[0].id) : '',
      }))
      setPaso(2)
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al analizar imagen', type: 'error' })
    } finally { setAnalizando(false) }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.categoriaId) { toast({ message: 'Selecciona una categoría', type: 'error' }); return }
    if (!form.bodegaId && bodegas.length > 0) { toast({ message: 'Selecciona una bodega', type: 'error' }); return }
    setSaving(true)
    try {
      let imagenUrl = form.imagenUrl
      // Upload the dragged image if not yet uploaded
      if (!imagenUrl && imagen) {
        setUploadingImg(true)
        try {
          const fdImg = new FormData()
          fdImg.append('file', imagen)
          const r = await productService.uploadImage(fdImg)
          imagenUrl = r.data?.url ?? r.data ?? ''
        } catch (err) {
          toast({ message: 'Error al subir imagen: ' + (err?.response?.data?.message ?? err?.message), type: 'error' })
          setSaving(false)
          setUploadingImg(false)
          return
        }
        setUploadingImg(false)
      }
      await productService.create(denormalizeProduct({ ...form, imagenUrl }))
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
          {paso === 2 && (
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
              {paso === 1
                ? t('admin.nuevoProducto.analyze')
                : t('admin.nuevoProducto.result')
              }
            </p>
          </div>
        </div>

        {/* ── Paso 1: subir foto ── */}
        {paso === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <ImageUploadZone onFile={handleImagen} />
            {preview && (
              <div className="flex gap-4 items-start rounded-2xl bg-white/3 border border-white/8 p-4">
                <img src={preview} alt="Preview"
                  className="w-24 h-24 object-cover rounded-xl border border-white/10 shrink-0" />
                <div className="flex-1 space-y-3">
                  <p className="text-sm text-[#c8c8d0]">{t('admin.nuevoProducto.uploadPhoto')}</p>
                  <Button onClick={handleAnalizar} disabled={analizando} className="w-full">
                    {analizando
                      ? <><Spinner size="sm" /><span className="ml-2">{t('admin.nuevoProducto.analyzing')}</span></>
                      : t('admin.nuevoProducto.analyze')
                    }
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Paso 2: formulario ── */}
        {paso === 2 && (
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
                <Label>Marca</Label>
                <input className={inp} value={form.marca} onChange={set('marca')} placeholder="Marca del producto" />
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

              {/* Imagen */}
              <div>
                <Label>Imagen del producto</Label>
                {/* Show the dragged preview; allow replacing with a new image */}
                {(preview || form.imagenUrl) ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={form.imagenUrl || preview}
                      alt="Producto"
                      className="w-28 h-28 object-cover rounded-xl border border-white/10 bg-[#1a1a1f]"
                    />
                    <div className="space-y-1.5">
                      {form.imagenUrl
                        ? <p className="text-xs text-green-400">✓ Imagen guardada en la nube</p>
                        : <p className="text-xs text-[#8e8e9a]">Se subirá al guardar el producto</p>
                      }
                      <label className="cursor-pointer px-3 py-1.5 rounded-xl border border-white/10 text-xs text-[#8e8e9a] hover:text-white hover:bg-white/5 transition-colors block text-center">
                        Cambiar imagen
                        <input type="file" accept="image/*" className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) { setImagen(f); setPreview(URL.createObjectURL(f)); setForm(p => ({ ...p, imagenUrl: '' })) }
                          }} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <ImagenUpload
                    value={form.imagenUrl}
                    onChange={(url) => setForm(p => ({ ...p, imagenUrl: url }))}
                    onUploadingChange={setUploadingImg}
                  />
                )}
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={saving || uploadingImg} className="flex-1">
                  {uploadingImg
                    ? <><Spinner size="sm" /><span className="ml-2">{t('common.loading')}</span></>
                    : saving
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
