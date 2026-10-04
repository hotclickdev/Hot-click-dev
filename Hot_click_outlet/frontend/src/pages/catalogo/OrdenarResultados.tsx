import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_CATALOGO } from './iconosCatalogo'
import { SORT_OPTIONS } from './catalogoFiltros'

/**
 * Orden de los resultados. Se ve como el texto de Figma (móvil `26:756`: "Relevancia ⌄";
 * desktop `30:1876`: caja "Ordenar: Relevancia ⌄") y por debajo es un `<select>` nativo.
 */
export default function OrdenarResultados({
  sort, setSort, variante,
}: {
  sort: string
  setSort: (valor: string) => void
  variante: 'movil' | 'escritorio'
}) {
  const { t } = useTranslation()
  const actual = SORT_OPTIONS.find((o) => o.value === sort) ?? SORT_OPTIONS[0]
  const etiqueta = t(actual.labelKey)
  const movil = variante === 'movil'
  return (
    <label
      className={movil
        ? 'relative flex shrink-0 items-center gap-1 text-[13px] font-medium leading-[normal] text-hc-n-600 lg:hidden'
        : 'relative hidden shrink-0 items-center gap-[6px] rounded-[10px] border border-hc-n-200 bg-hc-n-0 px-[14px] py-[10px] text-[14px] font-medium leading-[normal] text-hc-n-900 lg:flex'}
    >
      <span>{movil ? etiqueta : t('products.sortLabel', { orden: etiqueta })}</span>
      <IconoFigma src={movil ? ICONOS_CATALOGO.ordenarChevron14 : ICONOS_CATALOGO.ordenarChevron16} size={movil ? 14 : 16} />
      <select
        value={sort}
        onChange={(e) => {
          setSort(e.target.value)
          try { localStorage.setItem('hc-products-sort', e.target.value) } catch { /* sin almacenamiento */ }
        }}
        aria-label={t('products.sortBy')}
        className="absolute inset-0 size-full cursor-pointer opacity-0"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
        ))}
      </select>
    </label>
  )
}
