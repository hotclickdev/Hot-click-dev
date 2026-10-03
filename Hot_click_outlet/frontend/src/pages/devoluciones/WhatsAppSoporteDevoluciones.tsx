import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import { WHATSAPP_HOTCLICK, urlWhatsApp, whatsAppVisible } from '@/pages/carrito/cartHelpers'

const TEXTO = 'Hola HotClick, tengo una consulta sobre una devolución.'

/**
 * WhatsApp de soporte en la tarjeta "¿Tenés un problema con tu pedido?" de Devoluciones.
 * Siempre el número de HotClick (`ContactoPublicoPolicy.WHATSAPP_HOTCLICK`), nunca el del vendedor:
 * esta página es de la plataforma y no sabe de qué tienda es el pedido.
 */
export default function WhatsAppSoporteDevoluciones() {
  return (
    <div className="flex flex-col gap-[6px]">
      <a
        href={urlWhatsApp(encodeURIComponent(TEXTO), WHATSAPP_HOTCLICK)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 items-center justify-center gap-2 rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-4 text-[14px] font-semibold leading-[normal] text-hc-n-900"
      >
        <IconoFigma src={ICONOS_COMPRADOR.falloWhatsapp} size={18} />
        Escribinos por WhatsApp
      </a>
      <p className="text-center text-[11px] leading-4 text-hc-n-600">
        {`Soporte HotClick · ${whatsAppVisible(WHATSAPP_HOTCLICK)} · para consultas; el reclamo se reporta desde Mis pedidos o por correo.`}
      </p>
    </div>
  )
}
