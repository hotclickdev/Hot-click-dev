import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '../IconoFigma'
import { ICONOS_COMPRADOR } from '../iconosComprador'
import MarcaComprador from './MarcaComprador'
import {
  RUTA_CATEGORIAS, RUTA_SERVICIOS_HOT, RUTA_VENDE, rutaCategoria, useConsultaBuscador, useHeaderComprador,
} from './useHeaderComprador'

const CATEGORIAS_VISIBLES_ESCRITORIO = 6

type HeaderEscritorioProps = {
  onBuscarConFoto: () => void
}

/** Header desktop del comprador (Figma `9:172`). */
export default function HeaderEscritorio({ onBuscarConFoto }: HeaderEscritorioProps) {
  const { t } = useTranslation()
  const { cantidadPedido, conSesion, rutaCuenta, rutaPanel, categorias } = useHeaderComprador()

  return (
    <div className="hidden flex-col gap-[14px] border-b border-hc-n-200 bg-hc-n-0 px-8 pt-4 leading-[normal] lg:flex xl:px-[120px]">
      <div className="flex items-center gap-8">
        <MarcaComprador tamano="escritorio" />
        <BuscadorEscritorio onBuscarConFoto={onBuscarConFoto} />
        <div className="flex shrink-0 items-center gap-[22px] text-hc-n-900">
          {rutaPanel && (
            <Link to={rutaPanel} className="text-[14px] font-medium text-hc-n-600 hover:text-hc-n-900">
              {t('comprador.header.panel')}
            </Link>
          )}
          <Link to={rutaCuenta} className="flex items-center gap-[6px] text-[14px] font-medium">
            <IconoFigma src={ICONOS_COMPRADOR.headerIngresar} size={20} />
            {conSesion ? t('comprador.header.miCuenta') : t('comprador.header.ingresar')}
          </Link>
          <Link to="/wishlist" aria-label={t('comprador.header.favoritos')} className="flex">
            <IconoFigma src={ICONOS_COMPRADOR.headerFavoritos} size={22} />
          </Link>
          <Link
            to="/carrito"
            aria-label={t('comprador.header.carrito', { count: cantidadPedido })}
            className="flex items-center gap-[6px]"
          >
            <IconoFigma src={ICONOS_COMPRADOR.headerCarritoDesktop} size={22} />
            {cantidadPedido > 0 && (
              <span className="rounded-full bg-hc-red-500 px-[7px] py-[2px] text-[11px] font-bold text-hc-n-0">
                {cantidadPedido}
              </span>
            )}
          </Link>
        </div>
      </div>

      <nav aria-label={t('comprador.header.categoriasAria')} className="flex items-center gap-[26px] pb-[14px] pt-1">
        <Link to={RUTA_CATEGORIAS} className="flex shrink-0 items-center gap-1 text-[14px] font-semibold text-hc-n-900">
          {t('comprador.header.todasCategorias')}
          <IconoFigma src={ICONOS_COMPRADOR.chevronAbajo} size={16} />
        </Link>
        {categorias.slice(0, CATEGORIAS_VISIBLES_ESCRITORIO).map((categoria) => (
          <Link
            key={categoria.id}
            to={rutaCategoria(categoria.id)}
            className="shrink-0 whitespace-nowrap text-[14px] font-medium text-hc-n-600 hover:text-hc-n-900"
          >
            {categoria.nombre}
          </Link>
        ))}
        <span className="min-w-px flex-1" />
        <Link to={RUTA_SERVICIOS_HOT} className="shrink-0 whitespace-nowrap text-[13px] font-medium text-hc-n-500">
          {t('comprador.header.serviciosHot')}
        </Link>
        <Link to={RUTA_VENDE} className="shrink-0 whitespace-nowrap text-[13px] font-medium text-hc-n-500">
          {t('comprador.header.vende')}
        </Link>
      </nav>
    </div>
  )
}

function BuscadorEscritorio({ onBuscarConFoto }: HeaderEscritorioProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [consulta, setConsulta] = useConsultaBuscador()

  const buscar = (evento: FormEvent) => {
    evento.preventDefault()
    const texto = consulta.trim()
    navigate(texto ? `/productos?search=${encodeURIComponent(texto)}` : '/productos')
  }

  return (
    <form
      role="search"
      onSubmit={buscar}
      className="flex min-w-px flex-1 items-center gap-[10px] rounded-[12px] bg-hc-n-100 py-[6px] pl-4 pr-[6px]"
    >
      <IconoFigma src={ICONOS_COMPRADOR.buscador} size={20} className="text-hc-n-600" />
      <input
        type="search"
        value={consulta}
        onChange={(e) => setConsulta(e.target.value)}
        placeholder={t('comprador.header.buscadorDesktop')}
        aria-label={t('comprador.header.buscar')}
        className="hc-input-libre min-w-px flex-1 truncate bg-transparent text-[14px] text-hc-n-900 placeholder:text-hc-n-500 focus:outline-none"
      />
      <button
        type="button"
        onClick={onBuscarConFoto}
        className="flex shrink-0 items-center gap-[6px] rounded-[9px] bg-hc-n-0 px-3 py-[9px] text-[13px] font-semibold text-hc-blue-600"
      >
        <IconoFigma src={ICONOS_COMPRADOR.buscarFotoDesktop} size={16} />
        {t('comprador.header.foto')}
      </button>
      <button
        type="submit"
        className="shrink-0 rounded-[9px] bg-hc-red-500 px-[18px] py-[9px] text-[14px] font-semibold text-hc-n-0"
      >
        {t('comprador.header.buscar')}
      </button>
    </form>
  )
}
