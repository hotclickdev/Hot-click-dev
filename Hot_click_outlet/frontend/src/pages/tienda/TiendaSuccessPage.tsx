import { useLocation, useParams, useSearchParams } from 'react-router-dom'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_PAGO } from '@/pages/pago/iconosPago'
import { ICONOS_CHECKOUT } from '@/pages/checkout/iconosCheckout'
import useTiendaStore from '@/store/tiendaStore'
import { formatPrice } from '@/utils/format'
import { BotonTienda, CabeceraTarjeta, CLASE_TARJETA } from './PiezasTienda'

/**
 * Confirmación del pedido de la tienda (derivado de Figma `29:1932`): círculo verde con el check, título en
 * Sora, número en mono y tarjeta "Qué sigue". El número vive en ?orden= y sobrevive un refresh.
 */
export default function TiendaSuccessPage() {
  const { slug } = useParams()
  const { state } = useLocation()
  const [params] = useSearchParams()
  const { empresa } = useTiendaStore()
  const numeroPedido = (params.get('orden') || state?.numeroPedido || '').trim()
  const total = state?.total
  const whatsapp = empresa?.whatsapp
  const nombre = empresa?.nombreComercial ?? slug

  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col gap-3 px-4 pb-8 pt-7 leading-[normal] lg:py-10">
      <div className="flex flex-col items-center gap-[10px] text-center">
        <span className="flex size-[72px] items-center justify-center rounded-full bg-hc-success-bg text-hc-success">
          <IconoFigma src={ICONOS_PAGO.exitoCheck} size={36} />
        </span>
        <h1 className="font-display text-[19px] font-bold tracking-normal text-hc-n-900">Pedido recibido</h1>
        <p className="text-[13px] text-hc-n-600">Pedido de {nombre} en HotClick</p>
        {numeroPedido
          ? (
            <p className="flex items-center gap-[6px] text-[14px] text-hc-n-600">
              Pedido <span className="font-mono text-[15px] font-medium text-hc-n-900">{numeroPedido}</span>
            </p>
            )
          : (
            <p className="text-[13px] leading-[18px] text-hc-n-600">
              Anotá el número que te llega por correo. Si recargaste esta página y no ves el número, revisá el correo de confirmación.
            </p>
            )}
      </div>

      <section className={`${CLASE_TARJETA} flex flex-col overflow-hidden`}>
        <CabeceraTarjeta>Qué sigue</CabeceraTarjeta>
        {total !== undefined && (
          <div className="flex items-center justify-between border-t border-hc-n-200 px-[14px] py-3 text-hc-n-900">
            <span className="text-[14px] font-semibold">Total</span>
            <span className="font-display text-[17px] font-bold">{formatPrice(total)}</span>
          </div>
        )}
        <div className="flex items-start gap-[10px] border-t border-hc-n-200 px-[14px] py-3">
          <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-hc-blue-50 text-hc-blue-600">
            <IconoFigma src={ICONOS_PAGO.avisoCorreo} size={18} />
          </span>
          <p className="min-w-0 flex-1 text-[13px] leading-[18px] text-hc-n-600">
            Recibirás un correo de confirmación con los detalles de tu pedido.
            El vendedor se pondrá en contacto para coordinar la entrega.
          </p>
        </div>
      </section>

      <div className="flex flex-col gap-2 pt-1">
        {whatsapp && (
          <BotonTienda
            variante="secundario"
            href={`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=Hola%2C%20acabo%20de%20hacer%20el%20pedido%20${encodeURIComponent(numeroPedido)}%20en%20su%20tienda.`}
          >
            <img src={ICONOS_CHECKOUT.whatsapp} alt="" className="size-[18px]" />
            Contactar por WhatsApp
          </BotonTienda>
        )}
        <BotonTienda variante="primario" to={`/tienda/${slug}`}>Seguir comprando</BotonTienda>
      </div>
    </div>
  )
}
