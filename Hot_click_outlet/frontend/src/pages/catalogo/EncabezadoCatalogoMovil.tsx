import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_CATALOGO } from './iconosCatalogo'

/**
 * Encabezado móvil del catálogo, en dos versiones de Figma:
 * - `busqueda` (`26:723`): flecha, buscador con el término y botón de cámara; debajo van los chips "Entendí".
 * - `categoria` (`43:1531`): flecha, título de la categoría y buscador "Buscar en …".
 */
export default function EncabezadoCatalogoMovil({
  modo, titulo, search, setSearch, onBuscarConFoto, sinResultados = false, children,
}: {
  modo: 'busqueda' | 'categoria'
  titulo: string
  search: string
  setSearch: (valor: string) => void
  onBuscarConFoto: () => void
  /** Búsqueda sin resultados (`27:804`): el buscador muestra una × para borrar y no hay fila "Entendí". */
  sinResultados?: boolean
  /** Filas bajo el buscador (chips "Entendí" en la versión de búsqueda). */
  children?: ReactNode
}) {
  const { t } = useTranslation()
  const busqueda = modo === 'busqueda'

  // Un solo árbol para las dos versiones: el <input> queda en la misma posición y con el mismo tipo de padre,
  // así React no lo remonta cuando el primer carácter pasa de `categoria` a `busqueda` (antes se perdía el foco).
  const cajaClase = busqueda
    ? `flex min-w-0 flex-1 items-center gap-2 rounded-[12px] bg-hc-n-100 pl-3 ${sinResultados ? 'py-3 pr-[10px]' : 'py-[6px] pr-[6px]'}`
    : 'flex min-w-0 flex-1 items-center gap-[10px] rounded-[12px] bg-hc-n-100 px-[14px] py-3'
  const inputClase = busqueda
    ? `hc-input-libre min-w-0 flex-1 bg-transparent text-[15px] text-hc-n-900 outline-none ${sinResultados ? 'leading-[18px]' : 'leading-[19px]'} placeholder:text-hc-n-500`
    : 'hc-input-libre min-w-0 flex-1 bg-transparent text-[14px] leading-[18px] text-hc-n-900 outline-none placeholder:text-hc-n-500'
  const placeholder = busqueda ? t('products.search') : t('products.searchIn', { nombre: titulo })
  const etiqueta = busqueda ? t('search.inputLabel') : t('products.searchIn', { nombre: titulo })

  return (
    <div className="flex flex-col gap-3 border-b border-hc-n-200 bg-hc-n-0 px-4 py-3 lg:hidden">
      {!busqueda && <h1 className="font-display text-[20px] font-bold leading-[normal] text-hc-n-900">{titulo}</h1>}
      <div className="flex items-center gap-[10px]">
        <div className={cajaClase}>
          <IconoFigma src={ICONOS_CATALOGO.lupa18} size={18} className="text-hc-n-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={placeholder}
            aria-label={etiqueta}
            className={inputClase}
          />
          {busqueda && (sinResultados ? (
            <button type="button" onClick={() => setSearch('')} aria-label={t('search.clearSearch')} className="flex shrink-0 text-hc-n-600">
              <IconoFigma src={ICONOS_CATALOGO.cerrar16} size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onBuscarConFoto}
              aria-label={t('search.photoSearch')}
              className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-hc-n-0 text-hc-blue-600"
            >
              <IconoFigma src={ICONOS_CATALOGO.camara16} size={16} />
            </button>
          ))}
        </div>
      </div>
      {busqueda && !sinResultados && children}
    </div>
  )
}
