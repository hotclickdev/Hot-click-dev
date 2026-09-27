import { useCallback, useState } from 'react'
import { ejecutarValidarGiftCard } from './ejecutarValidarGiftCard'
import type { GiftCardAplicada } from './paquetesCompra'

export type EstadoGiftCard = ReturnType<typeof useGiftCardCompra>

/** Tarjeta de regalo del pago: solo con sesión, igual que el endpoint de validación. */
export function useGiftCardCompra(token: string | null) {
  const [input, setInput] = useState('')
  const [estado, setEstado] = useState('idle')
  const [aplicada, setAplicada] = useState<GiftCardAplicada | null>(null)

  const validar = useCallback(async () => {
    await ejecutarValidarGiftCard({ gcInput: input, token, setGcEstado: setEstado, setGiftCard: setAplicada })
  }, [input, token])

  const quitar = useCallback(() => {
    setAplicada(null)
    setInput('')
    setEstado('idle')
  }, [])

  return { disponible: Boolean(token), input, setInput, estado, aplicada, validar, quitar }
}
