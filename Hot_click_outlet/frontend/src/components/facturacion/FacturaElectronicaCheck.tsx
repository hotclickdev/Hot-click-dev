import { useTranslation } from 'react-i18next'

type Props = {
  marcado: boolean
  onCambiar: (valor: boolean) => void
  /** `checkout` (comprador, habla de «tus datos») o `pos` (cajero). */
  contexto: 'checkout' | 'pos'
}

/** M4: casilla «Quiero factura electrónica». En régimen simplificado el total suma el IVA. */
export default function FacturaElectronicaCheck({ marcado, onCambiar, contexto }: Readonly<Props>) {
  const { t } = useTranslation()
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-[12px] border border-hc-n-200 bg-hc-n-0 p-3 leading-[normal]">
      <input
        type="checkbox"
        checked={marcado}
        onChange={(e) => onCambiar(e.target.checked)}
        className="mt-[2px] size-4 shrink-0 accent-hc-blue-600"
        data-testid={`factura-electronica-${contexto}`}
      />
      <span className="flex flex-col gap-[2px]">
        <span className="text-[13px] font-semibold text-hc-n-900">{t(`facturaElectronica.${contexto}`)}</span>
        <span className="text-[11px] leading-[15px] text-hc-n-600">{t(`facturaElectronica.${contexto}Ayuda`)}</span>
      </span>
    </label>
  )
}
