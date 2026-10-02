import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import type { PaqueteCarrito } from '@/pages/carrito/cartHelpers'
import { CampoCodigo, LineaCodigo, TarjetaCodigos, TituloValido } from './CodigoDescuento'
import { formatoRebaja, saldoRestanteGiftCard } from './codigoDescuentoHelpers'
import { formatPrice } from '@/utils/format'
import { Campo, CampoTexto } from './PiezasCheckout'
import { SINPE_NUMERO, copiarNumeroSinpe } from './checkoutHelpers'
import { ICONOS_CHECKOUT } from './iconosCheckout'
import type { CheckoutFormState } from './useCheckoutForm'
import type { CodigosPedido } from './useCodigosPedido'

type MetodoId = 'SINPE' | 'TILOPAY' | 'EFECTIVO'

/** El color de cada ícono es el del trazo exportado de Figma (`29:1373`, `29:1394`, `29:1402`). */
const METODOS: { id: MetodoId; icono: string; color: string; titulo: string; subtitulo: string; subtituloEscritorio: string }[] = [
  { id: 'SINPE', icono: ICONOS_CHECKOUT.pagoSinpe, color: 'text-hc-blue-600', titulo: 'sinpe', subtitulo: 'sinpeSub', subtituloEscritorio: 'sinpeSub' },
  { id: 'TILOPAY', icono: ICONOS_CHECKOUT.pagoTarjeta, color: 'text-hc-n-600', titulo: 'tarjetaMovil', subtitulo: 'tarjetaSubMovil', subtituloEscritorio: 'tarjetaSub' },
  { id: 'EFECTIVO', icono: ICONOS_CHECKOUT.pagoEfectivo, color: 'text-hc-n-600', titulo: 'efectivo', subtitulo: 'efectivoSub', subtituloEscritorio: 'efectivoSub' },
]

const TAMANO_MAXIMO_COMPROBANTE = 5 * 1024 * 1024

/** Instrucciones SINPE y selector del comprobante (Figma `29:1379`). El comprobante se sube al confirmar el pedido. */
function InstruccionesSinpe({ form, total, token }: { form: CheckoutFormState; total: number; token: string | null }) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    if (await copiarNumeroSinpe()) {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1_800)
    }
  }
  function elegirArchivo(archivo: File | undefined) {
    if (!archivo) return
    if (archivo.size > TAMANO_MAXIMO_COMPROBANTE) {
      form.setSinpeImagen(null)
      form.setSinpeImagenErr(t('checkout.f.comprobanteGrande'))
      return
    }
    form.setSinpeImagenErr('')
    form.setSinpeImagen(archivo)
  }

  return (
    <div className="flex flex-col gap-[10px] rounded-[10px] bg-hc-n-0 p-3 leading-[normal]">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[13px] text-hc-n-600">{t('checkout.f.sinpePaso1', { monto: formatPrice(total) })}</p>
        <p className="font-display text-[15px] font-bold text-hc-n-900">{SINPE_NUMERO}</p>
        <button type="button" onClick={copiar} aria-label={t('checkout.f.copiarSinpe')} className="relative flex size-4 items-center justify-center text-hc-blue-600 after:absolute after:-inset-2">
          <IconoFigma src={ICONOS_CHECKOUT.copiar} size={16} />
        </button>
        {copiado && <span role="status" className="text-[12px] font-semibold text-hc-success">{t('checkout.f.copiado')}</span>}
      </div>
      <p className="text-[13px] leading-[18px] text-hc-n-600">{t('checkout.f.sinpePaso2')}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => elegirArchivo(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center justify-center gap-2 rounded-[10px] border border-dashed border-hc-blue-600 bg-hc-n-50 py-3 text-[14px] font-semibold text-hc-blue-600"
      >
        <IconoFigma src={ICONOS_CHECKOUT.subirComprobante} size={18} />
        {form.sinpeImagen ? t('checkout.f.comprobanteElegido', { nombre: form.sinpeImagen.name }) : t('checkout.f.subirComprobante')}
      </button>
      {form.sinpeImagenErr && <p role="alert" className="text-[12px] leading-4 text-hc-danger">{form.sinpeImagenErr}</p>}
      <DatosRemitente form={form} token={token} />
    </div>
  )
}

