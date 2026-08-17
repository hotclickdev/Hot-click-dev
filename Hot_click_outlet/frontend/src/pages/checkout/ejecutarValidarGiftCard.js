import { giftCardService } from '@/services/giftCardService'

/**
 * Valida una gift card — mismo orden de setState que el original.
 * @param {object} deps
 */
export async function ejecutarValidarGiftCard({
  gcInput, token, setGcEstado, setGcSaldo, setGcCodigo,
}) {
  if (!gcInput.trim() || !token) return
  setGcEstado('loading')
  try {
    const { data } = await giftCardService.validar(gcInput.trim().toUpperCase())
    if (data?.valida) {
      setGcSaldo(data.saldoActual ?? 0)
      setGcCodigo(data.codigo ?? gcInput.trim().toUpperCase())
      setGcEstado('valid')
    } else {
      setGcSaldo(0)
      setGcCodigo(null)
      setGcEstado('invalid')
    }
  } catch {
    setGcSaldo(0)
    setGcCodigo(null)
    setGcEstado('invalid')
  }
}
