import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import { formatPrice } from '@/utils/format'

/**
 * Acceso al pedido de la tienda en el perfil móvil, donde la portada reemplaza al header (derivado de
 * Figma: barra de compra `28:977`). Solo aparece con productos en el pedido.
 */
export default function TiendaBarraPedido({ slug, cantidad, total }: { slug: string; cantidad: number; total: number }) {
  const { t } = useTranslation()
  if (cantidad <= 0) return null
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hc-n-200 bg-hc-n-0 px-4 pb-6 pt-3 md:hidden">
      <Link
        to={`/tienda/${slug}/carrito`}
        className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-[var(--t-primary)] px-4 py-[14px] text-[15px] font-semibold leading-[18px] text-hc-n-0"
      >
        <IconoFigma src={ICONOS_COMPRADOR.headerCarrito} size={18} />
        {t('tienda.verPedido', { count: cantidad, total: formatPrice(total) })}
      </Link>
    </div>
  )
}
