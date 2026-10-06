import { useTranslation } from 'react-i18next'
import AvisoVariosEmprendimientos from '@/components/comprador/AvisoVariosEmprendimientos'
import IconoFigma from '@/components/comprador/IconoFigma'
import { formatPrice } from '@/utils/format'
import { Campo, CampoSelector, CampoTexto } from './PiezasCheckout'
import { WHATSAPP, bodegaRetiroDePaquete, opcionesEnvio } from './checkoutHelpers'
import { ICONOS_CHECKOUT } from './iconosCheckout'
import { useDivisionTerritorial } from '@/utils/useDivisionTerritorial'
import { PROVINCIAS_CR, cantonesDeProvincia } from './ubicacionesCR'
import type { OpcionEnvio, PaqueteCheckout } from './checkoutHelpers'
import type { CheckoutFormState } from './useCheckoutForm'

/** Claves i18n del título y subtítulo de cada método de envío (Figma `37:1689`–`37:1718`). */
const CLAVES_OPCION: Record<string, { titulo: string; sub?: string }> = {
  ENVIO_NORMAL_GAM: { titulo: 'envioNormal', sub: 'envioNormalSub' },
  ENVIO_NORMAL_FUERA_GAM: { titulo: 'envioNormal', sub: 'envioNormalFueraSub' },
  ENVIO_RAPIDO: { titulo: 'envioRapido', sub: 'envioRapidoSub' },
  ENCOMIENDA_PROPIA: { titulo: 'encomienda', sub: 'encomiendaSub' },
  RETIRO_EN_TIENDA: { titulo: 'retiro' },
}

function Precio({ opcion, escritorio }: { opcion: OpcionEnvio; escritorio: boolean }) {
  const { t } = useTranslation()
  const tamano = escritorio ? 'text-[13px]' : 'text-[14px]'
  if (opcion.varia) return <span className={`shrink-0 font-semibold text-hc-n-900 ${tamano}`}>{t('checkout.f.varia')}</span>
  if (opcion.precio === 0) return <span className={`shrink-0 font-semibold text-hc-success-text ${tamano}`}>{t('checkout.f.gratis')}</span>
  return <span className={`shrink-0 font-semibold text-hc-n-900 ${tamano}`}>{formatPrice(opcion.precio)}</span>
}

const CLASE_RADIO = 'size-5 shrink-0 appearance-none rounded-full border-[1.5px] border-hc-n-400 bg-hc-n-0 checked:border-[6px] checked:border-hc-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hc-blue-600'

type OpcionProps = {
  opcion: OpcionEnvio
  nombre: string
  activa: boolean
  conNotaRetiro: boolean
  onElegir: () => void
}

function EtiquetaRetiro() {
  const { t } = useTranslation()
  return <span className="rounded-[6px] bg-hc-warning-bg px-[6px] py-[2px] font-mono text-[9px] font-medium leading-[normal] text-hc-warning">{t('checkout.f.retiroEtiqueta')}</span>
}

function NotaDistancia({ escritorio }: { escritorio: boolean }) {
  const { t } = useTranslation()
  return (
    <div className={`flex items-start gap-[6px] rounded-[8px] bg-hc-warning-bg px-2 py-[6px] ${escritorio ? 'w-full' : ''}`}>
      <IconoFigma src={ICONOS_CHECKOUT.avisoUbicacionRetiro} size={14} className="text-hc-warning" />
      <p className="min-w-0 flex-1 text-[11px] leading-[15px] text-hc-warning">{t('checkout.f.retiroNota')}</p>
    </div>
  )
}

