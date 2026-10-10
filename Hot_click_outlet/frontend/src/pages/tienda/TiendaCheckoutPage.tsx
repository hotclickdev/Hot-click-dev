import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import IconoFigma from '@/components/comprador/IconoFigma'
import EstadoVacio from '@/components/comprador/estados/EstadoVacio'
import { Campo } from '@/pages/checkout/PiezasCheckout'
import { ICONOS_CHECKOUT } from '@/pages/checkout/iconosCheckout'
import tiendaService from '@/services/tiendaService'
import useTiendaStore from '@/store/tiendaStore'
import { formatPrice } from '@/utils/format'
import TiendaCheckoutDireccion from './TiendaCheckoutDireccion'
import TiendaCheckoutMovil from './TiendaCheckoutMovil'
import { metodosPagoVisibles, pagoTrasCambioEnvio } from './tiendaCheckoutPasos'
import {
  METODO_ENVIO_DOMICILIO,
  METODO_ENVIO_RETIRO,
  mensajeErrorCheckout,
} from './tiendaCheckoutValidacion'
import { BotonTienda, CabeceraTarjeta, CLASE_RADIO_TIENDA, CLASE_TARJETA, TituloTienda } from './PiezasTienda'

const METODOS_PAGO = [
  { value: 'SINPE_MOVIL', label: 'SINPE Móvil' },
  { value: 'EFECTIVO', label: 'Efectivo al recibir' },
  { value: 'TRANSFERENCIA', label: 'Transferencia bancaria' },
]

const METODOS_ENVIO = [
  { value: METODO_ENVIO_DOMICILIO, label: 'Envío a domicilio' },
  { value: METODO_ENVIO_RETIRO, label: 'Retiro en tienda' },
]

type FormCheckout = {
  nombreCliente: string
  correoCliente: string
  telefonoCliente: string
  direccionEntrega: string
  metodoPago: string
  metodoEnvio: string
  notas: string
}

/**
 * Checkout de la tienda pública (derivado de Figma: checkout `28:1083` móvil y `30:2410` escritorio): campos
 * con etiqueta de 13, cajas de 12 con ícono, métodos como filas con radio azul, resumen en tarjeta clara y
 * botón rojo. El formulario, la validación y el pedido al API no cambian.
 */