/** Cédula (y nombre si hay sesión) que SINPE exige para identificar al remitente; no están en Figma. */
function DatosRemitente({ form, token }: { form: CheckoutFormState; token: string | null }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-3 border-t border-hc-n-200 pt-3">
      {token && (
        <Campo etiqueta={t('checkout.f.nombre')} error={form.sinpeNombreErr}>
          {({ id, describedBy }) => (
            <CampoTexto id={id} describedBy={describedBy} escritorio autoComplete="name" valor={form.sinpeNombre} error={Boolean(form.sinpeNombreErr)} onCambiar={(v) => { form.setSinpeNombre(v); if (form.sinpeNombreErr) form.setSinpeNombreErr('') }} />
          )}
        </Campo>
      )}
      <Campo etiqueta={t('checkout.f.cedula')} error={form.sinpeCedulaErr}>
        {({ id, describedBy }) => (
          <CampoTexto id={id} describedBy={describedBy} escritorio inputMode="numeric" maxLength={12} valor={form.sinpeCedula} error={Boolean(form.sinpeCedulaErr)} onCambiar={(v) => { form.setSinpeCedula(v.replace(/\D/g, '')); if (form.sinpeCedulaErr) form.setSinpeCedulaErr('') }} />
        )}
      </Campo>
    </div>
  )
}

type MetodosPagoProps = {
  form: CheckoutFormState
  token: string | null
  total: number
  escritorio: boolean
}

