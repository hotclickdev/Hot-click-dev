import { fmt } from './selfCheckoutFormat'
import TextoFlecha from '@/components/ui/TextoFlecha'

/**
 * Formulario de confirmación del pedido. El envío vive en el padre (pago congelado).
 */
export default function SelfCheckoutFormulario({
  carrito, form, error, enviando, totalPrecio, primaryColor,
  setForm, onVolver, onEnviar,
}) {
  return (
    <div className="flex-1 p-4 space-y-4">
      <button type="button" onClick={onVolver}
        className="flex items-center gap-2 text-sm text-gray-400">
        <TextoFlecha dir="atras">Volver al menú</TextoFlecha>
      </button>
      <h2 className="text-lg font-bold text-white">Tu pedido</h2>

      <div className="rounded-2xl divide-y" style={{ backgroundColor: '#1E242E', divideColor: 'rgba(255,255,255,0.05)' }}>
        {Object.values(carrito).map(({ producto, cantidad }) => (
          <div key={producto.id} className="flex items-center justify-between px-4 py-3 gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{producto.nombre}</p>
              <p className="text-xs text-gray-400">x{cantidad} · ₡{fmt(producto.precio)}</p>
            </div>
            <p className="text-sm font-semibold text-white">₡{fmt(producto.precio * cantidad)}</p>
          </div>
        ))}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-bold text-white">Total</span>
          <span className="text-base font-bold" style={{ color: primaryColor }}>₡{fmt(totalPrecio)}</span>
        </div>
      </div>

      <div className="space-y-3">
        <input placeholder="Tu nombre (opcional)"
          value={form.clienteNombre}
          onChange={e => setForm(p => ({ ...p, clienteNombre: e.target.value }))}
          className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
          style={{ backgroundColor: '#1E242E', border: '1px solid rgba(255,255,255,0.1)' }} />
        <input placeholder="Teléfono (opcional)"
          value={form.clienteTel}
          onChange={e => setForm(p => ({ ...p, clienteTel: e.target.value }))}
          className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
          style={{ backgroundColor: '#1E242E', border: '1px solid rgba(255,255,255,0.1)' }} />
        <textarea placeholder="Notas (alergias, preferencias...)"
          rows={2}
          value={form.notas}
          onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
          className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none resize-none"
          style={{ backgroundColor: '#1E242E', border: '1px solid rgba(255,255,255,0.1)' }} />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button type="button" onClick={onEnviar} disabled={enviando}
        className="w-full py-4 rounded-2xl font-bold text-base transition-opacity hover:opacity-80 disabled:opacity-50"
        style={{ backgroundColor: primaryColor, color: '#fff' }}>
        {enviando ? 'Enviando pedido…' : `Realizar pedido · ₡${fmt(totalPrecio)}`}
      </button>
    </div>
  )
}
