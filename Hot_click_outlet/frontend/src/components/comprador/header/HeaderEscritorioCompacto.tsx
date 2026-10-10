import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '../IconoFigma'
import { ICONOS_COMPRADOR } from '../iconosComprador'
import ThemeToggle from '@/components/ui/ThemeToggle'
import MarcaComprador from './MarcaComprador'
import { inicialesDe } from './headerHelpers'
import { useConsultaBuscador, useHeaderComprador } from './useHeaderComprador'

/**
 * Header desktop compacto, sin fila de categorías. Cuenta `30:1480`: alto 79 (fila en y16).
 * Carrito `30:2269`: alto 83 (fila en y18) y carrito en rojo, con `filaCarrito`.
 */
export default function HeaderEscritorioCompacto({ filaCarrito = false }: { filaCarrito?: boolean }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { cantidadPedido, conSesion, nombreUsuario, rutaCuenta } = useHeaderComprador()
  const [consulta, setConsulta] = useConsultaBuscador()

  const buscar = (evento: FormEvent) => {
    evento.preventDefault()
    const texto = consulta.trim()
    navigate(texto ? `/productos?search=${encodeURIComponent(texto)}` : '/categorias')
  }

  return (
    <div className={`hidden items-center gap-8 border-b border-hc-n-200 bg-hc-n-0 px-8 leading-[normal] lg:flex xl:px-[max(120px,calc((100%_-_1200px)/2))] ${filaCarrito ? 'py-[18px]' : 'py-4'}`}>
      <MarcaComprador tamano="escritorio" />
      <form role="search" onSubmit={buscar} className="flex min-w-px flex-1 items-center gap-[10px] rounded-[12px] bg-hc-n-100 px-4 py-[13px]">
        <IconoFigma src={ICONOS_COMPRADOR.buscador} size={20} className="text-hc-n-600" />
        <input
          type="search"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder={t('comprador.header.buscadorCompacto')}
          aria-label={t('comprador.header.buscar')}
          className="hc-input-libre min-w-px flex-1 bg-transparent text-[14px] text-hc-n-900 placeholder:text-hc-n-500 focus:outline-none"
        />
      </form>
      <div className="flex shrink-0 items-center gap-3 text-hc-n-900">
        <ThemeToggle className="min-h-11 min-w-11" />
        <Link to={rutaCuenta} aria-label={t('comprador.header.miCuenta')} className="flex">
          {conSesion && inicialesDe(nombreUsuario) ? (
            <span className="flex size-8 items-center justify-center rounded-full bg-hc-blue-600 font-display text-[12px] font-bold text-hc-n-0">
              {inicialesDe(nombreUsuario)}
            </span>
          ) : (
            <IconoFigma src={ICONOS_COMPRADOR.headerIngresar} size={22} />
          )}
        </Link>
        <Link to="/wishlist" aria-label={t('comprador.header.favoritos')} className="flex">
          <IconoFigma src={ICONOS_COMPRADOR.headerFavoritos} size={22} />
        </Link>
        <Link
          to="/carrito"
          aria-label={t('comprador.header.carrito', { count: cantidadPedido })}
          className={`flex items-center gap-[6px] ${filaCarrito ? 'text-hc-red-600' : ''}`}
        >
          <IconoFigma src={ICONOS_COMPRADOR.headerCarritoDesktop} size={22} />
          {cantidadPedido > 0 && (
            <span className="rounded-full bg-hc-red-500 px-[7px] py-[2px] text-[11px] font-bold text-hc-n-0">{cantidadPedido}</span>
          )}
        </Link>
      </div>
    </div>
  )
}
