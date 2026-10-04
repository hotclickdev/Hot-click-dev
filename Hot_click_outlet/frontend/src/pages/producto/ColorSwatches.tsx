import { detectarColor } from '@/utils/colorDetector'
import type { TFunction } from 'i18next'
import type { NavigateFunction } from 'react-router-dom'
import type { Producto } from '@/types/producto'
import type { VarianteProducto } from './productoHelpers'

type ColorSwatchesProps = {
  product: Producto
  variantes: VarianteProducto[]
  onNavigate: NavigateFunction
  t: TFunction
}

const COLOR_POR_DEFECTO = '#3a3a42'

/**
 * Selector de color (Figma 44:1775, nodo 44:1800): "Color: Rojo", muestras de 34 px y nota.
 * La muestra activa lleva un aro de 2,5 px; cada otra muestra lleva a la ficha de esa variante.
 */
export default function ColorSwatches({ product, variantes, onNavigate, t }: ColorSwatchesProps) {
  const otras = variantes.filter((v) => v.colorVariante)
  if (!(product.colorVariante || otras.length > 0)) return null
  const hexActual = (product.colorVariante && detectarColor(product.colorVariante).hex) || COLOR_POR_DEFECTO

  return (
    <div className="flex flex-col gap-[10px] px-4 pb-1 pt-3 leading-[normal] lg:p-0">
      <p className="flex items-center gap-2 whitespace-nowrap text-[14px]">
        <span className="font-semibold text-hc-n-900">{t('product.colorLabel')}</span>
        {product.colorVariante && <span className="text-hc-n-600">{product.colorVariante}</span>}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled
          aria-label={product.colorVariante || product.nombre}
          aria-pressed="true"
          title={product.colorVariante || product.nombre}
          className="size-[34px] shrink-0 rounded-full shadow-[0_0_0_2.5px_var(--hc-n-900)] disabled:opacity-100"
          style={{ backgroundColor: hexActual }}
        />
        {otras.map((v) => {
          const hex = (v.colorVariante && detectarColor(v.colorVariante).hex) || COLOR_POR_DEFECTO
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onNavigate(`/productos/${v.id}`)}
              aria-label={v.colorVariante || v.nombreProducto}
              title={v.colorVariante || v.nombreProducto}
              className="size-[34px] shrink-0 rounded-full border border-hc-n-200"
              style={{ backgroundColor: hex }}
            />
          )
        })}
      </div>
      {otras.length > 0 && <p className="text-[12px] leading-4 text-hc-n-600">{t('product.colorAyuda')}</p>}
    </div>
  )
}
