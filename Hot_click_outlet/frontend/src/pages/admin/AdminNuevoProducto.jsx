import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { productService } from '@/services/productService'
import { warehouseService } from '@/services/orderService'
import { marcaService } from '@/services/marcaService'
import EmpresaProfileCard from '@/components/admin/EmpresaProfileCard'
import useAuthStore from '@/store/authStore'
import { MAX_FOTOS } from './nuevo-producto/productFormUi'
import PhotoPanel from './nuevo-producto/PhotoPanel'
import WizardProgress from './nuevo-producto/WizardProgress'
import PasoFotos from './nuevo-producto/PasoFotos'
import PasoNombre from './nuevo-producto/PasoNombre'
import PasoDescripcion from './nuevo-producto/PasoDescripcion'
import PasoPrecios from './nuevo-producto/PasoPrecios'
import PasoClasificacion from './nuevo-producto/PasoClasificacion'
import PasoDetalles from './nuevo-producto/PasoDetalles'
import PasoContenido from './nuevo-producto/PasoContenido'
import PasoSeo from './nuevo-producto/PasoSeo'
import WizardDone from './nuevo-producto/WizardDone'
import { EMPTY_FORM, DRAFT_KEY, stepsParaRol, seoByLangAuto } from './nuevo-producto/wizardHelpers'
import { useWizardActions } from './nuevo-producto/useWizardActions'

