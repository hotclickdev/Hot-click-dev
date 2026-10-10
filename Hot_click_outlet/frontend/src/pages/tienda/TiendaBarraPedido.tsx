import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import { useDockInferior } from '@/hooks/useDockInferior'
import { formatPrice } from '@/utils/format'

type Props = { slug: string; cantidad: number; total: number }

const CLASE_CTA = 'flex items-center justify-center gap-2 rounded-[12px] bg-[var(--t-primary)] px-4 text-[15px] font-semibold leading-[18px] text-hc-n-0'

/**
 * «Ver pedido» (boceto 13 de demo-0410, derivado de Figma `28:977`): la única CTA roja de la tienda.
 * Fija abajo con safe-area en móvil; solo aparece con productos en el pedido.
 */
export default function TiendaBarraPedido({ slug, cantidad, total }: Props) {
  if (cantidad <= 0) return null
  return <BarraMovil slug={slug} cantidad={cantidad} total={total} />
}

function BarraMovil({ slug, cantidad, total }: Props) {
  const { t } = useTranslation()
  const ref = useDockInferior<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hc-n-200 bg-hc-n-0 px-4 pt-3 md:hidden"
      style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <Link to={`/tienda/${slug}/carrito`} className={`${CLASE_CTA} w-full py-[14px]`}>
        <IconoFigma src={ICONOS_COMPRADOR.headerCarrito} size={18} />
        {t('tienda.verPedido', { count: cantidad, total: formatPrice(total) })}
      </Link>
    </div>
  )
}

/** A 1440, «Ver pedido» va junto a «Productos (n)» (boceto 13). Oculto en móvil, donde está la barra fija. */
export function VerPedidoEscritorio({ slug, cantidad, total }: Props) {
  const { t } = useTranslation()
  if (cantidad <= 0) return null
  return (
    <Link to={`/tienda/${slug}/carrito`} className={`${CLASE_CTA} hidden h-11 md:flex`}>
      <IconoFigma src={ICONOS_COMPRADOR.headerCarrito} size={18} />
      {t('tienda.verPedido', { count: cantidad, total: formatPrice(total) })}
    </Link>
  )
}
