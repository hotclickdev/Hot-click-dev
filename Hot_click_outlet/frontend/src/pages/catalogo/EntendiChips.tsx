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
  return chip.valor
}

/** Fila "Entendí" (Figma `26:722`): lo interpretado de la búsqueda y los filtros, cada uno removible. */
export default function EntendiChips({
  chips, onQuitar, onAbrirFiltros,
}: {
  chips: ChipEntendi[]
  onQuitar: (chip: ChipEntendi) => void
  onAbrirFiltros: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
      {chips.length > 0 && <span className="shrink-0 text-[12px] text-hc-n-500">{t('products.understood')}</span>}
      {chips.map((chip) => {
        const texto = etiqueta(chip, t)
        return (
          <button
            key={chip.clave}
            type="button"
            onClick={() => onQuitar(chip)}
            aria-label={t('products.removeFilter', { filtro: texto })}
            className="flex shrink-0 items-center gap-[6px] whitespace-nowrap rounded-full border border-hc-n-200 bg-hc-n-0 px-[14px] py-2 text-[13px] font-medium text-hc-n-900"
          >
            {texto}
            <span aria-hidden="true">×</span>
          </button>
        )
      })}
      <button
        type="button"
        onClick={onAbrirFiltros}
        className="flex shrink-0 items-center whitespace-nowrap rounded-full border border-hc-n-200 bg-hc-n-0 px-[14px] py-2 text-[13px] font-medium text-hc-n-900 lg:hidden"
      >
        {t('products.filter')}
      </button>
    </div>
  )
}
