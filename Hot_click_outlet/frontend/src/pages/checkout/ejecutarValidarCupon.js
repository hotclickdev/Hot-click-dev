import { cuponService } from '@/services/cuponService'

/**
 * Valida un cupón — mismo orden de setState que el original.
 * @param {object} deps
 */
export async function ejecutarValidarCupon({
  cuponInput, setCuponEstado, setCuponError, setCuponDescuento, setCuponCodigo,
}) {
  if (!cuponInput.trim()) return
  setCuponEstado('loading')
  setCuponError('')
  try {
    const { data } = await cuponService.validar(cuponInput.trim())
    const pct = data?.data?.descuento ?? data?.descuento ?? 0
    const cod = data?.data?.codigo ?? data?.codigo ?? cuponInput.trim().toUpperCase()
    setCuponDescuento(pct)
    setCuponCodigo(cod)
    setCuponEstado('valid')
  } catch (err) {
    const msg = err?.response?.data?.message || err?.response?.data?.error || 'Código inválido o no disponible'
    setCuponDescuento(0)
    setCuponCodigo(null)
    setCuponError(msg)
    setCuponEstado('invalid')
  }
}