export default function TiendaCheckoutPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { carrito, totalImporte, itemsParaPedido, vaciarCarrito, empresa } = useTiendaStore()
  const [form, setForm] = useState<FormCheckout>({
    nombreCliente: '',
    correoCliente: '',
    telefonoCliente: '',
    direccionEntrega: '',
    metodoPago: 'SINPE_MOVIL',
    metodoEnvio: METODO_ENVIO_DOMICILIO,
    notas: '',
  })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (key: keyof FormCheckout, val: string) => setForm((f) => ({ ...f, [key]: val }))

  useEffect(() => {
    const siguiente = pagoTrasCambioEnvio(form.metodoEnvio, form.metodoPago)
    if (siguiente !== form.metodoPago) set('metodoPago', siguiente)
  }, [form.metodoEnvio, form.metodoPago])

  const enviarPedido = async () => {
    if (carrito.length === 0) return
    const errorForm = mensajeErrorCheckout(form)
    if (errorForm) {
      setError(errorForm)
      return
    }
    setEnviando(true)
    setError(null)
    try {
      const resultado = await tiendaService.crearPedido(slug as string, { ...form, items: itemsParaPedido() }) as { numeroPedido?: string; total?: number }
      vaciarCarrito()
      const qs = new URLSearchParams({ orden: resultado.numeroPedido ?? '' })
      navigate(`/tienda/${slug}/checkout/exito?${qs}`, { replace: true, state: { total: resultado.total } })
    } catch (err: unknown) {
      const data = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: unknown; error?: unknown } } }).response?.data
        : undefined
      const msg = (typeof data?.message === 'string' ? data.message : undefined)
        ?? (typeof data?.error === 'string' ? data.error : undefined)
        ?? 'Error al procesar el pedido. Intenta de nuevo.'
      setError(msg)
    } finally {
      setEnviando(false)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    void enviarPedido()
  }

  if (carrito.length === 0) {
    return (
      <div className="py-10">
        <EstadoVacio
          nivel="h1"
          icono={<IconoFigma src={ICONOS_CHECKOUT.carritoVacio} size={28} />}
          titulo="Este pedido está vacío"
          texto="Agregá productos de esta tienda para finalizar la compra."
          accion={{ texto: 'Volver al catálogo', to: `/tienda/${slug}` }}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1232px] px-4 py-5 lg:py-8">
      <div className="mb-4 flex flex-col gap-1">
        <TituloTienda>Finalizar pedido</TituloTienda>
        <p className="text-[13px] leading-[18px] text-hc-n-600">
          Pedido de {empresa?.nombreComercial ?? slug} en HotClick. No se mezcla con el pedido del marketplace.
        </p>
      </div>
      <TiendaCheckoutMovil
        nombre={form.nombreCliente}
        correo={form.correoCliente}
        telefono={form.telefonoCliente}
        metodoEnvio={form.metodoEnvio}
        metodoPago={form.metodoPago}
        notas={form.notas}
        envios={METODOS_ENVIO}
        pagos={METODOS_PAGO}
        lineas={carrito.flatMap(({ producto, cantidad }) => (
          producto.id == null ? [] : [{
            id: producto.id,
            nombre: producto.nombre,
            cantidad,
            subtotal: producto.precio * cantidad,
          }]
        ))}
        total={totalImporte()}
        enviando={enviando}
        error={error}
        onCampo={set}
        onConfirmar={() => { void enviarPedido() }}
      />
      <form onSubmit={handleSubmit} className="hidden flex-col gap-4 md:flex lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-4">
          <fieldset className={`${CLASE_TARJETA} flex flex-col gap-[14px] p-4`}>
            <legend className="float-left mb-1 w-full font-display text-[16px] font-bold tracking-normal text-hc-n-900">Tus datos</legend>
            <Campo etiqueta="Nombre completo">
              {({ id }) => <Entrada id={id} icono={ICONOS_CHECKOUT.campoUsuario} required autoComplete="name" value={form.nombreCliente} onChange={(v) => set('nombreCliente', v)} placeholder="Juan Pérez" />}
            </Campo>
            <div className="flex flex-col gap-[14px] sm:flex-row">
              <Campo etiqueta="Correo electrónico">
                {({ id }) => <Entrada id={id} icono={ICONOS_CHECKOUT.campoCorreo} required type="email" autoComplete="email" value={form.correoCliente} onChange={(v) => set('correoCliente', v)} placeholder="juan@ejemplo.com" />}
              </Campo>
              <Campo etiqueta="Teléfono">
                {({ id }) => <Entrada id={id} icono={ICONOS_CHECKOUT.campoTelefono} required type="tel" autoComplete="tel" value={form.telefonoCliente} onChange={(v) => set('telefonoCliente', v)} placeholder="8888-8888" />}
              </Campo>
            </div>
          </fieldset>
          <fieldset className={`${CLASE_TARJETA} flex flex-col gap-[14px] p-4`}>
            <legend className="float-left mb-1 w-full font-display text-[16px] font-bold tracking-normal text-hc-n-900">Envío y pago</legend>
            <GrupoOpciones label="Método de envío" name="metodoEnvio" opciones={METODOS_ENVIO} valor={form.metodoEnvio} onChange={(v) => set('metodoEnvio', v)} />
            {form.metodoEnvio === METODO_ENVIO_DOMICILIO && (
              <TiendaCheckoutDireccion value={form.direccionEntrega} onChange={(valor) => set('direccionEntrega', valor)} />
            )}
            <GrupoOpciones label="Método de pago" name="metodoPago" opciones={metodosPagoVisibles(form.metodoEnvio, METODOS_PAGO)} valor={form.metodoPago} onChange={(v) => set('metodoPago', v)} />
            <Campo etiqueta="Notas adicionales">
              {({ id }) => (
                <textarea
                  id={id}
                  value={form.notas}
                  onChange={(e) => set('notas', e.target.value)}
                  placeholder="Instrucciones especiales, horario preferido, etc."
                  rows={2}
                  className={CLASE_AREA}
                />
              )}
            </Campo>
          </fieldset>
        </div>
        <div className="flex flex-col gap-4 lg:sticky lg:top-20">
          <section className={`${CLASE_TARJETA} flex flex-col overflow-hidden`}>
            <CabeceraTarjeta>Resumen</CabeceraTarjeta>
            <div className="flex flex-col gap-2 px-[14px] py-[14px] leading-[normal]">
              {carrito.map(({ producto, cantidad }) => (
                <div key={producto.id} className="flex justify-between gap-4 text-[13px] text-hc-n-600">
                  <span className="truncate">{producto.nombre} × {cantidad}</span>
                  <span className="shrink-0 font-medium text-hc-n-900">{formatPrice(producto.precio * cantidad)}</span>
                </div>
              ))}
              <div className="mt-1 flex items-center justify-between border-t border-hc-n-200 pt-3 text-hc-n-900">
                <span className="text-[15px] font-semibold">Total</span>
                <span className="font-display text-[17px] font-bold">{formatPrice(totalImporte())}</span>
              </div>
            </div>
          </section>
          {error && (
            <p role="alert" className="rounded-[12px] border border-hc-danger/20 bg-hc-danger-bg px-[14px] py-3 text-[13px] leading-[18px] text-hc-danger">{error}</p>
          )}
          <BotonTienda variante="primario" type="submit" disabled={enviando}>
            {enviando ? 'Enviando pedido...' : 'Confirmar pedido'}
          </BotonTienda>
          <BotonTienda variante="secundario" to={`/tienda/${slug}/carrito`}>Volver al pedido</BotonTienda>
        </div>
      </form>
    </div>
  )
}

