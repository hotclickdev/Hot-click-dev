import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import { inicialesNegocio } from './tiendaHelpers'

/**
 * Barra de la tienda pública (derivado de Figma: barra interna `28:1144` y header `29:2308`). Blanca, con
 * la flecha atrás en las subpantallas, el logo o las iniciales del negocio, "en HotClick" para no confundir
 * con el marketplace y el pedido aislado de la tienda con su contador rojo.
 */
export default function TiendaHeader({
  slug, nombre, logoUrl, cantidadCarrito, soloEscritorio = false, conAtras = false,
}: {
  slug: string
  nombre: string
  logoUrl?: string | null
  cantidadCarrito: number
  /** En el perfil móvil la portada ocupa su lugar (Figma `29:922`): el header solo se ve desde `md`. */
  soloEscritorio?: boolean
  /** Subpantallas (ficha, pedido, checkout): flecha atrás como en la barra interna del Figma. */
  conAtras?: boolean
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const volver = () => {
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate(`/tienda/${slug}`)
  }

  return (
    <div role="banner" className={`sticky top-0 z-40 border-b border-hc-n-200 bg-hc-n-0 ${soloEscritorio ? 'hidden md:block' : ''}`}>
      <div className="mx-auto flex h-14 max-w-[1232px] items-center gap-3 px-4 leading-[normal]">
        {conAtras && (
          <button type="button" onClick={volver} aria-label={t('comprador.header.volver')} className="flex shrink-0 text-hc-n-900">
            <IconoFigma src={ICONOS_COMPRADOR.barraAtras} size={22} />
          </button>
        )}
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
        <Link to="/" className="hidden shrink-0 text-[13px] font-semibold text-hc-n-600 hover:text-hc-n-900 md:inline">
          {t('tienda.irAHotclick')}
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
    </div>
  )
}
