import { productService } from '@/services/productService'
import { warehouseService } from '@/services/orderService'
import { marcaService } from '@/services/marcaService'
import { mensajeErrorRespuesta } from './wizardHelpers'
import type { Dispatch, SetStateAction } from 'react'
import type {
  WizardBodega,
  WizardCategoria,
  WizardForm,
  WizardMarca,
  WizardToast,
} from './wizardHelpers'

type CatalogoWizardParams = {
  setCategories: Dispatch<SetStateAction<WizardCategoria[]>>
  setBodegas: Dispatch<SetStateAction<WizardBodega[]>>
  setMarcas: Dispatch<SetStateAction<WizardMarca[]>>
  setLoadingCatalog: Dispatch<SetStateAction<boolean>>
  toast: WizardToast
}

/**
 * Carga categorías, bodegas y marcas del wizard.
 * @param {object} params
 * @param {function} params.setCategories
 * @param {function} params.setBodegas
 * @param {function} params.setMarcas
 * @param {function} params.setLoadingCatalog
 * @param {function} params.toast
 */
export function cargarCatalogoWizard({ setCategories, setBodegas, setMarcas, setLoadingCatalog, toast }: CatalogoWizardParams) {
  return Promise.all([
    productService.getCategories(),
    warehouseService.getAll(),
    marcaService.getAll(),
  ]).then(([catsR, bodsR, marcsR]) => {
    setCategories((catsR.data as WizardCategoria[] | undefined) ?? [])
    const bodsData = bodsR.data as WizardBodega[] | { content?: WizardBodega[] } | undefined
    const bods = Array.isArray(bodsData) ? bodsData : bodsData?.content ?? []
    setBodegas(bods)
    const marcsData = marcsR.data as { data?: WizardMarca[] } | WizardMarca[] | undefined
    const ms = (marcsData as { data?: WizardMarca[] } | undefined)?.data ?? marcsData ?? []
    setMarcas(Array.isArray(ms) ? ms : [])
  }).catch(() => {
    toast({ message: 'Error al cargar categorías o bodegas. Recargá la página.', type: 'error' })
  }).finally(() => setLoadingCatalog(false))
}

type CrearMarcaParams = {
  nuevaMarca: string
  setCreandoMarca: Dispatch<SetStateAction<boolean>>
  setMarcas: Dispatch<SetStateAction<WizardMarca[]>>
  setForm: Dispatch<SetStateAction<WizardForm>>
  setNuevaMarca: Dispatch<SetStateAction<string>>
  setShowNuevaMarca: Dispatch<SetStateAction<boolean>>
  toast: WizardToast
}

/**
 * Crea una marca y la selecciona en el formulario.
 * @param {object} params
 */
export async function handleCrearMarca({
  nuevaMarca, setCreandoMarca, setMarcas, setForm, setNuevaMarca, setShowNuevaMarca, toast,
}: CrearMarcaParams) {
  if (!nuevaMarca.trim()) return
  setCreandoMarca(true)
  try {
    const res = await marcaService.create({ nombreMarca: nuevaMarca.trim() })
    const body = res.data as { data?: WizardMarca } | WizardMarca | undefined
    const m = (body && typeof body === 'object' && 'data' in body ? body.data : undefined) ?? (body as WizardMarca)
    setMarcas(prev => [...prev, m])
    setForm(prev => ({ ...prev, marcaId: String(m.id) }))
    setNuevaMarca('')
    setShowNuevaMarca(false)
    toast({ message: `Marca "${m.nombreMarca}" creada`, type: 'success' })
  } catch (err: unknown) {
    toast({ message: mensajeErrorRespuesta(err) ?? 'Error al crear marca', type: 'error' })
  } finally { setCreandoMarca(false) }
}
