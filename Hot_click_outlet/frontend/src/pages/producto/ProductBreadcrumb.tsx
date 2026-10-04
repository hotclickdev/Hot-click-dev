import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import type { Producto } from '@/types/producto'
import { ICONOS_PRODUCTO } from './iconosProducto'

/**
 * Migas de pan del desktop (Figma 29:2072, nodo 29:2120): Inicio › categoría › producto.
 * En móvil la ficha no lleva migas (Figma 28:839).
 */
export default function ProductBreadcrumb({ product }: { product: Producto }) {
  const { t } = useTranslation()
  const categoria = product.categoriaNombre
  const enlace = 'text-hc-n-600 hover:text-hc-blue-600'

  return (
    <nav aria-label={t('product.migasAria')} className="hidden text-[13px] leading-[normal] lg:block">
      <ol className="m-0 flex list-none items-center gap-[6px] whitespace-nowrap p-0">
        <li><Link to="/" className={enlace}>{t('product.migasInicio')}</Link></li>
        {categoria && (
          <>
            <li aria-hidden="true" className="flex"><IconoFigma src={ICONOS_PRODUCTO.migas} size={12} className="text-[color:var(--hc-n-400)]" /></li>
            <li>
              {product.categoriaId
                ? <Link to={`/productos?cat=${product.categoriaId}`} className={enlace}>{categoria}</Link>
                : <span className="text-hc-n-600">{categoria}</span>}
            </li>
          </>
        )}
        <li aria-hidden="true" className="flex"><IconoFigma src={ICONOS_PRODUCTO.migas} size={12} className="text-[color:var(--hc-n-400)]" /></li>
        <li className="min-w-0 truncate font-medium text-hc-n-900" aria-current="page">
          {product.titulo || product.nombre}
        </li>
      </ol>
    </nav>
  )
}
