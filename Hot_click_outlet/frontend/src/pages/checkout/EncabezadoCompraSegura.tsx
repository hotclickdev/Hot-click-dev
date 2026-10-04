import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import MarcaComprador from '@/components/comprador/header/MarcaComprador'
import { ICONOS_COMPRA } from './iconosCompra'

type EncabezadoCompraSeguraProps = {
  /** Sin `onVolver` es el encabezado centrado de las pantallas de resultado (`29:1932`). */
  onVolver?: () => void
}

function CompraSegura({ className, icono }: { className: string; icono: number }) {
  const { t } = useTranslation()
  return (
    <p className={`flex items-center gap-[6px] font-semibold text-hc-success-text ${className}`}>
      <IconoFigma src={ICONOS_COMPRA.compraSegura} size={icono} />
      {t('compra.checkout.compraSegura')}
    </p>
  )
}

/** Header «Compra segura»: móvil `28:1084`, desktop `30:2386`. */
export default function EncabezadoCompraSegura({ onVolver }: EncabezadoCompraSeguraProps) {
  const { t } = useTranslation()

  if (!onVolver) {
    return (
      <header className="flex justify-center border-b border-hc-n-200 bg-hc-n-0 px-[16px] py-[14px] lg:py-[18px]">
        <MarcaComprador tamano="compra" />
      </header>
    )
  }

  return (
    <header className="border-b border-hc-n-200 bg-hc-n-0">
      <div className="flex items-center gap-[12px] px-[16px] py-[14px] lg:hidden">
        <button type="button" onClick={onVolver} aria-label={t('compra.volver')} className="flex text-hc-n-900">
          <IconoFigma src={ICONOS_COMPRA.volver} size={22} />
        </button>
        <MarcaComprador tamano="compra" />
        <CompraSegura className="ml-auto text-[12px]" icono={15} />
      </div>
      <div className="mx-auto hidden max-w-[1440px] items-center justify-between px-[120px] py-[18px] lg:flex">
        <MarcaComprador tamano="escritorio" />
        <CompraSegura className="text-[14px]" icono={16} />
      </div>
    </header>
  )
}