export default function AdminNuevoProducto() {
  const toast = useToast()
  const isAdmin = useAuthStore((s) => s.userRole) === 'ADMIN'
  const STEPS = stepsParaRol(isAdmin)

  const [wizardStep, setWizardStep] = useState(0)
  const [done, setDone] = useState(false)
  const [validationMsg, setValidationMsg] = useState('')

  const [imagenesFile, setImagenesFile] = useState([])
  const [previewUrls, setPreviewUrls] = useState([])

  const [analizando, setAnalizando] = useState(false)
  const [analizandoIdx, setAnalizandoIdx] = useState(-1)
  const [etiquetas, setEtiquetas] = useState([])
  const [fuenteDetalles, setFuenteDetalles] = useState(null)

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
    setLoadingCatalog(true) // eslint-disable-line react-hooks/set-state-in-effect -- carga de catálogo al montar
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
  }, [form])

  useEffect(() => {
    const auto = seoByLangAuto(form.nombre, form.descripcion, form.precioVenta, seoAuto)
    setForm(p => { // eslint-disable-line react-hooks/set-state-in-effect -- SEO derivado del nombre/descripcion
      const next = { ...p.seoByLang, ...auto }
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

  const { handleAnalizar, handleSave } = useWizardActions({
    form, setForm, imagenesFile, toast,
    setAnalizando, setAnalizandoIdx, setEtiquetas, setFuenteDetalles,
    marcas, categories, bodegas,
    setTrademarkWarning, setWizardStep,
    priceWarning, setPriceWarning, setSaving,
    idempotencyKey, setTieneBorrador, setProductoCreado, setDone,
  })

  const setCampo = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))
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
    if (id === 'fotos') {
      return (
        <PasoFotos
          tieneBorrador={tieneBorrador}
          onCargarBorrador={cargarBorrador}
          onLimpiarBorrador={limpiarBorrador}
          analizando={analizando}
          analizandoIdx={analizandoIdx}
          imagenesFile={imagenesFile}
          previewUrls={previewUrls}
          onAddFiles={handleAddFiles}
          onRemoveFile={handleRemoveFile}
          onAnalizar={handleAnalizar}
          onSkip={() => setWizardStep(1)}
        />
      )
    }
    if (id === 'nombre') return <PasoNombre form={form} setCampo={setCampo} trademarkWarning={trademarkWarning} />
    if (id === 'descripcion') return <PasoDescripcion form={form} setCampo={setCampo} />
    if (id === 'precios') return <PasoPrecios form={form} setCampo={setCampo} priceWarning={priceWarning} setPriceWarning={setPriceWarning} />
    if (id === 'clasificacion') {
      return (
        <PasoClasificacion
          form={form} setCampo={setCampo} setForm={setForm}
          categories={categories} bodegas={bodegas} marcas={marcas}
          loadingCatalog={loadingCatalog} sinBodegas={sinBodegas}
          showNuevaMarca={showNuevaMarca} setShowNuevaMarca={setShowNuevaMarca}
          nuevaMarca={nuevaMarca} setNuevaMarca={setNuevaMarca}
          creandoMarca={creandoMarca} onCrearMarca={handleCrearMarca}
        />
      )
    }
    if (id === 'detalles') return <PasoDetalles form={form} setCampo={setCampo} setForm={setForm} />
    if (id === 'contenido') return <PasoContenido form={form} setCampo={setCampo} setForm={setForm} />
    if (id === 'seo') {
      return (
        <PasoSeo
          form={form} setForm={setForm}
          seoLang={seoLang} setSeoLang={setSeoLang}
          seoAuto={seoAuto} setSeoAuto={setSeoAuto}
        />
      )
    }
    return null
  }

  if (done) return <WizardDone productoCreado={productoCreado} form={form} onReset={handleReset} />

  const isLastStep = wizardStep === STEPS.length - 1
  const canQuickPublish = wizardStep >= 4 && !isLastStep && !!form.nombre && !!form.categoriaId

  return (
    <div className="flex -mx-4 -my-4 md:-mx-6 md:-mt-6 lg:-mx-8 min-h-[calc(100vh-3.5rem)] md:min-h-screen">

      <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 p-6 pt-8" style={{ borderRight: '1px solid var(--hc-border)' }}>
        <div className="flex-1">
          <PhotoPanel previews={previewUrls} imagenes={form.imagenes} />
        </div>
        <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--hc-border)' }}>
          <p className="text-[10px] mb-2" style={{ color: 'var(--hc-muted)', opacity: 0.8 }}>Creando como:</p>
          <EmpresaProfileCard />
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col px-4 py-6 md:px-8 md:py-8">
        <div className="w-full max-w-lg mx-auto lg:mx-0 flex-1 flex flex-col">

          <WizardProgress step={wizardStep} steps={STEPS} />

          <div className="mt-6 mb-6">
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--hc-text)' }}>{STEPS[wizardStep].title}</h1>
            {STEPS[wizardStep].subtitle && (
              <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>{STEPS[wizardStep].subtitle}</p>
            )}
          </div>

          {etiquetas.length > 0 && wizardStep > 0 && !isLastStep && (
            <div className="mb-5 rounded-xl px-4 py-3 flex items-center gap-3" style={{ backgroundColor: 'rgba(23,71,168,0.08)', border: '1px solid rgba(23,71,168,0.2)' }}>
              <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--hc-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
              <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                {etiquetas.slice(0, 5).map((e, i) => (
                  <span key={i} className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                    style={i === 0
                      ? { backgroundColor: 'rgba(23,71,168,0.15)', color: 'var(--hc-accent)', border: '1px solid rgba(23,71,168,0.3)' }
                      : { backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)', border: '1px solid var(--hc-border)' }}>{e}</span>
                ))}
              </div>
              {fuenteDetalles && <span className="text-[10px] shrink-0" style={{ color: 'var(--hc-muted)', opacity: 0.8 }}>via {fuenteDetalles}</span>}
            </div>
          )}

          {validationMsg && (
            <div className="mb-5 flex items-center gap-2 px-4 py-3 rounded-xl text-xs" style={{ backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', color: '#a8291f' }}>
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {validationMsg}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div key={wizardStep}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}>
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>

          {wizardStep > 0 && !analizando && (
            <div className="mt-8 flex items-center gap-3 flex-wrap">
              <button onClick={handlePrev}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm transition-colors shrink-0 hover:bg-[var(--hc-surface-2)]"
                style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
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
                <span className="text-xs flex items-center gap-1 shrink-0" style={{ color: '#1E7F4F' }}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                  </svg>
                  {autoSaveLabel}
                </span>
              )}
            </div>
          )}

          {canQuickPublish && (
            <div className="mt-4 flex items-center gap-4">
              <button type="button" onClick={handleSave} disabled={saving}
                className="text-sm transition-colors disabled:opacity-50" style={{ color: 'var(--hc-accent)' }}>
                {saving ? 'Publicando…' : 'Publicar ahora →'}
              </button>
              <span className="text-xs" style={{ color: 'var(--hc-muted)', opacity: 0.5 }}>·</span>
              <button type="button" onClick={guardarBorrador}
                className="text-sm transition-colors" style={{ color: 'var(--hc-muted)' }}>
                Guardar borrador
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
