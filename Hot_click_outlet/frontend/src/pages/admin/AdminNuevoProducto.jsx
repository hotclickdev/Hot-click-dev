import { useState, useEffect, useRef, useCallback } from 'react'
import { useToast } from '@/components/ui/Toast'
import useAuthStore from '@/store/authStore'
import { MAX_FOTOS } from './nuevo-producto/productFormUi'
import WizardDone from './nuevo-producto/WizardDone'
import { EMPTY_FORM, DRAFT_KEY, stepsParaRol, seoByLangAuto } from './nuevo-producto/wizardHelpers'
import { useWizardActions } from './nuevo-producto/useWizardActions'
import WizardShell from './nuevo-producto/WizardShell'
import { guardarBorrador, cargarBorrador, limpiarBorrador, programarAutoGuardado } from './nuevo-producto/wizardDraft'
import { handleNext, handlePrev, handleReset } from './nuevo-producto/wizardNav'
import { cargarCatalogoWizard, handleCrearMarca } from './nuevo-producto/wizardCatalog'

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
    cargarCatalogoWizard({ setCategories, setBodegas, setMarcas, setLoadingCatalog, toast })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => programarAutoGuardado(form, draftTimerRef, setTieneBorrador, setAutoSaveLabel), [form])

  useEffect(() => {
    const auto = seoByLangAuto(form.nombre, form.descripcion, form.precioVenta, seoAuto)
    setForm(p => { // eslint-disable-line react-hooks/set-state-in-effect -- SEO derivado del nombre/descripcion
      const next = { ...p.seoByLang, ...auto }
      return { ...p, metaTitle: next.es.title, metaDescription: next.es.description, seoByLang: next }
    })
  }, [form.nombre, form.descripcion, form.precioVenta, JSON.stringify(seoAuto)]) // eslint-disable-line react-hooks/exhaustive-deps

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

  if (done) {
    return (
      <WizardDone
        productoCreado={productoCreado}
        form={form}
        onReset={() => handleReset({
          setForm, setImagenesFile, setPreviewUrls, setProductoCreado,
          setTrademarkWarning, setEtiquetas, setPriceWarning, idempotencyKey,
          setWizardStep, setDone,
        })}
      />
    )
  }

  const isLastStep = wizardStep === STEPS.length - 1
  const canQuickPublish = wizardStep >= 4 && !isLastStep && !!form.nombre && !!form.categoriaId

  return (
    <WizardShell
      wizard={{
        previewUrls, form, STEPS, wizardStep, etiquetas, fuenteDetalles,
        validationMsg, analizando, isLastStep, saving, sinBodegas, autoSaveLabel,
        canQuickPublish,
        onPrev: () => handlePrev(wizardStep, setValidationMsg, setWizardStep),
        onNext: () => handleNext(STEPS, wizardStep, form, setValidationMsg, setWizardStep),
        onSave: handleSave,
        onGuardarBorrador: () => guardarBorrador(form, toast, setTieneBorrador),
        tieneBorrador,
        onCargarBorrador: () => cargarBorrador(toast, setForm, setWizardStep),
        onLimpiarBorrador: () => limpiarBorrador(setTieneBorrador, setForm),
        analizandoIdx, imagenesFile,
        onAddFiles: handleAddFiles,
        onRemoveFile: handleRemoveFile,
        onAnalizar: handleAnalizar,
        onSkip: () => setWizardStep(1),
        setCampo, setForm, trademarkWarning, priceWarning, setPriceWarning,
        categories, bodegas, marcas, loadingCatalog,
        showNuevaMarca, setShowNuevaMarca, nuevaMarca, setNuevaMarca, creandoMarca,
        onCrearMarca: () => handleCrearMarca({
          nuevaMarca, setCreandoMarca, setMarcas, setForm, setNuevaMarca, setShowNuevaMarca, toast,
        }),
        seoLang, setSeoLang, seoAuto, setSeoAuto,
      }}
    />
  )
}
