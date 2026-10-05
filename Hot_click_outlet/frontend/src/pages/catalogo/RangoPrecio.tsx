import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'

import { PASO_RANGO } from './rangoPrecioHelpers'

const CLASE_TIRADOR =
  'hc-input-libre pointer-events-none absolute inset-0 h-5 w-full appearance-none bg-transparent '
  + '[&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-track]:bg-transparent '
  + '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:cursor-pointer '
  + '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 '
  + '[&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-hc-blue-600 [&::-webkit-slider-thumb]:bg-white '
  + '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:cursor-pointer '
  + '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-solid '
  + '[&::-moz-range-thumb]:border-hc-blue-600 [&::-moz-range-thumb]:bg-white'

/**
 * Rango visual de la hoja de filtros (Figma `26:902`): pista de 4 px y dos tiradores de 20 px.
 * Edita los mismos campos de precio mínimo y máximo: un máximo igual al tope equivale a "sin máximo".
 */
export default function RangoPrecio({
  tope, priceMin, priceMax, setPriceMin, setPriceMax,
}: {
  tope: number
  priceMin: string
  priceMax: string
  setPriceMin: (v: string) => void
  setPriceMax: (v: string) => void
}) {
  const { t } = useTranslation()
  if (tope <= 0) return null
  const minimo = Math.min(Number(priceMin) || 0, tope)
  const maximo = priceMax === '' ? tope : Math.min(Number(priceMax) || 0, tope)
  const izquierda = (minimo / tope) * 100
  const ancho = Math.max(0, ((maximo - minimo) / tope) * 100)

  return (
    <div className="flex flex-col gap-2">
      <p className="flex justify-between text-[12px] leading-[normal] text-hc-n-600">
        <span>{formatPrice(minimo)}</span>
        <span>{formatPrice(maximo)}</span>
      </p>
      <div className="relative h-5 w-full">
      <div className="absolute left-0 top-2 h-1 w-full rounded-[2px] bg-hc-border" />
      <div className="absolute top-2 h-1 rounded-[2px] bg-hc-blue-600" style={{ left: `${izquierda}%`, width: `${ancho}%` }} />
      <input
        type="range"
        min={0}
        max={tope}
        step={PASO_RANGO}
        value={minimo}
        aria-label={t('products.priceMin')}
        onChange={(e) => {
          const valor = Math.min(Number(e.target.value), maximo)
          setPriceMin(valor <= 0 ? '' : String(valor))
        }}
        className={CLASE_TIRADOR}
      />
      <input
        type="range"
        min={0}
        max={tope}
        step={PASO_RANGO}
        value={maximo}
        aria-label={t('products.priceMax')}
        onChange={(e) => {
          const valor = Math.max(Number(e.target.value), minimo)
          setPriceMax(valor >= tope ? '' : String(valor))
        }}
        className={CLASE_TIRADOR}
      />
      </div>
    </div>
  )
}
