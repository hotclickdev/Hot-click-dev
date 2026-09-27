import { useTranslation } from 'react-i18next'
import type { PasoCompra } from './validacionCompra'

const PASOS: PasoCompra[] = [1, 2, 3]

function claseEtiqueta(paso: PasoCompra, actual: PasoCompra): string {
  if (paso === actual) return 'font-semibold text-hc-n-900'
  if (paso < actual) return 'font-medium text-hc-blue-600'
  return 'font-medium text-hc-n-500'
}

/** Barras de pasos del checkout móvil (`28:1090`); desktop muestra las tres secciones a la vez. */
export default function PasosCompra({ actual }: { actual: PasoCompra }) {
  const { t } = useTranslation()
  return (
    <ol aria-label={t('compra.pasos.aria')} className="flex gap-[6px] bg-hc-n-0 px-[16px] pb-[14px] pt-[12px] lg:hidden">
      {PASOS.map((paso) => (
        <li key={paso} aria-current={paso === actual ? 'step' : undefined} className="flex min-w-0 flex-1 flex-col gap-[6px]">
          <span className={`h-[4px] rounded-[2px] ${paso <= actual ? 'bg-hc-blue-600' : 'bg-hc-n-200'}`} />
          <span className={`text-[12px] ${claseEtiqueta(paso, actual)}`}>{t(`compra.pasos.paso${paso}`)}</span>
        </li>
      ))}
    </ol>
  )
}
