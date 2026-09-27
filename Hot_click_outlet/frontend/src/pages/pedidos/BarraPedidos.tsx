import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_PEDIDOS } from './iconosPedidos'

/** Barra superior con «volver» y título (Figma `28:1311`, `29:1435`). */
export default function BarraPedidos({ titulo, onVolver }: { titulo: string; onVolver: () => void }) {
  const { t } = useTranslation()
  return (
    <header className="border-b border-hc-n-200 bg-hc-n-0 px-[16px] py-[14px]">
      <div className="mx-auto flex max-w-[720px] items-center gap-[12px]">
        <button type="button" onClick={onVolver} aria-label={t('misPedidos.volver')} className="flex text-hc-n-900">
          <IconoFigma src={ICONOS_PEDIDOS.volver} size={22} />
        </button>
        <h1 className="min-w-0 flex-1 font-display text-[17px] font-bold leading-[21px] text-hc-n-900">{titulo}</h1>
      </div>
    </header>
  )
}
