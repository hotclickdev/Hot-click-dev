import { useCallback, useEffect, useRef, useState, type FormEvent, type RefObject } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '../IconoFigma'
import { ICONOS_COMPRADOR } from '../iconosComprador'
import ThemeToggle from '@/components/ui/ThemeToggle'
import MarcaComprador from './MarcaComprador'
import { PLANES_DIRECTORIO, rutaDirectorioPlan } from '../negocios/negociosPublicos'
import { LARGO_MAXIMO_CONSULTA, recortarConsulta } from '@/pages/catalogo/buscarExplorar'
import DesplegableBusqueda from './DesplegableBusqueda'
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
    <div className="hidden flex-col gap-[14px] border-b border-hc-n-200 bg-hc-n-0 px-8 pt-4 leading-[normal] lg:flex xl:px-[max(120px,calc((100%_-_1200px)/2))]">
      <div className="flex items-center gap-8">
        <MarcaComprador tamano="escritorio" />
        <div className="relative z-20 min-w-px flex-1">
          <BuscadorEscritorio onBuscarConFoto={onBuscarConFoto} />
        </div>
        <div className="flex shrink-0 items-center gap-4 text-hc-n-900">
          <ThemeToggle className="min-h-11 min-w-11" />
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
        {/* Tiendas por plan (directorio filtrado en el backend), separadas de las categorías por un divisor fino. */}
        {PLANES_DIRECTORIO.map((p) => (
          <Link
            key={p.alias}
            to={rutaDirectorioPlan(p.alias)}
            className="shrink-0 whitespace-nowrap text-[14px] font-bold text-hc-n-600 hover:text-hc-n-900"
          >
            {t(p.nav)}
          </Link>
        ))}
        <span aria-hidden="true" className="h-4 w-px shrink-0 bg-hc-n-200" />
        {/* Las categorías que no caben pasan a una segunda línea oculta: nunca empujan "Servicios HOT". */}
        <div className="flex h-[18px] min-w-0 flex-1 flex-wrap items-center gap-x-[26px] overflow-hidden">
          {categorias.slice(0, CATEGORIAS_VISIBLES_ESCRITORIO).map((categoria) => (
            <Link
              key={categoria.id}
              to={rutaCategoria(categoria.id)}
              className="shrink-0 whitespace-nowrap text-[14px] font-medium leading-[18px] text-hc-n-600 hover:text-hc-n-900"
            >
              {categoria.nombre}
            </Link>
          ))}
        </div>
        <Link to={RUTA_SERVICIOS_HOT} className="shrink-0 whitespace-nowrap text-[13px] font-medium text-hc-n-600">
          {t('comprador.header.serviciosHot')}
        </Link>
        <Link to={RUTA_VENDE} className="shrink-0 whitespace-nowrap text-[13px] font-medium text-hc-n-600">
          {t('comprador.header.vende')}
        </Link>
      </nav>
    </div>
  )
}

function useCerrarAlSalir(caja: RefObject<HTMLElement | null>, activo: boolean, cerrar: () => void) {
  useEffect(() => {
    if (!activo) return
    const alClick = (evento: MouseEvent) => {
      if (!caja.current?.contains(evento.target as Node)) cerrar()
    }
    const alTecla = (evento: KeyboardEvent) => { if (evento.key === 'Escape') cerrar() }
    document.addEventListener('mousedown', alClick)
    document.addEventListener('keydown', alTecla)
    return () => {
      document.removeEventListener('mousedown', alClick)
      document.removeEventListener('keydown', alTecla)
    }
  }, [activo, caja, cerrar])
}

function BuscadorEscritorio({ onBuscarConFoto }: HeaderEscritorioProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [consulta, setConsulta] = useConsultaBuscador()
  const [abierto, setAbierto] = useState(false)
  const cajaRef = useRef<HTMLDivElement>(null)
  const cerrar = useCallback(() => setAbierto(false), [])
  const visible = abierto && consulta.trim().length > 0
  useCerrarAlSalir(cajaRef, visible, cerrar)

  const buscar = (evento: FormEvent) => {
    evento.preventDefault()
    cerrar()
    const texto = recortarConsulta(consulta)
    navigate(texto ? `/productos?search=${encodeURIComponent(texto)}` : '/productos')
  }

  return (
    <div ref={cajaRef} className="relative">
      <form
        role="search"
        onSubmit={buscar}
        className="flex w-full items-center gap-[10px] rounded-[12px] bg-hc-n-100 py-[6px] pl-4 pr-[6px]"
      >
        <IconoFigma src={ICONOS_COMPRADOR.buscador} size={20} className="text-hc-n-600" />
        <input
          type="search"
          value={consulta}
          maxLength={LARGO_MAXIMO_CONSULTA}
          onChange={(e) => { setConsulta(e.target.value.slice(0, LARGO_MAXIMO_CONSULTA)); setAbierto(true) }}
          onFocus={() => setAbierto(true)}
          placeholder={t('comprador.header.buscadorDesktop')}
          aria-label={t('comprador.header.buscar')}
          aria-expanded={visible}
          aria-controls="resultados-busqueda"
          className="hc-input-libre min-w-px flex-1 truncate bg-transparent text-[14px] text-hc-n-900 placeholder:text-hc-n-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
        />
        <button
          type="button"
          onClick={() => { cerrar(); onBuscarConFoto() }}
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
      <DesplegableBusqueda consulta={consulta} abierto={visible} onCerrar={cerrar} onCambiar={setConsulta} />
    </div>
  )
}
