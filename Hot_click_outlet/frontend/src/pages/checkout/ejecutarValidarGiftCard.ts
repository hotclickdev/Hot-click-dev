import { giftCardService } from '@/services/giftCardService'
import type { GiftCardAplicada } from './paquetesCompra'

type GiftCardValidacion = {
  valida?: boolean
  saldoActual?: number
  codigo?: string
  empresaId?: number | null
}

type ValidarGiftCardDeps = {
  gcInput: string
  token: string | null
  setGcEstado: (estado: string) => void
  setGiftCard: (giftCard: GiftCardAplicada | null) => void
}

/**
 * Valida una tarjeta de regalo; guarda su negocio porque solo cubre el paquete de ese negocio.
 */
export async function ejecutarValidarGiftCard({ gcInput, token, setGcEstado, setGiftCard }: ValidarGiftCardDeps) {
  if (!gcInput.trim() || !token) return
  setGcEstado('loading')
  try {
    const { data } = await giftCardService.validar(gcInput.trim().toUpperCase())
    const resultado = data as GiftCardValidacion
    if (resultado?.valida) {
      setGiftCard({
        codigo: resultado.codigo ?? gcInput.trim().toUpperCase(),
        saldo: resultado.saldoActual ?? 0,
        empresaId: resultado.empresaId ?? null,
      })
      setGcEstado('valid')
    } else {
      setGiftCard(null)
      setGcEstado('invalid')
    }
  } catch {
    setGiftCard(null)
    setGcEstado('invalid')
  }
}
