import { useNavigate } from 'react-router-dom'
import { esProductoCotizable } from '@/utils/precioProducto'
import { useAgregarConHoja } from './useAgregarConHoja'
import type { Producto } from '@/types/producto'

/**
 * Botón “Agregar” de las tarjetas del comprador: los productos a cotizar
 * abren su ficha; los agotados no hacen nada.
 */
export function useAgregarAlPedido() {
  const navigate = useNavigate()
  const agregarConHoja = useAgregarConHoja()

  return (product: Producto) => {
    if (esProductoCotizable(product)) {
      navigate(`/productos/${product.id}`, { state: { product } })
      return
    }
    if (product.stock === 0) return
    agregarConHoja(product)
  }
}
