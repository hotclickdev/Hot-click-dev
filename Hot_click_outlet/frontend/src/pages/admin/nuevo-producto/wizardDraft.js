import { EMPTY_FORM, DRAFT_KEY } from './wizardHelpers'

/**
 * Persiste el formulario en localStorage (sin fotos).
 * @param {object} form
 * @param {function} toast
 * @param {function} setTieneBorrador
 */
export function guardarBorrador(form, toast, setTieneBorrador) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...form, imagenes: [] }))
    setTieneBorrador(true)
    toast({ message: 'Borrador guardado (las fotos no se incluyen)', type: 'success' })
  } catch { toast({ message: 'No se pudo guardar el borrador', type: 'error' }) }
}

/**
 * Restaura el borrador y salta al paso de nombre.
 * @param {function} toast
 * @param {function} setForm
 * @param {function} setWizardStep
 */
export function cargarBorrador(toast, setForm, setWizardStep) {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return
    setForm({ ...EMPTY_FORM, ...JSON.parse(raw) })
    setWizardStep(1)
    toast({ message: 'Borrador cargado. Las fotos no se guardaron — volvé a subirlas si son necesarias.', type: 'warning' })
  } catch { toast({ message: 'Error al cargar el borrador', type: 'error' }) }
}

/**
 * Borra el borrador y vacía el formulario.
 * @param {function} setTieneBorrador
 * @param {function} setForm
 */
export function limpiarBorrador(setTieneBorrador, setForm) {
  localStorage.removeItem(DRAFT_KEY)
  setTieneBorrador(false)
  setForm(EMPTY_FORM)
}

/**
 * Programa el auto-guardado del borrador. Pensado para el cuerpo de un useEffect.
 * @param {object} form
 * @param {{ current: ReturnType<typeof setTimeout> | null }} draftTimerRef
 * @param {function} setTieneBorrador
 * @param {function} setAutoSaveLabel
 * @returns {(() => void) | undefined}
 */
export function programarAutoGuardado(form, draftTimerRef, setTieneBorrador, setAutoSaveLabel) {
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
}
