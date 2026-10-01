import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import { ICONOS_CATALOGO } from './iconosCatalogo'

/**
 * Encabezado móvil del catálogo, en dos versiones de Figma:
 * - `busqueda` (`26:723`): flecha, buscador con el término y botón de cámara; debajo van los chips "Entendí".
 * - `categoria` (`43:1531`): flecha, título de la categoría y buscador "Buscar en …".
 */
export default function EncabezadoCatalogoMovil({
  modo, titulo, search, setSearch, onAtras, onBuscarConFoto, children,
}: {
  modo: 'busqueda' | 'categoria'
  titulo: string
  search: string
  setSearch: (valor: string) => void
  onAtras: () => void
  onBuscarConFoto: () => void
  /** Filas bajo el buscador (chips "Entendí" en la versión de búsqueda). */
  children?: ReactNode
}) {
  const { t } = useTranslation()
  const botonAtras = (
    <button type="button" onClick={onAtras} aria-label={t('search.back')} className="flex shrink-0 text-hc-n-900">
      <IconoFigma src={ICONOS_COMPRADOR.barraAtras} size={22} />
    </button>
  )

  if (modo === 'busqueda') {
    return (
      <div className="flex flex-col gap-3 border-b border-hc-n-200 bg-hc-n-0 px-4 py-3 lg:hidden">
        <div className="flex items-center gap-[10px]">
          {botonAtras}
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[12px] bg-hc-n-100 py-[6px] pl-3 pr-[6px]">
            <IconoFigma src={ICONOS_CATALOGO.lupa18} size={18} className="text-hc-n-500" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('products.search')}
              aria-label={t('search.inputLabel')}
              className="hc-input-libre min-w-0 flex-1 bg-transparent text-[15px] leading-[19px] text-hc-n-900 outline-none placeholder:text-hc-n-500"
            />
            <button
              type="button"
              onClick={onBuscarConFoto}
              aria-label={t('search.photoSearch')}
              className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-hc-n-0 text-hc-blue-600"
            >
              <IconoFigma src={ICONOS_CATALOGO.camara16} size={16} />
            </button>
          </div>
        </div>
        {children}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 border-b border-hc-n-200 bg-hc-n-0 px-4 py-3 lg:hidden">
      <div className="flex items-center gap-[10px]">
        {botonAtras}
        <h1 className="font-display text-[20px] font-bold leading-[normal] text-hc-n-900">{titulo}</h1>
      </div>
      <label className="flex items-center gap-[10px] rounded-[12px] bg-hc-n-100 px-[14px] py-3">
        <IconoFigma src={ICONOS_CATALOGO.lupa18} size={18} className="text-hc-n-500" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('products.searchIn', { nombre: titulo })}
          aria-label={t('products.searchIn', { nombre: titulo })}
          className="hc-input-libre min-w-0 flex-1 bg-transparent text-[14px] leading-[18px] text-hc-n-900 outline-none placeholder:text-hc-n-500"
        />
      </label>
    </div>
  )
}