/** Métodos de pago: lista en móvil (Figma `29:1370`) y tres tarjetas en escritorio (`30:2473`). */
export function MetodosPago({ form, token, total, escritorio }: MetodosPagoProps) {
  const { t } = useTranslation()
  const rapido = Object.values(form.metodoEnvioPorPaquete).includes('ENVIO_RAPIDO')

  if (escritorio) {
    return (
      <div className="flex flex-col gap-3">
        <div role="radiogroup" aria-label={t('checkout.paymentMethod')} className="flex items-start gap-3">
          {METODOS.map((metodo) => {
            const activo = form.metodoPago === metodo.id
            const bloqueado = metodo.id === 'EFECTIVO' && rapido
            return (
              <label key={metodo.id} className={`flex min-w-px flex-1 flex-col items-start gap-1 rounded-[12px] p-[14px] leading-[normal] ${bloqueado ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'} ${activo ? 'border-2 border-hc-blue-600 bg-hc-blue-50' : 'border border-hc-n-200 bg-hc-n-0'}`}>
                <input type="radio" name="pago" value={metodo.id} checked={activo} disabled={bloqueado} onChange={() => form.setMetodoPago(metodo.id)} className="sr-only" />
                <IconoFigma src={metodo.icono} size={20} className={metodo.color} />
                <span className="text-[14px] font-semibold text-hc-n-900">{t(`checkout.f.${metodo.id === 'SINPE' ? 'sinpe' : metodo.id === 'TILOPAY' ? 'tarjeta' : 'efectivo'}`)}</span>
                <span className="text-[12px] text-hc-n-500">{t(`checkout.f.${metodo.subtituloEscritorio}`, { numero: SINPE_NUMERO })}</span>
              </label>
            )
          })}
        </div>
        {bloqueadoAviso(rapido, t)}
        {form.metodoPago === 'SINPE' && <InstruccionesSinpe form={form} total={total} token={token} />}
        {form.metodoPago === 'EFECTIVO' && <NotaEfectivo />}
      </div>
    )
  }

  return (
    <div role="radiogroup" aria-label={t('checkout.paymentMethod')} className="flex flex-col gap-3">
      {METODOS.map((metodo) => {
        const activo = form.metodoPago === metodo.id
        const bloqueado = metodo.id === 'EFECTIVO' && rapido
        const esSinpe = metodo.id === 'SINPE'
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
                {!(esSinpe && activo) && <span className="text-[12px] text-hc-n-500">{t(`checkout.f.${metodo.subtitulo}`, { numero: SINPE_NUMERO })}</span>}
              </span>
              {esSinpe && <span className="shrink-0 rounded-full bg-hc-success-bg px-[7px] py-[2px] text-[10px] font-semibold text-hc-success">{t('checkout.f.masUsado')}</span>}
            </label>
            {bloqueado && <p className="text-[12px] leading-4 text-hc-warning">{t('checkout.f.efectivoNoRapido')}</p>}
            {esSinpe && activo && <InstruccionesSinpe form={form} total={total} token={token} />}
            {metodo.id === 'EFECTIVO' && activo && <NotaEfectivo />}
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

/** Tarjeta de regalo (con sesión) y cupón: Figma `55:2220` (válida) y `55:2284` (inválida). */
export function CodigosCheckout({ codigos, token, descuento, giftCard }: CodigosCheckoutProps) {
  const { t } = useTranslation()
  return (
    <TarjetaCodigos titulo={t(token ? 'checkout.codigo.titulo' : 'checkout.codigo.cuponTitulo')}>
      {token && (
        <CampoCodigo
          valor={codigos.gcInput}
          estado={codigos.gcEstado}
          placeholder={t('checkout.codigo.giftPlaceholder')}
          ariaLabel={t('checkout.codigo.giftAria')}
          maxLength={30}
          onCambiar={codigos.cambiarGiftCard}
          onAplicar={codigos.validarGiftCard}
          onQuitar={codigos.quitarGiftCard}
          invalido={{ titulo: t('checkout.codigo.giftInvalidoTitulo'), ayuda: t('checkout.codigo.giftInvalidoAyuda') }}
          detalleValido={(
            <>
              <TituloValido texto={t('checkout.codigo.giftValidoTitulo')} />
              <LineaCodigo etiqueta={t('checkout.codigo.saldoDisponible')} valor={formatPrice(codigos.gcSaldo)} />
              <LineaCodigo etiqueta={t('checkout.codigo.seAplica')} valor={formatoRebaja(giftCard)} rebaja />
              <LineaCodigo etiqueta={t('checkout.codigo.saldoRestante')} valor={formatPrice(saldoRestanteGiftCard(codigos.gcSaldo, giftCard))} />
            </>
          )}
          t={t}
        />
      )}
      <CampoCodigo
        valor={codigos.cuponInput}
        estado={codigos.cuponEstado}
        placeholder={t('checkout.codigo.cuponPlaceholder')}
        ariaLabel={t('checkout.codigo.cuponAria')}
        maxLength={20}
        onCambiar={codigos.cambiarCupon}
        onAplicar={codigos.validarCupon}
        onQuitar={codigos.quitarCupon}
        invalido={{ titulo: codigos.cuponError || t('checkout.codigo.cuponInvalidoTitulo') }}
        detalleValido={(
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
        <p className="text-[12px] leading-4 text-hc-n-500">{t('checkout.f.sesionGift')}</p>
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
          <div className="flex items-start justify-between gap-2 text-[12px] text-hc-n-500">
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
          <p className="font-semibold text-hc-success">{formatoRebaja(descuento)}</p>
        </div>
      )}
      {giftCard > 0 && (
        <div className="flex items-start justify-between text-[13px]">
          <p className="font-medium text-hc-n-600">{t('checkout.codigo.lineaGift', { codigo: codigos.gcCodigo ?? '' })}</p>
          <p className="font-semibold text-hc-success">{formatoRebaja(giftCard)}</p>
        </div>
      )}
      <p className="text-[11px] leading-[15px] text-hc-n-500">{giftCard > 0 ? t('checkout.codigo.notaRestante') : t('cart.notaResumenEscritorio')}</p>
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