/** Método de envío como fila de lista (móvil, Figma `37:1689`). */
function OpcionFila({ opcion, nombre, activa, conNotaRetiro, onElegir }: OpcionProps) {
  const { t } = useTranslation()
  const claves = CLAVES_OPCION[opcion.value] ?? { titulo: 'envioNormal' }
  const esRetiro = opcion.value === 'RETIRO_EN_TIENDA'
  return (
    <label className={`flex cursor-pointer items-center gap-[10px] border-t border-hc-n-200 px-[14px] py-[11px] leading-[normal] ${activa ? 'bg-hc-blue-50' : ''}`}>
      <input type="radio" name={nombre} value={opcion.value} checked={activa} onChange={onElegir} className={CLASE_RADIO} />
      <span className="flex min-w-0 flex-1 flex-col items-start gap-[2px]">
        <span className="flex flex-wrap items-center gap-x-[6px] gap-y-1">
          <span className={`text-[14px] text-hc-n-900 ${activa ? 'font-semibold' : 'font-medium'}`}>{t(`checkout.f.${claves.titulo}`)}</span>
          {esRetiro && <EtiquetaRetiro />}
        </span>
        {claves.sub && <span className="w-full text-[12px] leading-4 text-hc-n-600">{t(`checkout.f.${claves.sub}`)}</span>}
        {esRetiro && opcion.sub && <span className="w-full text-[12px] leading-4 text-hc-n-600">{opcion.sub}</span>}
        {esRetiro && conNotaRetiro && <NotaDistancia escritorio={false} />}
      </span>
      <Precio opcion={opcion} escritorio={false} />
    </label>
  )
}

/** Método de envío como pastilla (escritorio, Figma `38:1553`). */
function OpcionPastilla({ opcion, nombre, activa, onElegir }: OpcionProps) {
  const { t } = useTranslation()
  const claves = CLAVES_OPCION[opcion.value] ?? { titulo: 'envioNormal' }
  const esRetiro = opcion.value === 'RETIRO_EN_TIENDA'
  const marco = activa ? 'border-[1.5px] border-hc-blue-600 bg-hc-blue-50' : 'border border-hc-n-200 bg-hc-n-0'
  return (
    <label className={`flex cursor-pointer items-center gap-2 rounded-[10px] py-[10px] pl-3 pr-[14px] leading-[normal] ${marco}`}>
      <input type="radio" name={nombre} value={opcion.value} checked={activa} onChange={onElegir} className={`${CLASE_RADIO} !size-[18px]`} />
      <span className={`whitespace-nowrap text-[13px] text-hc-n-900 ${activa ? 'font-semibold' : 'font-medium'}`}>{t(`checkout.f.${claves.titulo}`)}</span>
      <Precio opcion={opcion} escritorio />
      {esRetiro && <EtiquetaRetiro />}
    </label>
  )
}

type PaqueteEntregaProps = {
  paquete: PaqueteCheckout
  numero: number
  escritorio: boolean
  metodo: string
  varios: boolean
  destinoGAM: boolean
  onElegir: (valor: string) => void
}

function PaqueteEntrega({ paquete, numero, escritorio, metodo, varios, destinoGAM, onElegir }: PaqueteEntregaProps) {
  const { t } = useTranslation()
  const normalDescartado = destinoGAM ? 'ENVIO_NORMAL_FUERA_GAM' : 'ENVIO_NORMAL_GAM'
  const opciones = opcionesEnvio(bodegaRetiroDePaquete(paquete)).filter((o) => o.value !== normalDescartado && !(o.value === 'ENVIO_RAPIDO' && !destinoGAM))
  const titulo = t('cart.paquete', { n: numero, negocio: paquete.empresaNombre || paquete.bodegaNombre })
  const conteo = t('cart.paqueteProductos', { count: paquete.items.length })
  const nombre = `envio-${paquete.bodegaId}`

  if (escritorio) {
    return (
      <section className="flex flex-col gap-[10px] rounded-[12px] border border-hc-n-200 bg-hc-n-0 p-[14px]">
        <div className="flex items-center gap-2 leading-[normal]">
          <IconoFigma src={ICONOS_CHECKOUT.paqueteTienda} size={16} className="text-hc-n-900" />
          <h3 className="font-sans text-[14px] font-semibold tracking-normal text-hc-n-900">{titulo}</h3>
          <p className="text-[12px] text-hc-n-600">{conteo}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {opciones.map((opcion) => (
            <OpcionPastilla key={opcion.value} opcion={opcion} nombre={nombre} activa={metodo === opcion.value} conNotaRetiro={varios} onElegir={() => onElegir(opcion.value)} />
          ))}
        </div>
        {varios && opciones.some((o) => o.value === 'RETIRO_EN_TIENDA') && <NotaDistancia escritorio />}
      </section>
    )
  }

  return (
    <section className="flex flex-col overflow-hidden rounded-[14px] border border-hc-n-200 bg-hc-n-0">
      <header className="flex items-center gap-2 bg-hc-n-50 px-[14px] py-3 leading-[normal]">
        <IconoFigma src={ICONOS_CHECKOUT.paqueteTienda} size={18} className="text-hc-n-900" />
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="font-sans text-[14px] font-semibold tracking-normal text-hc-n-900">{titulo}</h3>
          <p className="flex items-center gap-1 text-[12px] text-hc-n-600">
            <IconoFigma src={ICONOS_CHECKOUT.paqueteOrigen} size={12} className="text-hc-n-400" />
            {conteo}
          </p>
        </div>
      </header>
      {opciones.map((opcion) => (
        <OpcionFila key={opcion.value} opcion={opcion} nombre={nombre} activa={metodo === opcion.value} conNotaRetiro={varios} onElegir={() => onElegir(opcion.value)} />
      ))}
    </section>
  )
}

