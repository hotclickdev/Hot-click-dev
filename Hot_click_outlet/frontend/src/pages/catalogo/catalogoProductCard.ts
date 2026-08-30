import type { ComponentProps, ReactElement } from 'react'
import ProductCardBase from '@/components/ui/ProductCard'
import type { Producto } from '@/types/producto'

/** ProductCard del catálogo: admite `onQuickView` (el componente base lo ignora). */
export default ProductCardBase as (
  props: ComponentProps<typeof ProductCardBase> & {
    onQuickView?: (product: Producto) => void
  },
) => ReactElement
