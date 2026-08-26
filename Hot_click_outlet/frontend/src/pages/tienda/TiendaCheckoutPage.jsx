import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import tiendaService from '@/services/tiendaService'
import useTiendaStore from '@/store/tiendaStore'
import { formatPrice } from '@/utils/format'
import TiendaCheckoutDireccion from './TiendaCheckoutDireccion'
import {
  METODO_ENVIO_DOMICILIO,
  METODO_ENVIO_RETIRO,
  mensajeErrorCheckout,
} from './tiendaCheckoutValidacion'
import { CLASE_INPUT_TIENDA, CLASE_TARJETA_TIENDA } from './tiendaTheme'

const METODOS_PAGO = [
  { value: 'SINPE_MOVIL', label: 'SINPE Móvil' },
  { value: 'EFECTIVO', label: 'Efectivo al recibir' },
  { value: 'TRANSFERENCIA', label: 'Transferencia bancaria' },
]

const METODOS_ENVIO = [
  { value: METODO_ENVIO_DOMICILIO, label: 'Envío a domicilio' },
  { value: METODO_ENVIO_RETIRO, label: 'Retiro en tienda' },
]

export default function TiendaCheckoutPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { carrito, totalImporte, itemsParaPedido, vaciarCarrito, empresa } = useTiendaStore()
  const [form, setForm] = useState({
    nombreCliente: '',
    correoCliente: '',
    telefonoCliente: '',
    direccionEntrega: '',
    metodoPago: 'SINPE_MOVIL',
    metodoEnvio: METODO_ENVIO_DOMICILIO,
    notas: '',
  })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (carrito.length === 0) return
    const errorForm = mensajeErrorCheckout(form)
    if (errorForm) {
      setError(errorForm)
      return
    }
    setEnviando(true)
    setError(null)
    try {
      const resultado = await tiendaService.crearPedido(slug, { ...form, items: itemsParaPedido() })
      vaciarCarrito()
      const qs = new URLSearchParams({ orden: resultado.numeroPedido ?? '' })
      navigate(`/tienda/${slug}/checkout/exito?${qs}`, { replace: true, state: { total: resultado.total } })
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? 'Error al procesar el pedido. Intenta de nuevo.'
      setError(msg)
    } finally {
      setEnviando(false)
    }
  }

  if (carrito.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center text-[var(--t-muted)]">
        <p className="mb-4">Este pedido está vacío.</p>
        <Link to={`/tienda/${slug}`} className="underline" style={{ color: 'var(--t-accent)' }}>Volver al catálogo</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <Link to={`/tienda/${slug}/carrito`} className="inline-flex items-center gap-1 text-sm text-[var(--t-muted)] hover:text-[var(--t-text)] min-h-[44px]">
        <ArrowLeftIcon className="h-4 w-4" />
        Volver al pedido
      </Link>
      <h1 className="text-xl font-bold text-[var(--t-text)]">Finalizar pedido</h1>
      <p className="text-sm text-[var(--t-muted)]">
        Pedido de {empresa?.nombreComercial ?? slug} en HotClick. No se mezcla con el pedido del marketplace.
      </p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <fieldset className={`${CLASE_TARJETA_TIENDA} p-5 space-y-4`}>
          <legend className="font-semibold text-[var(--t-text)] mb-1">Tus datos</legend>
          <Campo id="tienda-nombre" label="Nombre completo *" required value={form.nombreCliente} onChange={(v) => set('nombreCliente', v)} placeholder="Juan Pérez" />
          <div className="grid sm:grid-cols-2 gap-4">
            <Campo id="tienda-correo" label="Correo electrónico *" required type="email" value={form.correoCliente} onChange={(v) => set('correoCliente', v)} placeholder="juan@ejemplo.com" />
            <Campo id="tienda-telefono" label="Teléfono *" required type="tel" value={form.telefonoCliente} onChange={(v) => set('telefonoCliente', v)} placeholder="8888-8888" />
          </div>
        </fieldset>
        <fieldset className={`${CLASE_TARJETA_TIENDA} p-5 space-y-4`}>
          <legend className="font-semibold text-[var(--t-text)] mb-1">Envío y pago</legend>
          <GrupoOpciones label="Método de envío *" name="metodoEnvio" opciones={METODOS_ENVIO} valor={form.metodoEnvio} onChange={(v) => set('metodoEnvio', v)} columnas />
          {form.metodoEnvio === METODO_ENVIO_DOMICILIO && (
            <TiendaCheckoutDireccion value={form.direccionEntrega} onChange={(valor) => set('direccionEntrega', valor)} />
          )}
          <GrupoOpciones label="Método de pago *" name="metodoPago" opciones={METODOS_PAGO} valor={form.metodoPago} onChange={(v) => set('metodoPago', v)} />
          <div>
            <label className="block text-xs font-medium text-[var(--t-muted)] mb-1">Notas adicionales</label>
            <textarea value={form.notas} onChange={(e) => set('notas', e.target.value)} placeholder="Instrucciones especiales, horario preferido, etc." rows={2} className={`${CLASE_INPUT_TIENDA} resize-none`} />
          </div>
        </fieldset>
        <div className={`${CLASE_TARJETA_TIENDA} p-5 space-y-3`}>
          <h3 className="font-semibold text-[var(--t-text)]">Resumen</h3>
          {carrito.map(({ producto, cantidad }) => (
            <div key={producto.id} className="flex justify-between text-sm text-[var(--t-muted)]">
              <span className="truncate mr-4">{producto.nombre} × {cantidad}</span>
              <span className="shrink-0 font-medium">{formatPrice(producto.precio * cantidad)}</span>
            </div>
          ))}
          <div className="border-t border-[var(--t-border)] pt-3 flex justify-between font-bold text-[var(--t-text)]">
            <span>Total</span>
            <span>{formatPrice(totalImporte())}</span>
          </div>
        </div>
        {error && (
          <div className="text-[var(--hc-danger)] text-sm bg-[var(--hc-danger-bg)] border border-[var(--hc-danger)]/20 rounded-lg px-4 py-3">{error}</div>
        )}
        <button type="submit" disabled={enviando} className="w-full py-4 min-h-[44px] rounded-xl text-white font-bold text-base disabled:opacity-60" style={{ backgroundColor: 'var(--t-primary)' }}>
          {enviando ? 'Enviando pedido...' : 'Confirmar pedido'}
        </button>
      </form>
    </div>
  )
}

function Campo({ id, label, value, onChange, type = 'text', required = false, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--t-muted)] mb-1" htmlFor={id}>{label}</label>
      <input id={id} required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={CLASE_INPUT_TIENDA} />
    </div>
  )
}

function GrupoOpciones({ label, name, opciones, valor, onChange, columnas = false }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--t-muted)] mb-1">{label}</label>
      <div className={columnas ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
        {opciones.map((m) => (
          <label
            key={m.value}
            className={`flex items-center gap-2 border rounded-lg px-3 py-2.5 min-h-[44px] cursor-pointer text-sm ${
              valor === m.value ? 'border-[var(--t-secondary)] font-medium' : 'border-[var(--t-border)]'
            }`}
            style={valor === m.value ? { backgroundColor: 'color-mix(in srgb, var(--t-accent) 12%, var(--t-surface))' } : {}}
          >
            <input type="radio" name={name} value={m.value} checked={valor === m.value} onChange={() => onChange(m.value)} className="accent-[var(--t-secondary)]" />
            {m.label}
          </label>
        ))}
      </div>
    </div>
  )
}
