import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRA } from '@/pages/checkout/iconosCompra'
import { formaEntrega, type DespachoPaquete } from './despachoPaquete'

const METODO_RETIRO = 'RETIRO_EN_TIENDA'

/** Card «Enviar a» (Figma `37:1804`). */
export default function TarjetaEnviarA({ despacho }: Readonly<{ despacho: DespachoPaquete }>) {
  const { nombre, telefono, direccion } = despacho.cliente
  const contacto = [nombre || 'Cliente', telefono].filter(Boolean).join(' · ')
  return (
    <section className="flex w-full flex-col gap-[8px] rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px]">
      <h2 className="text-[14px] font-semibold text-hc-n-900">
        {despacho.metodoEnvio === METODO_RETIRO ? 'Lo retira' : 'Enviar a'}
      </h2>
      <div className="flex items-start gap-[8px]">
        <IconoFigma src={ICONOS_COMPRA.pin} size={16} className="mt-px text-hc-n-600" />
        <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <p className="text-[13px] font-medium text-hc-n-900">{contacto}</p>
          {direccion ? <p className="text-[12px] leading-[16px] text-hc-n-600">{direccion}</p> : null}
        </div>
      </div>
      <p className="flex items-center gap-[8px] text-[13px] font-medium text-hc-blue-600">
        <IconoFigma src={ICONOS_COMPRA.camion} size={16} />
        {formaEntrega(despacho.metodoEnvio)}
      </p>
    </section>
  )
}