const CLASE_CAJA = 'flex w-full items-center gap-[10px] rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-[14px] py-[13px] focus-within:border-hc-blue-600 lg:rounded-[10px] lg:py-3'

const CLASE_AREA = 'hc-input-libre w-full resize-none rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-[14px] py-[13px] text-[15px] leading-[20px] text-hc-n-900 outline-none placeholder:text-hc-n-500 focus:border-hc-blue-600 lg:rounded-[10px]'

/** Caja de texto del checkout del Figma (`28:1112`), con `required` nativo como antes. */
function Entrada({
  id, icono, value, onChange, type = 'text', required = false, placeholder, autoComplete,
}: {
  id: string
  icono: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  placeholder?: string
  autoComplete?: string
}) {
  return (
    <div className={CLASE_CAJA}>
      <IconoFigma src={icono} size={18} className="text-hc-n-500 lg:hidden" />
      <input
        id={id}
        required={required}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="hc-input-libre min-w-0 flex-1 bg-transparent text-[15px] leading-[18px] text-hc-n-900 outline-none placeholder:text-hc-n-500"
      />
    </div>
  )
}

/** Opciones como filas de lista con radio azul (Figma `37:1689`). */
function GrupoOpciones({
  label, name, opciones, valor, onChange,
}: {
  label: string
  name: string
  opciones: { value: string; label: string }[]
  valor: string
  onChange: (v: string) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-[6px] leading-[normal]">
      <p className="text-[13px] font-semibold text-hc-n-900">{label}</p>
      <div className="overflow-hidden rounded-[12px] border border-hc-n-200">
        {opciones.map((m) => {
          const activa = valor === m.value
          return (
            <label key={m.value} className={`flex cursor-pointer items-center gap-[10px] border-t border-hc-n-200 px-[14px] py-[13px] first:border-t-0 ${activa ? 'bg-hc-blue-50' : 'bg-hc-n-0'}`}>
              <input type="radio" name={name} value={m.value} checked={activa} onChange={() => onChange(m.value)} className={CLASE_RADIO_TIENDA} />
              <span className={`text-[14px] text-hc-n-900 ${activa ? 'font-semibold' : 'font-medium'}`}>{m.label}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
