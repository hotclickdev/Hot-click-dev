import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import useCartStore from '@/store/cartStore'
import { usePayment, tilopayCardDesdePago } from '@/hooks/usePayment'
import ResumenLateral from './carrito/ResumenLateral'
import CampoGiftCard from './checkout/CampoGiftCard'
import CheckoutEmpty from './checkout/CheckoutEmpty'
import CheckoutLoading from './checkout/CheckoutLoading'
import PagoExito from './pago/PagoExito'
import CheckoutPayError from './checkout/CheckoutPayError'
import CheckoutTilopayCard from './checkout/CheckoutTilopayCard'
import ConsentimientoDatos from './checkout/ConsentimientoDatos'
import EncabezadoCompraSegura from './checkout/EncabezadoCompraSegura'
import PasosCompra from './checkout/PasosCompra'
import PieCompraMovil from './checkout/PieCompraMovil'
import ResultadoSinpe from './checkout/ResultadoSinpe'
import SeccionDatos from './checkout/SeccionDatos'
import SeccionEntrega from './checkout/SeccionEntrega'
import SeccionPago from './checkout/SeccionPago'
import { useComprobanteSinpe } from './checkout/useComprobanteSinpe'
import { useFormularioCompra } from './checkout/useFormularioCompra'
import { useNavegacionCompra } from './checkout/useNavegacionCompra'

/**
 * Checkout por paquetes: móvil en 3 pasos (`28:1083`, `29:1248`, `29:1344`), desktop en una página (`30:2385`).
 * Los side effects de pago (`usePayment`) son los mismos de siempre.
 */
export default function CheckoutPage() {
  const { t } = useTranslation()
  const items = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clearCart)
  const toWhatsAppMessage = useCartStore((s) => s.toWhatsAppMessage)
  const { estado, pagoData, error, intentos, maxIntentos, iniciarPago, reset } = usePayment()
  const errorBannerRef = useRef<HTMLDivElement | null>(null)

  const form = useFormularioCompra(items)
  const navegacion = useNavegacionCompra({ form, items, estado, intentos, maxIntentos, iniciarPago })
  const totalPedido = Number(pagoData?.total) || form.totales.total
  const comprobante = useComprobanteSinpe({
    estado, pagoData, token: form.token, datos: form.datos, comprobante: form.comprobante, total: totalPedido,
  })

  useEffect(() => {
    if (estado === 'gift_card_paid' || estado === 'sinpe_pendiente') clearCart()
  }, [estado, clearCart])

  useEffect(() => {
    globalThis.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  useEffect(() => {
    if (estado === 'sinpe_pendiente' || estado === 'gift_card_paid' || estado === 'tilopay_card') {
      globalThis.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (estado === 'failed') {
      errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [estado])

  if (estado === 'tilopay_card') {
    const payload = tilopayCardDesdePago(pagoData)
    if (payload) return <CheckoutTilopayCard payload={payload} onVolver={reset} />
  }

  if (estado === 'sinpe_pendiente') {
    return (
      <ResultadoSinpe
        pagoData={pagoData}
        comprobante={comprobante}
        datos={form.datos}
        total={totalPedido}
        cantidadPaquetes={navegacion.paquetesPagados}
        esInvitado={!form.token}
        subidaAutomatica={Boolean(form.comprobante)}
      />
    )
  }

  if (estado === 'gift_card_paid') {
    return <PagoExito pagoData={pagoData} numeroPedido={pagoData?.numeroPedido ?? null} token={form.token} />
  }
  if (estado === 'redirecting' || estado === 'loading') return <CheckoutLoading estado={estado} />
  if (items.length === 0) return <CheckoutEmpty />

  const consentimiento = <ConsentimientoDatos acepta={form.aceptaDatos} onCambiar={form.setAceptaDatos} />
  const avisoError = (
    <CheckoutPayError
      estado={estado}
      error={error}
      intentos={intentos}
      maxIntentos={maxIntentos}
      onPagar={navegacion.pagar}
      toWhatsAppMessage={toWhatsAppMessage}
      errorBannerRef={errorBannerRef}
    />
  )

  return (
    <div className="min-h-screen bg-hc-n-50">
      <EncabezadoCompraSegura onVolver={navegacion.volver} />
      <PasosCompra actual={navegacion.paso} />
      <main className="mx-auto w-full max-w-[1440px] pb-[160px] lg:px-[120px] lg:pb-[64px] lg:pt-[36px]">
        <h1 className="sr-only font-display text-[30px] font-bold text-hc-n-900 lg:not-sr-only lg:mb-[20px] lg:block">
          {t('compra.checkout.titulo')}
        </h1>
        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-[32px]">
          <div className="flex min-w-0 flex-1 flex-col lg:gap-[16px]">
            <SeccionDatos form={form} visibleEnMovil={navegacion.paso === 1} />
            <SeccionEntrega form={form} visibleEnMovil={navegacion.paso === 2} />
            <SeccionPago form={form} visibleEnMovil={navegacion.paso === 3} avisoError={avisoError} />
          </div>
          <div className="hidden lg:sticky lg:top-[24px] lg:block">
            <ResumenLateral
              paquetes={form.paquetes}
              envios={form.envios}
              totales={form.totales}
              cupon={form.cupon}
              textoBoton={navegacion.textoPagar}
              onBoton={navegacion.pagar}
              botonDeshabilitado={navegacion.pagoBloqueado}
              extraCupon={<CampoGiftCard giftCard={form.giftCard} />}
              antesDelBoton={consentimiento}
            />
          </div>
        </div>
      </main>
      <PieCompraMovil
        total={form.totales.total}
        textoBoton={navegacion.textoBotonPaso}
        onBoton={navegacion.avanzar}
        deshabilitado={navegacion.paso === 3 && navegacion.pagoBloqueado}
      />
    </div>
  )
}
