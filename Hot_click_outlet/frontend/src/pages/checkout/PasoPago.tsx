import FacturaElectronicaCheck from '@/components/facturacion/FacturaElectronicaCheck'
import { useFacturaElectronica } from '@/components/facturacion/facturaElectronica'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import type { PaqueteCarrito } from '@/pages/carrito/cartHelpers'
import { CampoCodigo, LineaCodigo, TarjetaCodigos, TituloValido } from './CodigoDescuento'
import { formatoRebaja, saldoRestanteGiftCard } from './codigoDescuentoHelpers'
import { formatPrice } from '@/utils/format'
import { destinoSinpeVisible } from './checkoutHelpers'
import { ICONOS_CHECKOUT } from './iconosCheckout'
import type { CheckoutFormState } from './useCheckoutForm'
import type { CodigosPedido } from './useCodigosPedido'
import { PAGO_EFECTIVO, metodoProximamente, metodoSeleccionable } from './pagoPrincipal'
import { metodosDisponibles } from './metodosPago'

type MetodosPagoProps = {
  form: CheckoutFormState
  token: string | null
  total: number
  escritorio: boolean
}

/** Métodos de pago: lista en móvil (Figma `29:1370`) y tres tarjetas en escritorio (`30:2473`). */
export function MetodosPago({ form, escritorio }: MetodosPagoProps) {
  const { t } = useTranslation()
  const rapido = Object.values(form.metodoEnvioPorPaquete).includes('ENVIO_RAPIDO')
  const METODOS = metodosDisponibles()
  const disponibles = METODOS.filter((m) => !(m.id === PAGO_EFECTIVO && rapido)).map((m) => m.id as string)
  const seleccionable = metodoSeleccionable(form.metodoPago, disponibles, form.sinpeManualHabilitado, form.tarjetaOnvoHabilitada)
  const { setMetodoPago } = form
  useEffect(() => {
    if (seleccionable !== form.metodoPago) setMetodoPago(seleccionable)
  }, [seleccionable, form.metodoPago, setMetodoPago])

  if (escritorio) {
    return (
      <div className="flex flex-col gap-3">
        <div role="radiogroup" aria-label={t('checkout.paymentMethod')} className="flex items-start gap-3">
          {METODOS.map((metodo) => {
            const activo = form.metodoPago === metodo.id
            const proximamente = metodoProximamente(metodo.id, form.sinpeManualHabilitado, form.tarjetaOnvoHabilitada)
            const bloqueado = proximamente || (metodo.id === PAGO_EFECTIVO && rapido)
            return (
              <label key={metodo.id} className={`flex min-w-px flex-1 flex-col items-start gap-1 rounded-[12px] p-[14px] leading-[normal] ${bloqueado ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'} ${activo ? 'border-2 border-hc-blue-600 bg-hc-blue-50' : 'border border-hc-n-200 bg-hc-n-0'}`}>
                <input type="radio" name="pago" value={metodo.id} checked={activo} disabled={bloqueado} onChange={() => form.setMetodoPago(metodo.id)} className="sr-only" />
                <IconoFigma src={metodo.icono} size={20} className={metodo.color} />
                <span className="text-[14px] font-semibold text-hc-n-900">{t(`checkout.f.${metodo.titulo}`)}</span>
                <span className="text-[12px] text-hc-n-600">{proximamente ? t('checkout.f.proximamente') : t(`checkout.f.${metodo.subtitulo}`, { numero: destinoSinpeVisible(form.sinpeDestino) })}</span>
              </label>
            )
          })}
        </div>
        {METODOS.length > 1 && bloqueadoAviso(rapido, t)}
        {form.metodoPago === PAGO_EFECTIVO && <NotaEfectivo />}
      </div>
    )
  }

  return (
    <div role="radiogroup" aria-label={t('checkout.paymentMethod')} className="flex flex-col gap-3">
      {METODOS.map((metodo) => {
        const activo = form.metodoPago === metodo.id
        const proximamente = metodoProximamente(metodo.id, form.sinpeManualHabilitado, form.tarjetaOnvoHabilitada)
            const bloqueado = proximamente || (metodo.id === PAGO_EFECTIVO && rapido)
        const esPrincipal = metodo.id !== 'EFECTIVO' && !proximamente
        return (
          <div key={metodo.id} className={`flex flex-col gap-3 rounded-[14px] p-[14px] leading-[normal] ${activo ? 'border-2 border-hc-blue-600 bg-hc-blue-50' : 'border border-hc-n-200 bg-hc-n-0'} ${bloqueado ? 'opacity-45' : ''}`}>
            <label className={`flex items-center gap-3 ${bloqueado ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
              <input
                type="radio"
                name="pago"
                value={metodo.id}
                checked={activo}
                disabled={bloqueado}
                onChange={() => form.setMetodoPago(metodo.id)}
                className="size-[22px] shrink-0 appearance-none rounded-full border-[1.5px] border-hc-n-400 bg-hc-n-0 checked:border-[6px] checked:border-hc-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hc-blue-600"
              />
              <IconoFigma src={metodo.icono} size={20} className={metodo.color} />
              <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <span className="text-[14px] font-semibold text-hc-n-900">{t(`checkout.f.${metodo.titulo}`)}</span>
                <span className="text-[12px] text-hc-n-600">{proximamente ? t('checkout.f.proximamente') : t(`checkout.f.${metodo.subtitulo}`, { numero: destinoSinpeVisible(form.sinpeDestino) })}</span>
              </span>
              {esPrincipal && METODOS.length > 1 && <span className="shrink-0 rounded-full bg-hc-success-bg px-[7px] py-[2px] text-[10px] font-semibold text-hc-success-text">{t('checkout.f.masUsado')}</span>}
            </label>
            {bloqueado && <p className="text-[12px] leading-4 text-hc-warning">{t('checkout.f.efectivoNoRapido')}</p>}
            {metodo.id === PAGO_EFECTIVO && activo && <NotaEfectivo />}
          </div>
        )
      })}
    </div>
  )
}

function bloqueadoAviso(rapido: boolean, t: (clave: string) => string) {
  if (!rapido) return null
  return <p className="text-[12px] leading-4 text-hc-warning">{t('checkout.f.efectivoNoRapido')}</p>
}

function NotaEfectivo() {
  const { t } = useTranslation()
  return <p className="rounded-[8px] bg-hc-warning-bg px-3 py-2 text-[12px] leading-4 text-hc-warning">{t('checkout.f.efectivoNota')}</p>
}

type CodigosCheckoutProps = {
  codigos: CodigosPedido
  token: string | null
  descuento: number
  giftCard: number
}

/** Tarjeta de regalo o cupón en un solo campo con «Aplicar» (Figma `55:2220` válida, `55:2284` inválida). */
export function CodigosCheckout({ codigos, token, descuento, giftCard }: CodigosCheckoutProps) {
  const { t } = useTranslation()
  const esGift = codigos.gcEstado === 'valid'
  const estado = esGift ? 'valid' : codigos.cuponEstado
  return (
    <TarjetaCodigos titulo={t(token ? 'checkout.codigo.unicoTitulo' : 'checkout.codigo.cuponTitulo')}>
      <CampoCodigo
        valor={codigos.cuponInput}
        estado={estado}
        placeholder={t(token ? 'checkout.codigo.unicoPlaceholder' : 'checkout.codigo.cuponPlaceholder')}
        ariaLabel={t(token ? 'checkout.codigo.unicoAria' : 'checkout.codigo.cuponAria')}
        maxLength={30}
        onCambiar={token ? codigos.cambiarCodigo : codigos.cambiarCupon}
        onAplicar={token ? codigos.aplicarCodigo : codigos.validarCupon}
        onQuitar={() => codigos.cambiarCodigo('')}
        invalido={{ titulo: codigos.cuponError || t(token ? 'checkout.codigo.unicoInvalido' : 'checkout.codigo.cuponInvalidoTitulo') }}
        detalleValido={esGift ? (
          <>
            <TituloValido texto={t('checkout.codigo.giftValidoTitulo')} />
            <LineaCodigo etiqueta={t('checkout.codigo.saldoDisponible')} valor={formatPrice(codigos.gcSaldo)} />
            <LineaCodigo etiqueta={t('checkout.codigo.seAplica')} valor={formatoRebaja(giftCard)} rebaja />
            <LineaCodigo etiqueta={t('checkout.codigo.saldoRestante')} valor={formatPrice(saldoRestanteGiftCard(codigos.gcSaldo, giftCard))} />
          </>
        ) : (
          <>
            <TituloValido texto={t('checkout.codigo.cuponValidoTitulo')} />
            <LineaCodigo etiqueta={t('checkout.codigo.cuponDescuento', { porcentaje: codigos.cuponDescuento })} valor={formatoRebaja(descuento)} rebaja />
          </>
        )}
        t={t}
      />
    </TarjetaCodigos>
  )
}

type ResumenPagoMovilProps = {
  paquetes: PaqueteCarrito[]
  unidades: number
  subtotal: number
  envio: number
  envioVaria: boolean
  descuento: number
  cuponPorcentaje: number
  giftCard: number
  codigos: CodigosPedido
  token: string | null
}

/** "Resumen · 4 productos en 3 paquetes" con "¿Tenés un cupón?" (Figma `29:1408`). */
export function ResumenPagoMovil({ paquetes, unidades, subtotal, envio, envioVaria, descuento, cuponPorcentaje, giftCard, codigos, token }: ResumenPagoMovilProps) {
  const { t } = useTranslation()
  const [abierto, setAbierto] = useState(true)
  const [codigosAbiertos, setCodigosAbiertos] = useState(Boolean(codigos.cuponCodigo || codigos.gcCodigo))
  return (
    <>
    {token && (
      <>
        <p className="text-[12px] leading-4 text-hc-n-600">{t('checkout.f.sesionGift')}</p>
        <CodigosCheckout codigos={codigos} token={token} descuento={descuento} giftCard={giftCard} />
      </>
    )}
    <section className="flex flex-col gap-[10px] rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px] leading-[normal]">
      <div className="flex items-center gap-2 font-semibold">
        <h2 className="min-w-0 flex-1 font-sans text-[14px] tracking-normal text-hc-n-900">
          {t('checkout.f.resumenTitulo', { productos: t('checkout.f.productosN', { count: unidades }), paquetes: t('checkout.f.paquetesN', { count: paquetes.length }) })}
        </h2>
        <button type="button" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto} className="shrink-0 text-[12px] text-hc-blue-600">
          {abierto ? t('checkout.f.ocultar') : t('checkout.f.ver')}
        </button>
      </div>
      {abierto && paquetes.map((paquete) => (
        <div key={paquete.clave} className="flex flex-col gap-[2px]">
          <div className="flex items-start justify-between text-[13px] font-semibold text-hc-n-900">
            <p>{paquete.negocio}</p>
            <p>{formatPrice(paquete.subtotal)}</p>
          </div>
          <div className="flex items-start justify-between gap-2 text-[12px] text-hc-n-600">
            <p>{t('cart.paqueteProductos', { count: paquete.items.length })}{paquete.metodo ? ` · ${t(`checkout.f.metodoResumen.${paquete.metodo}`)}` : ''}</p>
            <p className="shrink-0">{paquete.envioVaria ? t('checkout.f.envioVariaLinea') : t('cart.envioDe', { precio: formatPrice(paquete.envio) })}</p>
          </div>
        </div>
      ))}
      <div className="h-px bg-hc-n-200" />
      <div className="flex items-start justify-between text-[13px]">
        <p className="font-medium text-hc-n-600">{t('checkout.f.productosResumen')}</p>
        <p className="font-semibold text-hc-n-900">{formatPrice(subtotal)}</p>
      </div>
      <div className="flex items-start justify-between text-[13px]">
        <p className="font-medium text-hc-n-600">{t('cart.envioLinea', { count: paquetes.length })}</p>
        <p className="font-semibold text-hc-n-900">{envioVaria && envio === 0 ? t('checkout.f.varia') : formatPrice(envio)}</p>
      </div>
      {descuento > 0 && (
        <div className="flex items-start justify-between text-[13px]">
          <p className="font-medium text-hc-n-600">{t('checkout.codigo.lineaDescuento', { porcentaje: cuponPorcentaje })}</p>
          <p className="font-semibold text-hc-success-text">{formatoRebaja(descuento)}</p>
        </div>
      )}
      {giftCard > 0 && (
        <div className="flex items-start justify-between text-[13px]">
          <p className="font-medium text-hc-n-600">{t('checkout.codigo.lineaGift', { codigo: codigos.gcCodigo ?? '' })}</p>
          <p className="font-semibold text-hc-success-text">{formatoRebaja(giftCard)}</p>
        </div>
      )}
      <p className="text-[11px] leading-[15px] text-hc-n-600">{giftCard > 0 ? t('checkout.codigo.notaRestante') : t('cart.notaResumenEscritorio')}</p>
      {!token && (
        <button type="button" onClick={() => setCodigosAbiertos((v) => !v)} aria-expanded={codigosAbiertos} className="flex items-center gap-[6px] text-left text-[13px] font-semibold text-hc-blue-600">
          <IconoFigma src={ICONOS_CHECKOUT.cupon} size={14} className="text-hc-success" />
          {t('checkout.f.tienesCupon')}
        </button>
      )}
    </section>
    {!token && codigosAbiertos && <CodigosCheckout codigos={codigos} token={token} descuento={descuento} giftCard={giftCard} />}
    </>
  )
}

/** Consentimiento de tratamiento de datos (Ley 8968). Obligatorio; Figma no lo dibuja. */
/** M4: casilla de factura electrónica del checkout (estado compartido con el payload del pago). */
export function FacturaElectronicaCheckout() {
  const [marcado, cambiar] = useFacturaElectronica()
  return <FacturaElectronicaCheck marcado={marcado} onCambiar={cambiar} contexto="checkout" />
}

export function ConsentimientoDatos({ marcado, onCambiar, error }: { marcado: boolean; onCambiar: (valor: boolean) => void; error?: boolean }) {
  const { t } = useTranslation()
  return (
    <label className={`flex cursor-pointer items-start gap-2 rounded-[12px] border p-3 leading-[normal] ${error && !marcado ? 'border-hc-danger' : 'border-hc-n-200'} bg-hc-n-0`}>
      <input type="checkbox" checked={marcado} onChange={(e) => onCambiar(e.target.checked)} className="mt-[2px] size-4 shrink-0 accent-hc-blue-600" />
      <span className="text-[11px] leading-[15px] text-hc-n-600">
        {t('checkout.f.consentimiento')}{' '}
        <Link to="/privacidad" target="_blank" rel="noopener noreferrer" className="font-semibold text-hc-blue-600">{t('checkout.f.politicaPrivacidad')}</Link>
        {' '}{t('checkout.f.consentimientoY')}{' '}
        <Link to="/cookies" target="_blank" rel="noopener noreferrer" className="font-semibold text-hc-blue-600">{t('checkout.f.politicaCookies')}</Link>.
      </span>
    </label>
  )
}
