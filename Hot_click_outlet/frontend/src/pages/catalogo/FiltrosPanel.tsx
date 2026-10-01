import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { FiltrosExtra, TiendaCatalogo } from './buscarExplorar'
import type { CatalogCategoria, CatalogCounts } from './catalogoTipos'
import Casilla from './Casilla'
import FiltrosHoja from './FiltrosHoja'

export type FiltrosPanelProps = {
  priceMin: string
  priceMax: string
  setPriceMin: (v: string) => void
  setPriceMax: (v: string) => void
  categories: CatalogCategoria[]
  categoryTotalCount: CatalogCounts
  category: string
  setCategory: (v: string) => void
  tiendas: TiendaCatalogo[]
  extras: FiltrosExtra
  setExtras: (updater: (prev: FiltrosExtra) => FiltrosExtra) => void
  soloConStock: boolean
  setSoloConStock: (v: boolean) => void
  hayRetiro: boolean
  /** Precio más alto del catálogo: tope del rango visual de la hoja móvil. */
  precioTope?: number
  /** `hoja`: hoja inferior móvil (`26:887`). `columna`: lateral de desktop (`30:1899`). */
  variante?: 'hoja' | 'columna'
}

function CampoPrecioColumna({ etiqueta, valor, onCambiar }: { etiqueta: string; valor: string; onCambiar: (v: string) => void }) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      value={valor}
      onChange={(e) => onCambiar(e.target.value)}
      placeholder="₡0"
      aria-label={etiqueta}
      className="hc-input-libre w-full min-w-0 flex-1 rounded-[9px] border border-hc-n-200 bg-hc-n-0 px-[10px] py-2 font-display text-[13px] font-semibold leading-[normal] text-hc-n-900 outline-none placeholder:text-hc-n-900"
    />
  )
}

function GrupoColumna({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-[10px] border-t border-hc-n-200 px-4 py-[14px] first:border-t-0">
      <legend className="float-left w-full text-[14px] font-semibold leading-[normal] text-hc-n-900">{titulo}</legend>
      {children}
    </fieldset>
  )
}

/** Columna de filtros de desktop (Figma `30:1899`, 260 px): casillas en lugar de chips e interruptores. */
function FiltrosColumna({
  priceMin, priceMax, setPriceMin, setPriceMax,
  categories, categoryTotalCount, category, setCategory,
  tiendas, extras, setExtras, soloConStock, setSoloConStock, hayRetiro,
}: FiltrosPanelProps) {
  const { t } = useTranslation()
  const raices = categories.filter((c) => (categoryTotalCount[String(c.id)] ?? 0) > 0 && !c.padreId)
  const alternarTienda = (nombre: string) => setExtras((prev) => {
    const nuevas = new Set(prev.tiendas)
    if (nuevas.has(nombre)) nuevas.delete(nombre)
    else nuevas.add(nombre)
    return { ...prev, tiendas: nuevas }
  })
  return (
    <div className="flex w-[260px] flex-col overflow-hidden rounded-[14px] border border-hc-n-200 bg-hc-n-0">
      {raices.length > 0 && (
        <GrupoColumna titulo={t('products.categoryLabel')}>
          {raices.map((c) => {
            const activa = String(c.id) === String(category)
            return (
              <Casilla
                key={String(c.id)}
                etiqueta={c.nombreCategoria ?? c.nombre ?? ''}
                marcada={activa}
                onCambiar={() => setCategory(activa ? '' : String(c.id))}
                cuenta={categoryTotalCount[String(c.id)] ?? 0}
              />
            )
          })}
        </GrupoColumna>
      )}
      <GrupoColumna titulo={t('products.priceShort')}>
        <div className="flex gap-2">
          <CampoPrecioColumna etiqueta={t('products.priceMin')} valor={priceMin} onCambiar={setPriceMin} />
          <CampoPrecioColumna etiqueta={t('products.priceMax')} valor={priceMax} onCambiar={setPriceMax} />
        </div>
      </GrupoColumna>
      {tiendas.length > 0 && (
        <GrupoColumna titulo={t('products.store')}>
          {tiendas.map((tienda) => (
            <Casilla
              key={tienda.nombre}
              etiqueta={tienda.nombre}
              marcada={extras.tiendas.has(tienda.nombre)}
              onCambiar={() => alternarTienda(tienda.nombre)}
              cuenta={tienda.cantidad}
            />
          ))}
        </GrupoColumna>
      )}
      <GrupoColumna titulo={t('products.availabilityDelivery')}>
        <Casilla etiqueta={t('products.onlyInStock')} marcada={soloConStock} onCambiar={() => setSoloConStock(!soloConStock)} />
        <Casilla
          etiqueta={t('products.madeToOrder')}
          marcada={extras.hechoAPedido}
          onCambiar={() => setExtras((prev) => ({ ...prev, hechoAPedido: !prev.hechoAPedido }))}
        />
        {hayRetiro && (
          <Casilla
            etiqueta={t('products.storePickup')}
            marcada={extras.retiroEnTienda}
            onCambiar={() => setExtras((prev) => ({ ...prev, retiroEnTienda: !prev.retiroEnTienda }))}
          />
        )}
      </GrupoColumna>
    </div>
  )
}

/** Filtros del catálogo: precio, categoría, tienda y disponibilidad. Hoja móvil (Figma `26:887`) o columna de desktop (`30:1899`). */
export default function FiltrosPanel(props: FiltrosPanelProps) {
  if (props.variante === 'columna') return <FiltrosColumna {...props} />
  return <FiltrosHoja {...props} />
}
