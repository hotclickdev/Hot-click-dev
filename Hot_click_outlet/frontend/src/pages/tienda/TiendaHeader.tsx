import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import FilaRegreso from '@/components/comprador/header/FilaRegreso'
import MarcaComprador from '@/components/comprador/header/MarcaComprador'
import { inicialesNegocio } from './tiendaHelpers'

/**
 * Barra de la tienda pública (derivado de Figma `28:1144` y `29:2308`).
 * El logo de HotClick queda a la izquierda para volver al marketplace; el negocio conserva el suyo.
 * En móvil y en escritorio la fila de flechas y migas va debajo, también en el perfil.
 */
export default function TiendaHeader({
  slug, nombre, logoUrl, cantidadCarrito,
}: {
  slug: string
  nombre: string
  logoUrl?: string | null
  cantidadCarrito: number
}) {
  const { t } = useTranslation()

  return (
    <div role="banner" className="sticky top-0 z-40 bg-hc-n-0">
      <div className="mx-auto flex h-14 max-w-[1232px] items-center gap-3 px-4 leading-[normal]">
        <MarcaComprador tamano="pequena" />
        <Link to={`/tienda/${slug}`} className="flex min-w-0 flex-1 items-center gap-[10px]">
          {logoUrl
            ? <img src={logoUrl} alt="" className="size-8 shrink-0 rounded-[10px] border border-hc-n-200 object-contain" />
            : (
              <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-[10px] font-display text-[12px] font-extrabold text-hc-n-0" style={{ backgroundColor: 'var(--t-secondary)' }}>
                {inicialesNegocio(nombre)}
              </span>
              )}
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-display text-[15px] font-bold text-hc-n-900">{nombre}</span>
            <span className="text-[11px] font-medium text-hc-n-600">{t('tienda.enHotclick')}</span>
          </span>
        </Link>
        <Link
          to={`/tienda/${slug}/carrito`}
          aria-label={cantidadCarrito > 0 ? `${t('tienda.pedidoTienda')} (${cantidadCarrito})` : t('tienda.pedidoTienda')}
          className="relative flex size-10 shrink-0 items-center justify-center rounded-full border border-hc-n-200 bg-hc-n-0 text-hc-n-900"
        >
          <IconoFigma src={ICONOS_COMPRADOR.headerCarrito} size={20} />
          {cantidadCarrito > 0 && (
            <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--t-primary)] px-1 text-[10px] font-bold text-hc-n-0">
              {cantidadCarrito > 9 ? '9+' : cantidadCarrito}
            </span>
          )}
        </Link>
      </div>
      <div className="border-t border-hc-n-200">
        <FilaRegreso alineacion="tienda" nombreTienda={nombre} />
      </div>
    </div>
  )
}
