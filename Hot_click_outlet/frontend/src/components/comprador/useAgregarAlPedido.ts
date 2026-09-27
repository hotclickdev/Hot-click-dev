import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useCartStore from '@/store/cartStore'
import { useToast } from '@/components/ui/Toast'
import { esProductoCotizable } from '@/utils/precioProducto'
import type { Producto } from '@/types/producto'

/**
 * Botón “Agregar” de las tarjetas del comprador: los productos a cotizar
 * abren su ficha; los agotados no hacen nada.
 */
export function useAgregarAlPedido() {
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)
  const toast = useToast()
  const { t } = useTranslation()

  return (product: Producto) => {
    if (esProductoCotizable(product)) {
      navigate(`/productos/${product.id}`, { state: { product } })
      return
    }
    if (product.stock === 0) return
    addItem(product)
    toast({ message: t('comprador.tarjeta.agregado', { nombre: product.nombre }), type: 'success' })
  }
}
