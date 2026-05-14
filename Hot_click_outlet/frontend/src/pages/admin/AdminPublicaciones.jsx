import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import AdminLayout from '@/layouts/AdminLayout'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { publicacionService } from '@/services/publicacionService'
import { productService } from '@/services/productService'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)
const fmtCrc = (n) => `₡${fmt(n)}`

const ESTADO_COLOR = {
  PENDIENTE: 'warning',
  LISTO: 'accent',
  PUBLICADO: 'success',
  ERROR: 'danger',
}

// ─── Barra de precio individual ────────────────────────────────────────────
function PriceBar({ fuente, precioCrc, precioUsd, max }) {
  const pct = max > 0 ? Math.round((precioCrc / max) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#8e8e9a] truncate max-w-[140px]">{fuente}</span>
        <span className="text-[#e8e8ed] font-medium ml-2 shrink-0">
          {fmtCrc(precioCrc)}
          {precioUsd ? <span className="text-[#8e8e9a] ml-1">(${precioUsd})</span> : null}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded-full bg-[#4f7cff]"
        />
      </div>
    </div>
  )
}

// ─── Panel de resultados Vision ─────────────────────────────────────────────
function VisionPanel({ resultado, tc, onGuardar, saving }) {
  if (!resultado) return null
  const { etiquetaPrincipal, todasEtiquetas, precios, promedioCrc, error } = resultado
  const max = precios?.length ? Math.max(...precios.map((p) => p.precioCrc)) : 0
  const precioFinal = promedioCrc ? Math.round(promedioCrc * 1.58) : 0 // IVA+imp+margen aprox

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Etiquetas */}
      {todasEtiquetas?.length > 0 && (
        <div>
          <p className="text-xs text-[#8e8e9a] mb-2">Producto identificado como:</p>
          <div className="flex flex-wrap gap-1.5">
            {todasEtiquetas.slice(0, 6).map((e, i) => (
              <span key={i} className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                i === 0
                  ? 'bg-[#4f7cff]/20 text-[#4f7cff] border border-[#4f7cff]/30'
                  : 'bg-white/5 text-[#8e8e9a] border border-white/10'
              }`}>{e}</span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Precios */}
      {precios?.length > 0 ? (
        <div className="rounded-xl bg-white/3 border border-white/8 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wide">
              Precios encontrados ({precios.length} fuentes)
            </p>
            <p className="text-xs text-[#8e8e9a]">TC: {fmtCrc(tc)}</p>
          </div>
          <div className="space-y-3">
            {precios.map((p, i) => (
              <PriceBar key={i} {...p} max={max} />
            ))}
          </div>
          <div className="pt-2 border-t border-white/8 flex items-center justify-between">
            <span className="text-xs text-[#8e8e9a]">Promedio CRC</span>
            <span className="text-sm font-semibold text-[#e8e8ed]">{fmtCrc(promedioCrc)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8e8e9a]">Precio sugerido final (+IVA+imp+margen)</span>
            <span className="text-base font-bold text-[#4f7cff]">{fmtCrc(precioFinal)}</span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-white/3 border border-white/8 px-4 py-3 text-sm text-[#8e8e9a]">
          No se encontraron precios en las fuentes analizadas.
        </div>
      )}

      {/* Guardar en producto */}
      {onGuardar && precios?.length > 0 && (
        <Button onClick={onGuardar} disabled={saving} className="w-full">
          {saving ? <Spinner size="sm" /> : 'Guardar precios y generar texto FB'}
        </Button>
      )}
    </motion.div>
  )
}

// ─── Zona de subida de imagen ────────────────────────────────────────────────
function ImageUploadZone({ onFile }) {
  const inputRef = useRef()
  const [drag, setDrag] = useState(false)

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDrag(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) onFile(file)
  }, [onFile])

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      className={`
        cursor-pointer border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200
        ${drag
          ? 'border-[#4f7cff] bg-[#4f7cff]/5'
          : 'border-white/15 hover:border-[#4f7cff]/50 hover:bg-white/3'
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
      />
      <svg className="w-10 h-10 mx-auto mb-3 text-[#4f7cff]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
      <p className="text-sm font-medium text-[#e8e8ed]">Arrastra la foto del producto aquí</p>
      <p className="text-xs text-[#8e8e9a] mt-1">o haz clic para seleccionar · JPG, PNG, WEBP</p>
    </div>
  )
}

// ─── Fila de publicación FB ──────────────────────────────────────────────────
function PubRow({ pub, onCopiar, onPublicado, onEliminar }) {
  const [expanded, setExpanded] = useState(false)
  const toast = useToast()

  const copiar = () => {
    navigator.clipboard.writeText(pub.textoFb ?? '').then(() =>
      toast({ message: 'Texto copiado al portapapeles', type: 'success' })
    )
    onCopiar?.(pub)
  }

  return (
    <div className="rounded-xl bg-white/3 border border-white/8 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-[#e8e8ed] truncate">
              {pub.tituloFb ?? pub.producto?.nombreProducto ?? `Producto #${pub.fkIdProducto}`}
            </span>
            <Badge variant={ESTADO_COLOR[pub.estadoPublicacion] ?? 'default'}>
              {pub.estadoPublicacion}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-[#8e8e9a]">
            {pub.precioPublicar && <span>{fmtCrc(pub.precioPublicar)}</span>}
            {pub.condicionFb && <span>· {pub.condicionFb}</span>}
            {pub.categoriaFb && <span>· {pub.categoriaFb}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="px-2.5 py-1.5 rounded-lg text-xs text-[#8e8e9a] hover:text-white hover:bg-white/8 transition-colors border border-white/10"
          >
            {expanded ? 'Ocultar' : 'Ver texto'}
          </button>
          {pub.estadoPublicacion !== 'PUBLICADO' && (
            <>
              <button
                onClick={copiar}
                className="px-2.5 py-1.5 rounded-lg text-xs bg-[#4f7cff]/15 text-[#4f7cff] hover:bg-[#4f7cff]/25 transition-colors border border-[#4f7cff]/20"
              >
                Copiar
              </button>
              <button
                onClick={() => onPublicado(pub.id)}
                className="px-2.5 py-1.5 rounded-lg text-xs bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors border border-green-500/20"
              >
                Publicado
              </button>
            </>
          )}
          <button
            onClick={() => onEliminar(pub.id)}
            className="p-1.5 rounded-lg text-[#8e8e9a] hover:text-red-400 hover:bg-red-500/8 transition-colors"
            title="Eliminar"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
            </svg>
          </button>
        </div>
      </div>
      <AnimatePresence>
        {expanded && pub.textoFb && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-white/8 pt-3">
              <pre className="text-xs text-[#c8c8d0] whitespace-pre-wrap font-sans leading-relaxed bg-black/20 rounded-xl p-4">
                {pub.textoFb}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────
export default function AdminPublicaciones() {
  const { t } = useTranslation()
  const toast = useToast()
  const [tab, setTab] = useState('analizar') // 'analizar' | 'cola'

  // ── Tab: Analizar ──
  const [modoAnalisis, setModoAnalisis] = useState('nombre') // 'foto' | 'nombre'
  const [imagen, setImagen] = useState(null)
  const [preview, setPreview] = useState(null)
  const [nombreBusqueda, setNombreBusqueda] = useState('')
  const [analizando, setAnalizando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [tc, setTc] = useState(530)
  const [productoId, setProductoId] = useState('')
  const [productos, setProductos] = useState([])
  const [guardando, setGuardando] = useState(false)

  // ── Tab: Cola FB ──
  const [publicaciones, setPublicaciones] = useState([])
  const [loadingCola, setLoadingCola] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('')

  // ── Modal: Seleccionar productos para Cola FB ──
  const [modalProductos, setModalProductos] = useState(false)
  const [seleccionados, setSeleccionados] = useState(new Set())
  const [searchProd, setSearchProd] = useState('')
  const [generando, setGenerando] = useState(false)

  useEffect(() => {
    publicacionService.getTipoCambio()
      .then((r) => setTc(r.data?.tipoCambio ?? 530))
      .catch(() => {})
    productService.adminGetAll(0, 200)
      .then((r) => setProductos(r.data?.content ?? r.data ?? []))
      .catch(() => {})
  }, [])

  const cargarCola = useCallback(async () => {
    setLoadingCola(true)
    try {
      const r = await publicacionService.listar(filtroEstado || undefined)
      setPublicaciones(Array.isArray(r.data) ? r.data : [])
    } catch { toast({ message: 'Error cargando la cola', type: 'error' }) }
    finally { setLoadingCola(false) }
  }, [filtroEstado])

  useEffect(() => {
    if (tab === 'cola') cargarCola()
  }, [tab, cargarCola])

  const handleImagen = (file) => {
    setImagen(file)
    setResultado(null)
    setPreview(URL.createObjectURL(file))
  }

  const handleAnalizar = async () => {
    if (modoAnalisis === 'nombre') {
      if (!nombreBusqueda.trim()) { toast({ message: 'Escribe el nombre del producto', type: 'error' }); return }
      setAnalizando(true); setResultado(null)
      try {
        const r = await publicacionService.buscarPorNombre(nombreBusqueda.trim(), productoId || null)
        setResultado(r.data)
        if (productoId) { toast({ message: 'Precios guardados y texto FB generado', type: 'success' }) }
      } catch (err) {
        toast({ message: err.response?.data?.message ?? 'Error al buscar', type: 'error' })
      } finally { setAnalizando(false) }
    } else {
      if (!imagen) { toast({ message: 'Selecciona una imagen', type: 'error' }); return }
      setAnalizando(true); setResultado(null)
      try {
        const fd = new FormData()
        fd.append('imagen', imagen)
        const r = await publicacionService.analizar(fd)
        setResultado(r.data)
      } catch (err) {
        toast({ message: err.response?.data?.message ?? 'Error al analizar', type: 'error' })
      } finally { setAnalizando(false) }
    }
  }

  const handleGuardar = async () => {
    if (!productoId) { toast({ message: 'Selecciona un producto para guardar los precios', type: 'error' }); return }
    setGuardando(true)
    try {
      if (modoAnalisis === 'nombre') {
        await publicacionService.buscarPorNombre(nombreBusqueda.trim(), productoId)
      } else {
        const fd = new FormData()
        fd.append('imagen', imagen)
        fd.append('productoId', productoId)
        await publicacionService.analizar(fd)
      }
      toast({ message: 'Precios guardados y texto FB generado', type: 'success' })
      setTab('cola')
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al guardar', type: 'error' })
    } finally { setGuardando(false) }
  }

  const handleMarcarPublicado = async (id) => {
    try {
      await publicacionService.marcarPublicado(id)
      setPublicaciones((prev) => prev.map((p) =>
        p.id === id ? { ...p, estadoPublicacion: 'PUBLICADO' } : p
      ))
      toast({ message: 'Marcado como publicado', type: 'success' })
    } catch { toast({ message: 'Error al actualizar', type: 'error' }) }
  }

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar esta publicación?')) return
    try {
      await publicacionService.eliminar(id)
      setPublicaciones((prev) => prev.filter((p) => p.id !== id))
      toast({ message: 'Eliminado', type: 'success' })
    } catch { toast({ message: 'Error al eliminar', type: 'error' }) }
  }

  const handleGenerarSeleccionados = async () => {
    if (seleccionados.size === 0) { toast({ message: 'Selecciona al menos un producto', type: 'error' }); return }
    setGenerando(true)
    let exitosos = 0
    for (const id of seleccionados) {
      try { await publicacionService.generar(id); exitosos++ } catch {}
    }
    toast({ message: `${exitosos} publicación${exitosos !== 1 ? 'es' : ''} generada${exitosos !== 1 ? 's' : ''}`, type: 'success' })
    setSeleccionados(new Set())
    setModalProductos(false)
    setSearchProd('')
    cargarCola()
    setTab('cola')
    setGenerando(false)
  }

  const toggleSeleccion = (id) => {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const productosFiltrados = productos.filter((p) =>
    !searchProd || p.nombre?.toLowerCase().includes(searchProd.toLowerCase())
  )

  const filtradas = publicaciones.filter((p) =>
    !filtroEstado || p.estadoPublicacion === filtroEstado
  )

  return (
    <AdminLayout>
      <div className="space-y-5 max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#e8e8ed]">{t('admin.publicaciones.title')}</h1>
          <p className="text-sm text-[#8e8e9a] mt-1">
            {t('admin.publicaciones.text')}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/8 w-fit">
          {[
            { key: 'analizar', label: t('admin.publicaciones.new') },
            { key: 'cola', label: `${t('admin.publicaciones.status')}${publicaciones.length ? ` (${publicaciones.length})` : ''}` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                tab === key
                  ? 'bg-[#4f7cff] text-white shadow-[0_0_12px_rgba(79,124,255,0.3)]'
                  : 'text-[#8e8e9a] hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab: Analizar ── */}
        {tab === 'analizar' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

            {/* Selector de modo */}
            <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/8 w-fit">
              {[
                { key: 'nombre', label: 'Por nombre' },
                { key: 'foto',   label: 'Por foto (Vision API)' },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => { setModoAnalisis(key); setResultado(null) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    modoAnalisis === key
                      ? 'bg-[#4f7cff] text-white'
                      : 'text-[#8e8e9a] hover:text-white'
                  }`}
                >{label}</button>
              ))}
            </div>

            {/* ── Modo: Por nombre ── */}
            {modoAnalisis === 'nombre' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[#8e8e9a] block mb-1">{t('admin.publicaciones.product')}</label>
                  <input
                    type="text"
                    value={nombreBusqueda}
                    onChange={(e) => setNombreBusqueda(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAnalizar()}
                    placeholder="Ej: iPhone 15 Pro, Tablet Samsung Galaxy..."
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm placeholder:text-[#8e8e9a]/40 focus:outline-none focus:border-[#4f7cff]/60"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#8e8e9a] block mb-1">
                    Asociar a un producto (guarda precios en BD y genera texto FB)
                  </label>
                  <select value={productoId} onChange={(e) => setProductoId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60"
                  >
                    <option value="">— Solo buscar, no guardar —</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <Button onClick={handleAnalizar} disabled={analizando} className="w-full">
                  {analizando
                    ? <><Spinner size="sm" /><span className="ml-2">{t('admin.publicaciones.notes')}</span></>
                    : t('admin.publicaciones.publish')
                  }
                </Button>
              </div>
            )}

            {/* ── Modo: Por foto ── */}
            {modoAnalisis === 'foto' && (
              <>
                <ImageUploadZone onFile={handleImagen} />
                {preview && (
                  <div className="flex gap-4 items-start">
                    <img src={preview} alt="Preview"
                      className="w-24 h-24 object-cover rounded-xl border border-white/10 shrink-0"
                    />
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="text-xs text-[#8e8e9a] block mb-1">
                          Asociar a un producto (opcional — guarda precios en BD)
                        </label>
                        <select value={productoId} onChange={(e) => setProductoId(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60"
                        >
                          <option value="">— Solo analizar, no guardar —</option>
                          {productos.map((p) => (
                            <option key={p.id} value={p.id}>{p.nombre}</option>
                          ))}
                        </select>
                      </div>
                      <Button onClick={handleAnalizar} disabled={analizando} className="w-full">
                        {analizando
                          ? <><Spinner size="sm" /><span className="ml-2">{t('common.loading')}</span></>
                          : t('admin.publicaciones.markReady')
                        }
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            <VisionPanel
              resultado={resultado}
              tc={tc}
              onGuardar={productoId && resultado?.precios?.length > 0 ? handleGuardar : null}
              saving={guardando}
            />
          </motion.div>
        )}

        {/* ── Tab: Cola FB ── */}
        {tab === 'cola' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Filtros + botón agregar */}
            <div className="flex items-center gap-2 flex-wrap">
              {['', 'PENDIENTE', 'LISTO', 'PUBLICADO', 'ERROR'].map((e) => (
                <button
                  key={e}
                  onClick={() => setFiltroEstado(e)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    filtroEstado === e
                      ? 'bg-[#4f7cff]/20 text-[#4f7cff] border border-[#4f7cff]/30'
                      : 'bg-white/5 text-[#8e8e9a] border border-white/10 hover:text-white'
                  }`}
                >
                  {e || 'Todos'}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={cargarCola}
                  className="px-3 py-1 rounded-full text-xs text-[#8e8e9a] hover:text-white border border-white/10 hover:bg-white/5 transition-colors"
                >
                  Actualizar
                </button>
                <button
                  onClick={() => { setModalProductos(true); setSeleccionados(new Set()); setSearchProd('') }}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-[#4f7cff]/15 text-[#4f7cff] border border-[#4f7cff]/30 hover:bg-[#4f7cff]/25 transition-colors"
                >
                  + Agregar a la cola
                </button>
              </div>
            </div>

            {/* Lista */}
            {loadingCola ? (
              <div className="flex justify-center py-12"><Spinner /></div>
            ) : filtradas.length === 0 ? (
              <div className="text-center py-12 text-[#8e8e9a] text-sm">
                No hay publicaciones{filtroEstado ? ` con estado ${filtroEstado}` : ''}.
                <br />
                <span className="text-xs mt-1 block">
                  Haz clic en "+ Agregar a la cola" para seleccionar productos del catálogo.
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {filtradas.map((pub) => (
                  <PubRow
                    key={pub.id}
                    pub={pub}
                    onPublicado={handleMarcarPublicado}
                    onEliminar={handleEliminar}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Modal: Seleccionar productos ── */}
        <AnimatePresence>
          {modalProductos && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={(e) => e.target === e.currentTarget && setModalProductos(false)}
            >
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-lg bg-[#111114] border border-white/10 rounded-2xl overflow-hidden flex flex-col max-h-[80vh]"
              >
                {/* Header modal */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
                  <div>
                    <h3 className="text-base font-semibold text-[#e8e8ed]">Seleccionar productos</h3>
                    <p className="text-xs text-[#8e8e9a] mt-0.5">
                      Elige los productos para generar texto de Facebook Marketplace
                    </p>
                  </div>
                  <button onClick={() => setModalProductos(false)}
                    className="p-1.5 rounded-lg text-[#8e8e9a] hover:text-white hover:bg-white/8 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>

                {/* Búsqueda */}
                <div className="px-5 py-3 border-b border-white/8 shrink-0">
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8e9a]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                      type="text"
                      value={searchProd}
                      onChange={(e) => setSearchProd(e.target.value)}
                      placeholder="Buscar producto..."
                      className="w-full h-9 pl-9 pr-4 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm placeholder-[#8e8e9a] focus:outline-none focus:border-[#4f7cff]/60"
                    />
                  </div>
                </div>

                {/* Lista de productos */}
                <div className="flex-1 overflow-y-auto px-3 py-2">
                  {productosFiltrados.length === 0 ? (
                    <p className="text-center text-sm text-[#8e8e9a] py-8">{t('common.noData')}</p>
                  ) : (
                    productosFiltrados.map((p) => (
                      <label key={p.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/4 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={seleccionados.has(p.id)}
                          onChange={() => toggleSeleccion(p.id)}
                          className="w-4 h-4 rounded border-white/20 accent-[#4f7cff]"
                        />
                        {p.imagenUrl ? (
                          <img src={p.imagenUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0 bg-white/5" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-white/5 shrink-0 flex items-center justify-center text-[#8e8e9a]">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#e8e8ed] truncate">{p.nombre}</p>
                          <p className="text-xs text-[#8e8e9a]">
                            {p.precioVenta > 0 ? `₡${new Intl.NumberFormat('es-CR').format(p.precioVenta)}` : '—'}
                            {p.stock !== undefined && ` · ${p.stock} en stock`}
                          </p>
                        </div>
                      </label>
                    ))
                  )}
                </div>

                {/* Footer modal */}
                <div className="px-5 py-4 border-t border-white/8 shrink-0 flex items-center justify-between gap-3">
                  <span className="text-sm text-[#8e8e9a]">
                    {seleccionados.size > 0 ? `${seleccionados.size} seleccionado${seleccionados.size !== 1 ? 's' : ''}` : 'Ninguno seleccionado'}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => setModalProductos(false)}
                      className="px-4 py-2 rounded-xl border border-white/10 text-sm text-[#8e8e9a] hover:text-white hover:bg-white/5 transition-colors">
                      {t('common.cancel')}
                    </button>
                    <Button onClick={handleGenerarSeleccionados} disabled={generando || seleccionados.size === 0}>
                      {generando
                        ? <><Spinner size="sm" /><span className="ml-1.5">Generando...</span></>
                        : `Generar${seleccionados.size > 0 ? ` (${seleccionados.size})` : ''}`
                      }
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  )
}
