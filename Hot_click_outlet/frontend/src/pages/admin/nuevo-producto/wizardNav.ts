import { EMPTY_FORM } from './wizardHelpers'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { ProductoCreadoWizard, WizardForm, WizardStep } from './wizardHelpers'

/**
 * Valida el paso actual y avanza. Mismo orden de side effects que el wizard original.
 * @param {object[]} STEPS
 * @param {number} wizardStep
 * @param {object} form
 * @param {function} setValidationMsg
 * @param {function} setWizardStep
 */
export function handleNext(STEPS: WizardStep[], wizardStep: number, form: WizardForm, setValidationMsg: Dispatch<SetStateAction<string>>, setWizardStep: Dispatch<SetStateAction<number>>) {
  const step = STEPS[wizardStep]
  if (step?.validate && !step.validate(form)) {
    setValidationMsg(step.validateMsg ?? '')
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
export function handlePrev(wizardStep: number, setValidationMsg: Dispatch<SetStateAction<string>>, setWizardStep: Dispatch<SetStateAction<number>>) {
  setValidationMsg('')
  if (wizardStep > 0) setWizardStep(s => s - 1)
}

type ResetWizardParams = {
  setForm: Dispatch<SetStateAction<WizardForm>>
  setImagenesFile: Dispatch<SetStateAction<File[]>>
  setPreviewUrls: Dispatch<SetStateAction<string[]>>
  setProductoCreado: Dispatch<SetStateAction<ProductoCreadoWizard | null>>
  setTrademarkWarning: Dispatch<SetStateAction<string>>
  setEtiquetas: Dispatch<SetStateAction<string[]>>
  setPriceWarning: Dispatch<SetStateAction<boolean>>
  idempotencyKey: MutableRefObject<string>
  setWizardStep: Dispatch<SetStateAction<number>>
  setDone: Dispatch<SetStateAction<boolean>>
}

/**
 * Reinicia el wizard al estado inicial. Mismo orden de setters que el original.
 * @param {object} params
 */
export function handleReset({
  setForm, setImagenesFile, setPreviewUrls, setProductoCreado,
  setTrademarkWarning, setEtiquetas, setPriceWarning, idempotencyKey,
  setWizardStep, setDone,
}: ResetWizardParams) {
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
