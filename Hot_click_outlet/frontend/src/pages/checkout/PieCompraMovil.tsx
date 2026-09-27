import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'

type PieCompraMovilProps = {
  total: number
  textoBoton: string
  onBoton: () => void
  deshabilitado?: boolean
}

/** Pie fijo del checkout móvil: total y botón del paso (`28:1083` a `29:1344`). */
export default function PieCompraMovil({ total, textoBoton, onBoton, deshabilitado = false }: PieCompraMovilProps) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-[10px] border-t border-hc-n-200 bg-hc-n-0 px-[16px] pb-[24px] pt-[12px] lg:hidden">
      <div className="flex items-center justify-between text-hc-n-900">
        <p className="text-[15px] font-semibold">{t('compra.resumen.total')}</p>
        <p className="font-display text-[17px] font-bold">{formatPrice(total)}</p>
      </div>
      <button
        type="button"
        onClick={onBoton}
        disabled={deshabilitado}
        className="flex w-full items-center justify-center rounded-[12px] bg-hc-red-500 px-[16px] py-[14px] text-[15px] font-semibold text-hc-n-0 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {textoBoton}
      </button>
    </div>
  )
}
