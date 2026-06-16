import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import tiendaService from '@/services/tiendaService'
import useTiendaStore from '@/store/tiendaStore'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(n)

const METODOS_PAGO = [
  { value: 'SINPE_MOVIL', label: 'SINPE Móvil' },
  { value: 'EFECTIVO',    label: 'Efectivo al recibir' },
  { value: 'TRANSFERENCIA', label: 'Transferencia bancaria' },
]

const METODOS_ENVIO = [
  { value: 'DOMICILIO', label: 'Envío a domicilio' },
  { value: 'RETIRO',    label: 'Retiro en tienda' },
]

export default function TiendaCheckoutPage() {
  const { slug }   = useParams()
  const navigate   = useNavigate()
  const { carrito, totalImporte, itemsParaPedido, vaciarCarrito } = useTiendaStore()

  const [form, setForm] = useState({
    nombreCliente:    '',
    correoCliente:    '',
    telefonoCliente:  '',
    direccionEntrega: '',
    metodoPago:       'SINPE_MOVIL',
    metodoEnvio:      'DOMICILIO',
    notas:            '',
  })
  const [enviando, setEnviando]  = useState(false)
  const [error,    setError]     = useState(null)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (carrito.length === 0) return

    setEnviando(true)
    setError(null)
    try {
      const resultado = await tiendaService.crearPedido(slug, {
        ...form,
        items: itemsParaPedido(),
      })
      vaciarCarrito()
      navigate(`/tienda/${slug}/checkout/exito`, {
        replace: true,
        state: { numeroPedido: resultado.numeroPedido, total: resultado.total },
      })
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? 'Error al procesar el pedido. Intenta de nuevo.'
      setError(msg)
    } finally {
      setEnviando(false)
    }
  }

  if (carrito.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center text-gray-500">
        <p className="mb-4">Tu carrito está vacío.</p>
        <Link to={`/tienda/${slug}`} className="underline" style={{ color: 'var(--t-accent)' }}>
          Volver al catálogo
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <Link
        to={`/tienda/${slug}/carrito`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Volver al carrito
      </Link>

      <h1 className="text-xl font-bold text-gray-800">Finalizar pedido</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Datos del cliente */}
        <fieldset className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-4">
          <legend className="font-semibold text-gray-700 mb-1">Tus datos</legend>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre completo *</label>
            <input
              required
              type="text"
              value={form.nombreCliente}
              onChange={e => set('nombreCliente', e.target.value)}
              placeholder="Juan Pérez"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--t-accent)]"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Correo electrónico *</label>
              <input
                required
                type="email"
                value={form.correoCliente}
                onChange={e => set('correoCliente', e.target.value)}
                placeholder="juan@ejemplo.com"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--t-accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
              <input
                type="tel"
                value={form.telefonoCliente}
                onChange={e => set('telefonoCliente', e.target.value)}
                placeholder="8888-8888"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--t-accent)]"
              />
            </div>
          </div>
        </fieldset>

        {/* Envío y pago */}
        <fieldset className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-4">
          <legend className="font-semibold text-gray-700 mb-1">Envío y pago</legend>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Método de envío *</label>
            <div className="grid grid-cols-2 gap-2">
              {METODOS_ENVIO.map(m => (
                <label
                  key={m.value}
                  className={`flex items-center gap-2 border rounded-lg px-3 py-2.5 cursor-pointer text-sm transition-colors ${
                    form.metodoEnvio === m.value
                      ? 'border-[var(--t-secondary)] bg-blue-50 font-medium'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="metodoEnvio"
                    value={m.value}
                    checked={form.metodoEnvio === m.value}
                    onChange={() => set('metodoEnvio', m.value)}
                    className="accent-[var(--t-secondary)]"
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          {form.metodoEnvio === 'DOMICILIO' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Dirección de entrega</label>
              <textarea
                value={form.direccionEntrega}
                onChange={e => set('direccionEntrega', e.target.value)}
                placeholder="Provincia, cantón, señas exactas..."
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--t-accent)] resize-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Método de pago *</label>
            <div className="space-y-2">
              {METODOS_PAGO.map(m => (
                <label
                  key={m.value}
                  className={`flex items-center gap-2 border rounded-lg px-3 py-2.5 cursor-pointer text-sm transition-colors ${
                    form.metodoPago === m.value
                      ? 'border-[var(--t-secondary)] bg-blue-50 font-medium'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="metodoPago"
                    value={m.value}
                    checked={form.metodoPago === m.value}
                    onChange={() => set('metodoPago', m.value)}
                    className="accent-[var(--t-secondary)]"
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas adicionales</label>
            <textarea
              value={form.notas}
              onChange={e => set('notas', e.target.value)}
              placeholder="Instrucciones especiales, horario preferido, etc."
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--t-accent)] resize-none"
            />
          </div>
        </fieldset>

        {/* Resumen del pedido */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-3">
          <h3 className="font-semibold text-gray-700">Resumen</h3>
          {carrito.map(({ producto, cantidad }) => (
            <div key={producto.id} className="flex justify-between text-sm text-gray-600">
              <span className="truncate mr-4">{producto.nombre} × {cantidad}</span>
              <span className="shrink-0 font-medium">₡{fmt(producto.precio * cantidad)}</span>
            </div>
          ))}
          <div className="border-t pt-3 flex justify-between font-bold text-gray-900">
            <span>Total</span>
            <span>₡{fmt(totalImporte())}</span>
          </div>
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full py-4 rounded-xl text-white font-bold text-base transition-opacity disabled:opacity-60"
          style={{ backgroundColor: 'var(--t-primary)' }}
        >
          {enviando ? 'Enviando pedido...' : 'Confirmar pedido'}
        </button>
      </form>
    </div>
  )
}
