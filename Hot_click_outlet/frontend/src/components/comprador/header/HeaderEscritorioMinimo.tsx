import { useTranslation } from 'react-i18next'
import IconoFigma from '../IconoFigma'
import { ICONOS_COMPRADOR } from '../iconosComprador'
import MarcaComprador from './MarcaComprador'

/** Header desktop del checkout: logo + "Compra segura" (Figma `30:2386`). */
export default function HeaderEscritorioMinimo() {
  const { t } = useTranslation()
  return (
    <div className="hidden items-center justify-between border-b border-hc-n-200 bg-hc-n-0 px-8 py-[18px] leading-[normal] lg:flex xl:px-[max(120px,calc((100%_-_1200px)/2))]">
      <MarcaComprador tamano="escritorio" />
      <span className="flex items-center gap-[6px] text-[14px] font-semibold text-hc-success-text">
        <IconoFigma src={ICONOS_COMPRADOR.compraSeguraCandado} size={16} />
        {t('comprador.header.compraSegura')}
      </span>
    </div>
  )
}
