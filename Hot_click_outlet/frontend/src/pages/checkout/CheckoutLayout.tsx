import { useEffect, useMemo, useState, type ReactNode, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import ResumenCarrito from '@/pages/carrito/ResumenCarrito'
import { paquetesConEnvioElegido } from '@/pages/carrito/cartHelpers'
import { rutaLoginConRetorno } from '@/utils/authRedirect'
import { formatPrice } from '@/utils/format'
import CheckoutPayError from './CheckoutPayError'
import PasoDatos from './PasoDatos'
import PasoEntrega from './PasoEntrega'
import { CodigosCheckout, ConsentimientoDatos, MetodosPago, ResumenPagoMovil } from './PasoPago'
import { CabeceraCompraSegura, IndicadorPasos, PieCheckoutMovil } from './PiezasCheckout'
import { useVolver } from './pasosCheckoutHelpers'
import { useCodigosPedido } from './useCodigosPedido'
import { useEsDesktop } from './useEsDesktop'
import type { ItemCheckout } from './checkoutHelpers'
import type { CheckoutFormState } from './useCheckoutForm'

type CheckoutLayoutProps = {
  token: string | null
  items: ItemCheckout[]
  form: CheckoutFormState
  estado: string
  error: unknown
  intentos: number
  maxIntentos: number
  errorBannerRef: RefObject<HTMLDivElement | null>
  toWhatsAppMessage: () => string
  onPagar: () => void
}

const RUTA_CARRITO = '/carrito'
const PASO_PAGO = 3

/** Tarjeta numerada del checkout de escritorio (Figma `30:2400`). */
function TarjetaPaso({ numero, titulo, subtitulo, children }: { numero: number; titulo: string; subtitulo?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-[14px] rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-5">
      <div className="flex items-center gap-3 leading-[normal]">
        <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-hc-blue-600 text-[13px] font-bold text-hc-n-0">{numero}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-px">
          <h2 className="font-display text-[17px] font-semibold tracking-normal text-hc-n-900">{titulo}</h2>
          {subtitulo && <p className="text-[13px] text-hc-n-500">{subtitulo}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

/**
 * Checkout: tres pasos en móvil (Figma `28:1083`, `29:1248`, `29:1344`) y una sola página con tres
 * tarjetas y resumen lateral en escritorio (`30:2385`). Mismos datos y pago que el checkout original.
 */
export default function CheckoutLayout({
  token, items, form, estado, error, intentos, maxIntentos, errorBannerRef, toWhatsAppMessage, onPagar,
}: CheckoutLayoutProps) {
  const { t } = useTranslation()
  const esDesktop = useEsDesktop()
  const codigos = useCodigosPedido(token)
  const { paso, setPaso } = form
  const [consentimientoPendiente, setConsentimientoPendiente] = useState(false)
  const volver = useVolver(RUTA_CARRITO, paso, setPaso)

  const paquetesResumen = useMemo(() => paquetesConEnvioElegido(form.paquetes, form.metodoEnvioPorPaquete), [form.paquetes, form.metodoEnvioPorPaquete])
  const unidades = items.reduce((suma, item) => suma + (item.cantidad ?? 0), 0)
  const ocupado = estado === 'loading' || estado === 'redirecting' || intentos >= maxIntentos
  const requiereEntrega = form.paquetes.some((p) => form.metodoEnvioPorPaquete[p.bodegaId] !== 'RETIRO_EN_TIENDA')

  useEffect(() => {
    globalThis.scrollTo({ top: 0, behavior: 'instant' })
  }, [paso])

  function elegirEnvio(bodegaId: string, valor: string) {
    form.setMetodoEnvioPaquete(bodegaId, valor)
    if (valor === 'ENVIO_RAPIDO' && form.metodoPago === 'EFECTIVO') form.setMetodoPago('TILOPAY')
  }

  /** Datos de contacto: correo, teléfono y nombre (invitado) o solo teléfono (con sesión). */
  function validarDatos(): boolean {
    if (token) {
      if (!form.necesitaDireccion) return true
      const err = form.validatePhone(form.telefono)
      form.setTelefonoError(err)
      form.setTelefonoDirty(true)
      return !err
    }
    const errCorreo = form.validateGuestEmail(form.guestEmail)
    const errTelefono = requiereEntrega ? form.validatePhone(form.guestPhone) : ''
    const errNombre = form.sinpeNombre.trim() ? '' : t('checkout.f.nombreRequerido')
    form.setGuestEmailError(errCorreo)
    form.setGuestEmailDirty(true)
    form.setGuestPhoneError(errTelefono)
    form.setGuestPhoneDirty(true)
    form.setSinpeNombreErr(errNombre)
    return !errCorreo && !errTelefono && !errNombre
  }

  /** Dirección completa: provincia, cantón y señas (solo si algún paquete va a domicilio). */
  function validarEntrega(): boolean {
    if (!form.necesitaDireccion) return true
    const errSenas = form.validateAddress(form.direccion)
    form.setDireccionError(errSenas)
    form.setDireccionDirty(true)
    return !errSenas && Boolean(form.provincia) && Boolean(form.canton)
  }

  function enfocarPrimerError() {
    requestAnimationFrame(() => {
      const campo = document.querySelector<HTMLElement>('[aria-invalid="true"]')
      campo?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      campo?.focus({ preventScroll: true })
    })
  }

  function pagar() {
    if (!form.aceptaDatos) {
      setConsentimientoPendiente(true)
      return
    }
    if (esDesktop && !(validarDatos() && validarEntrega())) {
      enfocarPrimerError()
      return
    }
    onPagar()
  }

  function continuar() {
    if (paso === 1 && !validarDatos()) return enfocarPrimerError()
    if (paso === 2 && !validarEntrega()) return enfocarPrimerError()
    setPaso(Math.min(PASO_PAGO, paso + 1))
  }

  const errorPago = (
    <CheckoutPayError
      estado={estado}
      error={error}
      intentos={intentos}
      maxIntentos={maxIntentos}
      onPagar={pagar}
      toWhatsAppMessage={toWhatsAppMessage}
      errorBannerRef={errorBannerRef}
      rutaCarrito={RUTA_CARRITO}
    />
  )
  const consentimiento = <ConsentimientoDatos marcado={form.aceptaDatos} onCambiar={(v) => { form.setAceptaDatos(v); if (v) setConsentimientoPendiente(false) }} error={consentimientoPendiente} />
  const textoPagar = t('checkout.f.pagar', { precio: formatPrice(form.totalFinal) })
  const hayEnvioQueVaria = form.envioVaria

  if (esDesktop) {
    return (
      <MainLayout variante="propia" encabezadoEscritorio="minimo" pie={false} barraInferior={false}>
        <div className="mx-auto flex w-[calc(100%-4rem)] max-w-[1200px] flex-col gap-5 pb-16 pt-9">
          <h1 className="font-display text-[30px] font-bold leading-[normal] tracking-normal text-hc-n-900">{t('checkout.f.tituloEscritorio')}</h1>
          <div className="flex items-start gap-8">
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              {errorPago}
              <TarjetaPaso
                numero={1}
                titulo={t('checkout.f.tusDatos')}
                subtitulo={token ? undefined : <>{t('checkout.f.sinCuentaEscritorio')} <Link to={rutaLoginConRetorno('/checkout')} className="hover:underline">{t('checkout.f.ingresar')}</Link></>}
              >
                <PasoDatos form={form} token={token} escritorio />
              </TarjetaPaso>
              <TarjetaPaso numero={2} titulo={t('checkout.f.entrega')}>
                <PasoEntrega form={form} escritorio onElegirEnvio={elegirEnvio} />
              </TarjetaPaso>
              <TarjetaPaso numero={3} titulo={t('checkout.f.pago')}>
                <MetodosPago form={form} token={token} total={form.totalFinal} escritorio />
              </TarjetaPaso>
            </div>
            <ResumenCarrito
              paquetes={paquetesResumen}
              unidades={unidades}
              subtotal={form.subtotalCart}
              envio={form.costoEnvio}
              total={form.totalFinal}
              escritorio
              onContinuar={pagar}
              textoBoton={textoPagar}
              botonDeshabilitado={ocupado}
              consentimiento={consentimiento}
              envioVaria={hayEnvioQueVaria}
              descuento={form.descuentoMonto}
              cuponPorcentaje={form.cuponDescuento}
              giftCard={form.gcAplicado}
              codigosEscritorio={<CodigosCheckout codigos={codigos} token={token} descuento={form.descuentoMonto} giftCard={form.gcAplicado} />}
            />
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout variante="propia" pie={false} barraInferior={false}>
      <div className="flex min-h-dvh flex-col bg-hc-n-50">
        <CabeceraCompraSegura onAtras={volver} />
        <IndicadorPasos paso={paso} onIr={setPaso} />
        <div className={`flex flex-1 flex-col px-4 pb-4 pt-[18px] ${paso === PASO_PAGO ? 'gap-3' : 'gap-4'}`}>
          {paso === PASO_PAGO && errorPago}
          {paso === 1 && <PasoDatos form={form} token={token} escritorio={false} />}
          {paso === 2 && <PasoEntrega form={form} escritorio={false} onElegirEnvio={elegirEnvio} />}
          {paso === PASO_PAGO && (
            <>
              <h2 className="font-display text-[18px] font-bold leading-[23px] tracking-normal text-hc-n-900">{t('checkout.f.pagoTitulo')}</h2>
              <MetodosPago form={form} token={token} total={form.totalFinal} escritorio={false} />
              <ResumenPagoMovil
                paquetes={paquetesResumen}
                unidades={unidades}
                subtotal={form.subtotalCart}
                envio={form.costoEnvio}
                envioVaria={hayEnvioQueVaria}
                descuento={form.descuentoMonto}
                cuponPorcentaje={form.cuponDescuento}
                giftCard={form.gcAplicado}
                codigos={codigos}
                token={token}
              />
              {consentimiento}
            </>
          )}
        </div>
        <PieCheckoutMovil
          total={form.totalFinal}
          etiqueta={paso === 1 ? t('checkout.f.continuarEntrega') : paso === 2 ? t('checkout.f.continuarPago') : textoPagar}
          onClick={paso === PASO_PAGO ? pagar : continuar}
          deshabilitado={paso === PASO_PAGO && ocupado}
          restante={form.gcAplicado > 0}
        />
      </div>
    </MainLayout>
  )
}
