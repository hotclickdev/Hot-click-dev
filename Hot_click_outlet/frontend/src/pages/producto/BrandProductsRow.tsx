import { useTranslation } from 'react-i18next'
import type { Producto } from '@/types/producto'
import CarruselProductos from './CarruselProductos'

/**
 * "Más de {marca}": no está en Figma; se conserva con el mismo carrusel de tarjetas de la ficha
 * y el acceso al catálogo de la marca.
 */
export default function BrandProductsRow({ product, brandProducts }: { product: Producto; brandProducts: Producto[] }) {
  const { t } = useTranslation()
  if (brandProducts.length === 0 || !product.marcaNombre) return null
  const marcaHref = `/productos?marcaId=${product.marcaId}&marcaNombre=${encodeURIComponent(product.marcaNombre)}`

  return (
    <CarruselProductos
      id="mas-de-la-marca"
      titulo={t('product.moreFromBrand', { brand: product.marcaNombre })}
      productos={brandProducts}
      variante="contenido"
      accion={{ texto: t('product.verTodosMarca'), to: marcaHref }}
    />
  )
}
