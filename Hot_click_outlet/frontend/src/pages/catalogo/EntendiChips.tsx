import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'
import { leerRangoPrecio, type ChipEntendi } from './buscarExplorar'

function etiqueta(chip: ChipEntendi, t: (k: string, o?: Record<string, unknown>) => string): string {
  if (chip.tipo === 'precio') {
    const { desde, hasta } = leerRangoPrecio(chip.valor)
    if (desde != null && hasta != null) return `${formatPrice(desde)} – ${formatPrice(hasta)}`
    if (hasta != null) return t('products.priceUpTo', { precio: formatPrice(hasta) })
    return t('products.priceFrom', { precio: formatPrice(desde) })
  }
  if (chip.tipo === 'pedido') return t('products.madeToOrder')
  if (chip.tipo === 'retiro') return t('products.storePickup')
  if (chip.tipo === 'stock') return t('products.onlyInStock')
  if (chip.tipo === 'marca') return chip.etiqueta ?? chip.valor
  return chip.valor
}

const CLASE_CHIP = 'flex shrink-0 items-center gap-[6px] whitespace-nowrap rounded-full border border-hc-n-200 bg-hc-n-0 px-[14px] py-2 text-[13px] font-medium leading-[normal] text-hc-n-900'

/**
 * Fila "Entendí" (Figma `26:723` móvil, `30:1880` desktop): lo que el catálogo interpretó, cada chip removible.
 * La búsqueda no va como chip: ya está en el buscador (móvil) y en el título (desktop).
 * Móvil termina con el chip "Filtros" (abre la hoja); desktop con el enlace "Limpiar".
 */
export default function EntendiChips({
  chips, onQuitar, onAbrirFiltros, onLimpiar,
}: {
  chips: ChipEntendi[]
  onQuitar: (chip: ChipEntendi) => void
  onAbrirFiltros: () => void
  onLimpiar: () => void
}) {
  const { t } = useTranslation()
  const visibles = chips.filter((chip) => chip.tipo !== 'busqueda')
  return (
    <div className={`items-center gap-2 overflow-x-auto [scrollbar-width:none] ${visibles.length === 0 ? 'flex lg:hidden' : 'flex'}`}>
      {visibles.length > 0 && (
        <span className="shrink-0 text-[12px] leading-[normal] text-hc-n-600 lg:text-[13px]">{t('products.understood')}</span>
      )}
      {visibles.map((chip) => {
        const texto = etiqueta(chip, t)
        return (
          <button
            key={chip.clave}
            type="button"
            onClick={() => onQuitar(chip)}
            aria-label={t('products.removeFilter', { filtro: texto })}
            className={CLASE_CHIP}
          >
            {texto}
            <span aria-hidden="true">×</span>
          </button>
        )
      })}
      <button type="button" onClick={onAbrirFiltros} className={`${CLASE_CHIP} lg:hidden`}>
        {t('products.filters')}
      </button>
      {visibles.length > 0 && (
        <button type="button" onClick={onLimpiar} className="hidden shrink-0 whitespace-nowrap text-[13px] font-semibold leading-[normal] text-hc-blue-600 lg:block">
          {t('products.clear')}
        </button>
      )}
    </div>
  )
}
