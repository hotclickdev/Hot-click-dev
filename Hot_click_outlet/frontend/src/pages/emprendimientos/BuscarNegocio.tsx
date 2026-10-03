import IconoFigma from '@/components/comprador/IconoFigma'
import { useTranslation } from 'react-i18next'
import { ICONOS_TIENDA } from '@/pages/tienda/iconosTienda'

type BuscarNegocioProps = {
  value: string
  onChange: (value: string) => void
}

/** Buscador del directorio de emprendimientos (Figma `29:1166`, "Buscar tiendas"). */
export default function BuscarNegocio({ value, onChange }: BuscarNegocioProps) {
  const { t } = useTranslation()
  return (
    <div role="search" className="flex items-center gap-2 rounded-[12px] bg-hc-n-100 p-3 lg:max-w-[560px]">
      <IconoFigma src={ICONOS_TIENDA.buscar} size={17} className="text-hc-n-500" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('emprendimientos.buscar')}
        aria-label={t('emprendimientos.buscar')}
        className="hc-input-libre h-4 min-w-0 flex-1 bg-transparent p-0 text-sm leading-4 text-hc-n-900 outline-none placeholder:text-hc-n-500"
      />
    </div>
  )
}
