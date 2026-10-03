import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Chip from '../Chip'
import IconoFigma from '../IconoFigma'
import { ICONOS_COMPRADOR } from '../iconosComprador'
import MarcaComprador from './MarcaComprador'
import { rutaCategoria, useHeaderComprador } from './useHeaderComprador'

type HeaderMovilProps = {
  onBuscarConFoto: () => void
}

/** Header móvil del comprador (Figma `7:3`). */
export default function HeaderMovil({ onBuscarConFoto }: HeaderMovilProps) {
  const { t } = useTranslation()
  const { cantidadPedido, categorias, abrirBusqueda } = useHeaderComprador()

  return (
    <div className="flex flex-col gap-3 border-b border-hc-n-200 bg-hc-n-0 px-4 py-3 leading-[normal] lg:hidden">
      <div className="flex items-center justify-between">
        <MarcaComprador tamano="movil" />
        <div className="flex items-center gap-[18px] text-hc-n-900">
          <Link to="/wishlist" aria-label={t('comprador.header.favoritos')} className="flex">
            <IconoFigma src={ICONOS_COMPRADOR.headerFavoritos} size={22} />
          </Link>
          <Link
            to="/carrito"
            aria-label={t('comprador.header.carrito', { count: cantidadPedido })}
            className="relative h-6 w-[26px]"
          >
            <IconoFigma src={ICONOS_COMPRADOR.headerCarrito} size={22} className="absolute left-0 top-px" />
            {cantidadPedido > 0 && (
              <span className="absolute left-[13px] top-[-5px] flex size-4 items-center justify-center rounded-full bg-hc-red-500 text-[10px] font-bold text-hc-n-0">
                {cantidadPedido}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div className="flex w-full items-center gap-[10px] rounded-[12px] bg-hc-n-100 py-[6px] pl-[14px] pr-[6px]">
        <button
          type="button"
          onClick={abrirBusqueda}
          className="flex min-w-0 flex-1 items-center gap-[10px] text-left"
        >
          <IconoFigma src={ICONOS_COMPRADOR.buscador} size={20} className="text-hc-n-600" />
          <span className="min-w-0 flex-1 truncate text-[14px] text-hc-n-600">
            {t('comprador.header.buscadorMovil')}
          </span>
        </button>
        <button
          type="button"
          onClick={onBuscarConFoto}
          aria-label={t('comprador.header.buscarConFoto')}
          className="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-hc-n-0 text-hc-blue-600"
        >
          <IconoFigma src={ICONOS_COMPRADOR.buscarFoto} size={18} />
        </button>
      </div>

      {categorias.length > 0 && (
        <nav aria-label={t('comprador.header.categoriasAria')} className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
          {categorias.map((categoria) => (
            <Chip key={categoria.id} texto={categoria.nombre} to={rutaCategoria(categoria.id)} />
          ))}
        </nav>
      )}
    </div>
  )
}
