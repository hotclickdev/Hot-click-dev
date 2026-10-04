import { useCallback } from 'react'
import usePedidoExtrasStore from '@/store/pedidoExtrasStore'
import { ejecutarValidarCupon } from './ejecutarValidarCupon'
import { ejecutarValidarGiftCard } from './ejecutarValidarGiftCard'

/**
 * Cupón y gift card del pedido, compartidos entre el carrito y el checkout (store `pedidoExtras`).
 * Usa las mismas validaciones del checkout original (`ejecutarValidarCupon` / `ejecutarValidarGiftCard`).
 */
export function useCodigosPedido(token: string | null) {
  const s = usePedidoExtrasStore()
  const { cuponInput, gcInput } = s

  const validarCupon = useCallback(async () => {
    await ejecutarValidarCupon({
      cuponInput,
      setCuponEstado: s.setCuponEstado,
      setCuponError: s.setCuponError,
      setCuponDescuento: s.setCuponDescuento,
      setCuponCodigo: s.setCuponCodigo,
    })
  }, [cuponInput, s.setCuponEstado, s.setCuponError, s.setCuponDescuento, s.setCuponCodigo])

  const validarGiftCard = useCallback(async () => {
    await ejecutarValidarGiftCard({
      gcInput,
      token,
      setGcEstado: s.setGcEstado,
      setGiftCard: (gift) => {
        s.setGcSaldo(gift?.saldo ?? 0)
        s.setGcCodigo(gift?.codigo ?? null)
      },
    })
  }, [gcInput, token, s.setGcEstado, s.setGcSaldo, s.setGcCodigo])

  const cambiarCupon = useCallback((valor: string) => {
    s.setCuponInput(valor)
    s.setCuponEstado('idle')
    s.setCuponDescuento(0)
    s.setCuponCodigo(null)
    s.setCuponError('')
  }, [s])

  const cambiarGiftCard = useCallback((valor: string) => {
    s.setGcInput(valor)
    s.setGcEstado('idle')
    s.setGcSaldo(0)
    s.setGcCodigo(null)
  }, [s])

  return {
    cuponInput,
    cuponEstado: s.cuponEstado,
    cuponError: s.cuponError,
    cuponDescuento: s.cuponDescuento,
    cuponCodigo: s.cuponCodigo,
    gcInput,
    gcEstado: s.gcEstado,
    gcSaldo: s.gcSaldo,
    gcCodigo: s.gcCodigo,
    validarCupon,
    validarGiftCard,
    cambiarCupon,
    quitarCupon: () => cambiarCupon(''),
    cambiarGiftCard,
    quitarGiftCard: () => cambiarGiftCard(''),
  }
}

export type CodigosPedido = ReturnType<typeof useCodigosPedido>

/** Descuento del cupón (porcentaje sobre el subtotal), gift card y total tras ambos. */
export function totalesConCodigos(subtotal: number, envio: number, cuponPorcentaje: number, gcSaldo: number) {
  const descuento = cuponPorcentaje > 0 ? Math.round((subtotal * cuponPorcentaje) / 100) : 0
  const base = subtotal - descuento + envio
  const giftCard = gcSaldo > 0 ? Math.min(gcSaldo, base) : 0
  return { descuento, giftCard, total: base - giftCard }
}
