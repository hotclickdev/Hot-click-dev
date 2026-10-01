import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Chip from '@/components/comprador/Chip'
import IconoFigma from '@/components/comprador/IconoFigma'
import ProductCard from '@/components/comprador/ProductCard'
import { rutaCategoria } from '@/components/comprador/header/useHeaderComprador'
import { useCategoriasCatalogo } from '@/components/comprador/useCategoriasCatalogo'
import { ICONOS_CHECKOUT } from '@/pages/checkout/iconosCheckout'
import type { Producto } from '@/types/producto'

const MAX_CATEGORIAS = 5
const MAX_DESTACADOS = 2

/** Carrito vacío (Figma `45:1692`, solo móvil; en pantallas anchas se centra con el mismo ancho). */
export default function CartEmptyState({ destacados }: { destacados: Producto[] }) {
  const { t } = useTranslation()
  const { categorias } = useCategoriasCatalogo()
  const productos = destacados.slice(0, MAX_DESTACADOS)

  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col">
      <div className="flex flex-col items-center gap-3 px-5 pb-2 pt-10">
        <div className="flex size-16 items-center justify-center rounded-full bg-hc-n-100 text-hc-n-600">
          <IconoFigma src={ICONOS_CHECKOUT.carritoVacio} size={28.16} />
        </div>
        <h1 className="font-display text-[20px] font-bold leading-[normal] tracking-normal text-hc-n-900">{t('cart.empty')}</h1>
        <p className="text-center text-[14px] leading-5 text-hc-n-600">{t('cart.vacioTexto')}</p>
      </div>
      <div className="flex flex-col gap-[14px] px-5 py-2">
        <Link to="/productos" className="flex items-center justify-center rounded-xl bg-hc-red-500 py-[14px] text-[15px] font-semibold leading-[normal] text-hc-n-0">
          {t('cart.verProductos')}
        </Link>
        {categorias.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {categorias.slice(0, MAX_CATEGORIAS).map((categoria) => (
              <Chip key={categoria.id} texto={categoria.nombre} to={rutaCategoria(categoria.id)} />
            ))}
          </div>
        )}
      </div>
      {productos.length > 0 && (
        <section className="flex flex-col gap-3 px-5 pb-2 pt-[18px]">
          <h2 className="font-display text-[16px] font-bold leading-[normal] tracking-normal text-hc-n-900">{t('cart.destacados')}</h2>
          <div className="flex items-start justify-between">
            {productos.map((producto) => (
              <ProductCard key={producto.id} product={producto} className="w-[167px]" />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
