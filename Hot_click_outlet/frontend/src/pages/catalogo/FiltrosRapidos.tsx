import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'
import type { FiltrosExtra, TiendaCatalogo } from './buscarExplorar'
import type { CatalogCategoria } from './catalogoTipos'

/** Tope del chip de precio de los filtros rápidos (Figma `43:1541`: "Hasta ₡20.000"). */
export const PRECIO_RAPIDO_MAX = 20000
/** Cuántas tiendas se ofrecen como chip (Figma muestra una). */
const TIENDAS_RAPIDAS_MAX = 3

const BASE = 'flex shrink-0 items-center whitespace-nowrap rounded-full border px-[14px] py-2 text-[13px] font-medium leading-[normal]'
const INACTIVO = 'border-hc-n-200 bg-hc-n-0 text-hc-n-900'
const ACTIVO = 'border-hc-blue-600 bg-hc-blue-600 text-hc-n-0'

function ChipRapido({ texto, activo, onClick }: { texto: string; activo: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={activo} onClick={onClick} className={`${BASE} ${activo ? ACTIVO : INACTIVO}`}>
      {texto}
    </button>
  )
}

/**
 * Filtros rápidos de la categoría abierta (Figma `43:1541`): Todo, subcategorías, Hecho a pedido,
 * precio tope y tiendas. "Todo" está activo cuando no hay ninguno de los otros.
 */
export default function FiltrosRapidos({
  subcategorias, categoria, setCategory, extras, setExtras, priceMin, priceMax, setPriceMin, setPriceMax, tiendas, categoriaPadre,
}: {
  subcategorias: CatalogCategoria[]
  categoria: string
  setCategory: (id: string) => void
  extras: FiltrosExtra
  setExtras: (updater: (prev: FiltrosExtra) => FiltrosExtra) => void
  priceMin: string
  priceMax: string
  setPriceMin: (v: string) => void
  setPriceMax: (v: string) => void
  tiendas: TiendaCatalogo[]
  /** Id de la categoría padre cuando se está viendo una subcategoría (para que "Todo" vuelva a ella). */
  categoriaPadre?: string
}) {
  const { t } = useTranslation()
  const precioActivo = priceMax === String(PRECIO_RAPIDO_MAX) && priceMin === ''
  const todoActivo = !extras.hechoAPedido && extras.tiendas.size === 0 && !priceMin && !priceMax && (categoriaPadre == null || categoria === categoriaPadre)

  const limpiar = () => {
    setExtras((prev) => ({ ...prev, hechoAPedido: false, tiendas: new Set() }))
    setPriceMin('')
    setPriceMax('')
    if (categoriaPadre) setCategory(categoriaPadre)
  }
  const alternarTienda = (nombre: string) => setExtras((prev) => {
    const nuevas = new Set(prev.tiendas)
    if (nuevas.has(nombre)) nuevas.delete(nombre)
    else nuevas.add(nombre)
    return { ...prev, tiendas: nuevas }
  })

  return (
    <div className="bg-hc-n-0 px-4 pb-3 lg:hidden">
      <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
        <ChipRapido texto={t('products.quickAll')} activo={todoActivo} onClick={limpiar} />
        {subcategorias.map((sub) => (
          <ChipRapido
            key={String(sub.id)}
            texto={sub.nombreCategoria ?? sub.nombre ?? ''}
            activo={String(sub.id) === categoria}
            onClick={() => setCategory(String(sub.id))}
          />
        ))}
        <ChipRapido
          texto={t('products.madeToOrder')}
          activo={extras.hechoAPedido}
          onClick={() => setExtras((prev) => ({ ...prev, hechoAPedido: !prev.hechoAPedido }))}
        />
        <ChipRapido
          texto={t('products.priceUpTo', { precio: formatPrice(PRECIO_RAPIDO_MAX) })}
          activo={precioActivo}
          onClick={() => { setPriceMin(''); setPriceMax(precioActivo ? '' : String(PRECIO_RAPIDO_MAX)) }}
        />
        {tiendas.slice(0, TIENDAS_RAPIDAS_MAX).map((tienda) => (
          <ChipRapido key={tienda.nombre} texto={tienda.nombre} activo={extras.tiendas.has(tienda.nombre)} onClick={() => alternarTienda(tienda.nombre)} />
        ))}
      </div>
    </div>
  )
}
