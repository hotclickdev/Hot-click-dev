import { Campo } from '@/pages/checkout/PiezasCheckout'
import { MSG_DIRECCION_DOMICILIO } from './tiendaCheckoutValidacion'

const CLASE_AREA = 'hc-input-libre w-full resize-none rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-[14px] py-[13px] text-[15px] leading-[20px] text-hc-n-900 outline-none placeholder:text-hc-n-500 focus:border-hc-blue-600 lg:rounded-[10px]'

/** Dirección de entrega: obligatoria solo con envío a domicilio (derivado de Figma `28:1110`). */
export default function TiendaCheckoutDireccion({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Campo etiqueta="Dirección de entrega" ayuda={MSG_DIRECCION_DOMICILIO}>
      {({ id, describedBy }) => (
        <textarea
          id={id}
          required
          aria-describedby={describedBy}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Provincia, cantón, señas exactas..."
          rows={2}
          maxLength={500}
          className={CLASE_AREA}
        />
      )}
    </Campo>
  )
}
