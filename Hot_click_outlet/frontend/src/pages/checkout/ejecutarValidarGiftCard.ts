import { giftCardService } from '@/services/giftCardService'

type GiftCardValidacion = {
  valida?: boolean
  saldoActual?: number
  codigo?: string
}

type ValidarGiftCardDeps = {
  gcInput: string
  token: string | null
  setGcEstado: (estado: string) => void
  setGcSaldo: (saldo: number) => void
  setGcCodigo: (codigo: string | null) => void
}

/**
 * Valida una gift card — mismo orden de setState que el original.
 */
export async function ejecutarValidarGiftCard({
  gcInput, token, setGcEstado, setGcSaldo, setGcCodigo,
}: ValidarGiftCardDeps) {
  if (!gcInput.trim() || !token) return
  setGcEstado('loading')
  try {
    const { data } = await giftCardService.validar(gcInput.trim().toUpperCase())
    const resultado = data as GiftCardValidacion
    if (resultado?.valida) {
      setGcSaldo(resultado.saldoActual ?? 0)
      setGcCodigo(resultado.codigo ?? gcInput.trim().toUpperCase())
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
