import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRA } from '@/pages/checkout/iconosCompra'
import { formatoColon } from '@/theme/formatoColon'
import { etiquetaComision, notaPlan, usaGuiaCorreos, type DespachoPaquete } from './despachoPaquete'

function Linea({ etiqueta, monto }: Readonly<{ etiqueta: string; monto: string }>) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-hc-n-600">{etiqueta}</span>
      <span className="text-hc-n-900">{monto}</span>
    </div>
  )
}

/** Card «Tu pago por este paquete» (Figma `37:1830`) con el mismo cálculo que acredita el wallet. */
export default function TarjetaPagoPaquete({ despacho }: Readonly<{ despacho: DespachoPaquete }>) {
  const { pago } = despacho
  const unidades = despacho.productos.reduce((total, p) => total + p.cantidad, 0)
  const etiquetaEnvio = usaGuiaCorreos(despacho.metodoEnvio) ? 'Envío que pagaste en Correos' : 'Envío del paquete'
  return (
    <section className="flex w-full flex-col gap-[8px] rounded-[14px] border border-hc-blue-100 bg-hc-blue-50 p-[14px]">
      <h2 className="flex items-center gap-[8px] text-[14px] font-semibold text-hc-blue-600">
        <IconoFigma src={ICONOS_COMPRA.billetera} size={18} />
        Tu pago por este paquete
      </h2>
      <Linea etiqueta={`Venta (${unidades} ${unidades === 1 ? 'producto' : 'productos'})`} monto={formatoColon(pago.venta)} />
      <Linea etiqueta={etiquetaComision(pago)} monto={`− ${formatoColon(pago.comision)}`} />
      {pago.envio > 0 ? <Linea etiqueta={etiquetaEnvio} monto={`+ ${formatoColon(pago.envio)}`} /> : null}
      <div className="h-px w-full bg-hc-blue-100" />
      <div className="flex items-center justify-between text-hc-n-900">
        <span className="text-[14px] font-semibold">A recibir</span>
        <span className="font-display text-[18px] font-bold">{formatoColon(pago.aRecibir)}</span>
      </div>
      <p className="text-[11px] leading-[15px] text-hc-n-600">{notaPlan(pago)}</p>
    </section>
  )
}