/** Atajo "Envío internacional" por WhatsApp (Figma `52:2261`). */
function AtajoInternacional() {
  const { t } = useTranslation()
  return (
    <a
      href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(t('checkout.f.waInternacional'))}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('checkout.envioInternacionalAria')}
      className="flex items-center gap-[10px] rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px] leading-[normal]"
    >
      <IconoFigma src={ICONOS_CHECKOUT.envioInternacional} size={20} className="text-hc-blue-600" />
      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span className="text-[14px] font-semibold text-hc-n-900">{t('checkout.envioInternacional')}</span>
        <span className="text-[12px] leading-[15px] text-hc-n-600">{t('checkout.envioInternacionalHint')}</span>
      </span>
      <IconoFigma src={ICONOS_CHECKOUT.chevronDerecha} size={16} className="text-hc-n-500" />
    </a>
  )
}

type PasoEntregaProps = {
  form: CheckoutFormState
  escritorio: boolean
  /** Elegir método: aplica la regla "envío rápido exige pago previo" del checkout original. */
  onElegirEnvio: (bodegaId: string, valor: string) => void
}

/** Dirección de entrega (provincia, cantón, señas) y entrega por paquete. Figma `29:1248`, `51:2000`, `30:2420`. */
export default function PasoEntrega({ form, escritorio, onElegirEnvio }: PasoEntregaProps) {
  const { t } = useTranslation()
  const territorio = useDivisionTerritorial()
  const { paquetes, metodoEnvioPorPaquete, necesitaDireccion, costoEnvio, envioVaria } = form
  const varios = paquetes.length > 1
  const errorDireccion = form.direccionDirty ? form.direccionError : ''
  const provincias = territorio.listo ? territorio.provincias : PROVINCIAS_CR
  const cantones = territorio.listo ? territorio.cantonesDe(form.provincia) : cantonesDeProvincia(form.provincia)
  const distritos = territorio.distritosDe(form.provincia, form.canton)

  const direccion = necesitaDireccion && (
    <div className={escritorio ? 'flex flex-col gap-[14px]' : 'flex flex-col gap-3'}>
      {!escritorio && <h2 className="font-display text-[16px] font-semibold leading-5 tracking-normal text-hc-n-900">{t('checkout.f.direccionTitulo')}</h2>}
      {territorio.error && <p className="text-[12px] leading-[15px] text-hc-n-600" role="status">{t('checkout.f.divisionNoDisponible')}</p>}
      <div className={`flex items-start ${escritorio ? 'gap-[14px]' : 'gap-[10px]'}`}>
        <Campo etiqueta={t('checkout.f.provincia')} error={form.direccionDirty && !form.provincia ? t('checkout.f.provinciaRequerida') : ''}>
          {({ id, describedBy }) => (
            <CampoSelector id={id} describedBy={describedBy} escritorio={escritorio} valor={form.provincia} opciones={provincias} placeholder={t('checkout.f.elegir')} onCambiar={form.setProvincia} />
          )}
        </Campo>
        <Campo etiqueta={t('checkout.f.canton')} error={form.direccionDirty && form.provincia && !form.canton ? t('checkout.f.cantonRequerido') : ''}>
          {({ id, describedBy }) => (
            <CampoSelector id={id} describedBy={describedBy} escritorio={escritorio} valor={form.canton} opciones={cantones} placeholder={t('checkout.f.elegir')} onCambiar={form.setCanton} deshabilitado={!form.provincia} />
          )}
        </Campo>
      </div>
      <Campo etiqueta={t('checkout.f.distrito')}>
        {({ id, describedBy }) => (
          <CampoSelector id={id} describedBy={describedBy} escritorio={escritorio} valor={form.distrito} opciones={distritos} placeholder={t('checkout.f.elegir')} onCambiar={form.setDistrito} deshabilitado={!form.canton || distritos.length === 0} />
        )}
      </Campo>
      <Campo etiqueta={t('checkout.f.senas')} error={errorDireccion}>
        {({ id, describedBy }) => (
          <CampoTexto
            id={id}
            describedBy={describedBy}
            escritorio={escritorio}
            valor={form.direccion}
            maxLength={200}
            autoComplete="street-address"
            error={Boolean(errorDireccion)}
            onCambiar={(valor) => {
              form.setDireccion(valor)
              if (form.direccionDirty) form.setDireccionError(form.validateAddress(valor))
            }}
            onBlur={() => { form.setDireccionDirty(true); form.setDireccionError(form.validateAddress(form.direccion)) }}
          />
        )}
      </Campo>
    </div>
  )

  const paquetesEnvio = (
    <div className={`flex flex-col gap-3 ${escritorio ? '' : 'pt-2'}`}>
      <div className="flex flex-col gap-1 leading-[normal]">
        <h2 className={`font-display font-bold tracking-normal text-hc-n-900 ${escritorio ? 'text-[16px] leading-[20px]' : 'text-[18px] leading-[23px]'}`}>
          {t('checkout.f.comoLlega', { count: paquetes.length })}
        </h2>
        {varios && !escritorio && <p className="text-[13px] leading-[18px] text-hc-n-600">{t('checkout.f.tiendasTexto', { count: paquetes.length })}</p>}
      </div>
      <AvisoVariosEmprendimientos cantidadNegocios={paquetes.length} />
      {paquetes.map((paquete, indice) => (
        <PaqueteEntrega
          key={paquete.bodegaId}
          paquete={paquete}
          numero={indice + 1}
          escritorio={escritorio}
          varios={varios}
          destinoGAM={form.destinoGAM}
          metodo={metodoEnvioPorPaquete[paquete.bodegaId] ?? ''}
          onElegir={(valor) => onElegirEnvio(paquete.bodegaId, valor)}
        />
      ))}
      <p className="text-[12px] leading-4 text-hc-n-600">{escritorio ? t('checkout.f.encomiendaNotaEscritorio') : t('checkout.f.retiroNotaPie')}</p>
      <AtajoInternacional />
      <div className="flex items-center justify-between rounded-[12px] bg-hc-n-100 px-[14px] py-3 text-[14px] leading-[normal] text-hc-n-900">
        <p className="font-medium">{t('cart.envioTotal', { count: paquetes.length })}</p>
        <p className="font-semibold">{envioVaria && costoEnvio === 0 ? t('checkout.f.varia') : formatPrice(costoEnvio)}</p>
      </div>
    </div>
  )

  return (
    <div className={`flex flex-col ${escritorio ? 'gap-[14px]' : 'gap-4'}`}>
      {direccion}
      {paquetesEnvio}
    </div>
  )
}
