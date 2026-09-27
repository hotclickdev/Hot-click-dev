import { useCallback, useState } from 'react'
import useCartStore from '@/store/cartStore'
import { ejecutarValidarCupon } from './ejecutarValidarCupon'

export type EstadoCupon = ReturnType<typeof useCupon>

/** Cupón del carrito: se valida en el carrito o en el pago y queda guardado para ambos. */
export function useCupon() {
  const cupon = useCartStore((s) => s.cupon)
  const setCupon = useCartStore((s) => s.setCupon)
  const [input, setInput] = useState(cupon?.codigo ?? '')
  const [estado, setEstado] = useState(cupon ? 'valid' : 'idle')
  const [error, setError] = useState('')

  const validar = useCallback(async () => {
    await ejecutarValidarCupon({ cuponInput: input, setCuponEstado: setEstado, setCuponError: setError, setCupon })
  }, [input, setCupon])

  const quitar = useCallback(() => {
    setCupon(null)
    setInput('')
    setEstado('idle')
    setError('')
  }, [setCupon])

  return { cupon, input, setInput, estado, error, validar, quitar }
}
