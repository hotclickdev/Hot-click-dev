import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getOptimizedUrl } from '@/utils/imageUtils'
import type { Producto } from '@/types/producto'

export default function ProductBreadcrumb({ product }: { product: Producto }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const marcaHref = `/productos?marcaId=${product.marcaId}&marcaNombre=${encodeURIComponent(product.marcaNombre)}`

  return (
    <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-sm text-[#8e8e9a] mb-3 sm:mb-6 flex-wrap">
      <ol className="flex items-center gap-2 flex-wrap list-none p-0 m-0">
        <li>
          <a href="/productos" onClick={(e) => { e.preventDefault(); navigate('/productos') }}
            className="hover:text-white transition-colors">
            {t('product.productsNav')}
          </a>
        </li>
        {product.marcaNombre && product.marcaId && (
          <li className="flex items-center gap-2">
            <span aria-hidden="true">/</span>
            <a href={marcaHref}
              onClick={(e) => { e.preventDefault(); navigate(marcaHref) }}
              className="hover:text-white transition-colors flex items-center gap-1">
              {product.marcaLogoUrl && (
                <img src={getOptimizedUrl(product.marcaLogoUrl, { width: 28 })} alt="" className="w-3.5 h-3.5 object-contain rounded-sm" onError={(e) => { e.currentTarget.style.display = 'none' }} />
              )}
              {product.marcaNombre}
            </a>
          </li>
        )}
        <li className="flex items-center gap-2">
          <span aria-hidden="true">/</span>
          <span className="text-[#e8e8ed] truncate max-w-xs" aria-current="page">
            {product.titulo || product.nombre}
          </span>
        </li>
      </ol>
    </nav>
  )
}
