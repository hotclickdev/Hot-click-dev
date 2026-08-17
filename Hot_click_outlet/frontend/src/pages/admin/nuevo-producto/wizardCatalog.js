import { productService } from '@/services/productService'
import { warehouseService } from '@/services/orderService'
import { marcaService } from '@/services/marcaService'

/**
 * Carga categorías, bodegas y marcas del wizard.
 * @param {object} params
 * @param {function} params.setCategories
 * @param {function} params.setBodegas
 * @param {function} params.setMarcas
 * @param {function} params.setLoadingCatalog
 * @param {function} params.toast
 */
export function cargarCatalogoWizard({ setCategories, setBodegas, setMarcas, setLoadingCatalog, toast }) {
  return Promise.all([
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
}

/**
 * Crea una marca y la selecciona en el formulario.
 * @param {object} params
 */
export async function handleCrearMarca({
  nuevaMarca, setCreandoMarca, setMarcas, setForm, setNuevaMarca, setShowNuevaMarca, toast,
}) {
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
