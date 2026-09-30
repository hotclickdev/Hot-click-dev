import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from './IconoFigma'
import { ICONOS_COMPRADOR } from './iconosComprador'
import { RUTA_CATEGORIAS, useHeaderComprador } from './header/useHeaderComprador'
import { seccionActivaBarra, type SeccionBarra } from './barraInferiorHelpers'

type ItemBarraProps = {
  icono: string
  texto: string
  activo: boolean
  to?: string
  onClick?: () => void
}

function ItemBarra({ icono, texto, activo, to, onClick }: ItemBarraProps) {
  const color = activo ? 'font-semibold text-hc-red-500' : 'font-medium text-hc-n-500'
  const clases = `flex flex-col items-center gap-[3px] text-[11px] ${color}`
  const contenido: ReactNode = (
    <>
      <IconoFigma src={icono} size={22} />
      <span className="whitespace-nowrap leading-[13px]">{texto}</span>
    </>
  )
  if (to) {
    return <Link to={to} className={clases} aria-current={activo ? 'page' : undefined}>{contenido}</Link>
  }
  return <button type="button" onClick={onClick} className={clases}>{contenido}</button>
}

/** Barra de navegación inferior móvil del comprador (Figma `7:358`). */
export default function BarraInferior() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { rutaCuenta, abrirBusqueda } = useHeaderComprador()
  const activa: SeccionBarra | null = seccionActivaBarra(pathname)

  return (
    <nav
      aria-label={t('comprador.nav.aria')}
      className="fixed inset-x-0 bottom-0 z-50 flex items-start justify-between border-t border-hc-n-200 bg-hc-n-0 px-[22px] pb-5 pt-2 leading-[normal] lg:hidden"
    >
      <ItemBarra icono={ICONOS_COMPRADOR.navInicio} texto={t('comprador.nav.inicio')} activo={activa === 'inicio'} to="/" />
      <ItemBarra icono={ICONOS_COMPRADOR.navBuscar} texto={t('comprador.nav.buscar')} activo={activa === 'buscar'} onClick={abrirBusqueda} />
      <ItemBarra icono={ICONOS_COMPRADOR.navCategorias} texto={t('comprador.nav.categorias')} activo={activa === 'categorias'} to={RUTA_CATEGORIAS} />
      <ItemBarra icono={ICONOS_COMPRADOR.navPedido} texto={t('comprador.nav.pedido')} activo={activa === 'pedido'} to="/carrito" />
      <ItemBarra icono={ICONOS_COMPRADOR.navCuenta} texto={t('comprador.nav.cuenta')} activo={activa === 'cuenta'} to={rutaCuenta} />
    </nav>
  )
}
