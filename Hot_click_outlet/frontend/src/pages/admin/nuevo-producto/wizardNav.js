import { EMPTY_FORM } from './wizardHelpers'

/**
 * Valida el paso actual y avanza. Mismo orden de side effects que el wizard original.
 * @param {object[]} STEPS
 * @param {number} wizardStep
 * @param {object} form
 * @param {function} setValidationMsg
 * @param {function} setWizardStep
 */
export function handleNext(STEPS, wizardStep, form, setValidationMsg, setWizardStep) {
  const step = STEPS[wizardStep]
  if (step?.validate && !step.validate(form)) {
    setValidationMsg(step.validateMsg)
    return
  }
  setValidationMsg('')
  if (wizardStep < STEPS.length - 1) setWizardStep(s => s + 1)
}

/**
 * Vuelve al paso anterior y limpia el mensaje de validación.
 * @param {number} wizardStep
 * @param {function} setValidationMsg
 * @param {function} setWizardStep
 */
export function handlePrev(wizardStep, setValidationMsg, setWizardStep) {
  setValidationMsg('')
  if (wizardStep > 0) setWizardStep(s => s - 1)
}

/**
 * Reinicia el wizard al estado inicial. Mismo orden de setters que el original.
 * @param {object} params
 */
export function handleReset({
  setForm, setImagenesFile, setPreviewUrls, setProductoCreado,
  setTrademarkWarning, setEtiquetas, setPriceWarning, idempotencyKey,
  setWizardStep, setDone,
}) {
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
