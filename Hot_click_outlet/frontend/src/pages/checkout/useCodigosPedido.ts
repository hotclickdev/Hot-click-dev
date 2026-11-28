import { useCallback } from 'react'
import usePedidoExtrasStore from '@/store/pedidoExtrasStore'
import { ejecutarValidarCupon } from './ejecutarValidarCupon'

/**
 * Cupón del pedido, compartido entre el carrito y el checkout (store `pedidoExtras`).
 * Usa la misma validación del checkout original (`ejecutarValidarCupon`).
 */
export function useCodigosPedido() {
  const s = usePedidoExtrasStore()
  const { cuponInput } = s

  const validarCupon = useCallback(async () => {
    await ejecutarValidarCupon({
      cuponInput,
      setCuponEstado: s.setCuponEstado,
      setCuponError: s.setCuponError,
      setCuponDescuento: s.setCuponDescuento,
      setCuponCodigo: s.setCuponCodigo,
    })
  }, [cuponInput, s.setCuponEstado, s.setCuponError, s.setCuponDescuento, s.setCuponCodigo])

  const cambiarCupon = useCallback((valor: string) => {
    s.setCuponInput(valor)
    s.setCuponEstado('idle')
    s.setCuponDescuento(0)
    s.setCuponCodigo(null)
    s.setCuponError('')
  }, [s])

  return {
    cuponInput,
    cuponEstado: s.cuponEstado,
    cuponError: s.cuponError,
    cuponDescuento: s.cuponDescuento,
    cuponCodigo: s.cuponCodigo,
    validarCupon,
    cambiarCupon,
    quitarCupon: () => cambiarCupon(''),
  }
}

export type CodigosPedido = ReturnType<typeof useCodigosPedido>

/** Descuento del cupón (porcentaje sobre el subtotal) y total tras el descuento y el envío. */
export function totalesConCodigos(subtotal: number, envio: number, cuponPorcentaje: number) {
  const descuento = cuponPorcentaje > 0 ? Math.round((subtotal * cuponPorcentaje) / 100) : 0
  return { descuento, total: subtotal - descuento + envio }
}
