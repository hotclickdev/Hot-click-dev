import { fmt } from './selfCheckoutFormat'

/**
 * FAB del carrito en el catálogo.
 */
export default function SelfCheckoutFab({
  totalItems, totalPrecio, primaryColor, onVerPedido,
}: {
  totalItems: number
  totalPrecio: number
  primaryColor: string
  onVerPedido: () => void
}) {
  return (
    <div className="sticky bottom-0 p-4" style={{ backgroundColor: '#0f0f17' }}>
      <button type="button" onClick={onVerPedido}
        className="w-full py-4 rounded-2xl font-bold flex items-center justify-between px-5 transition-opacity hover:opacity-90"
        style={{ backgroundColor: primaryColor, color: '#fff' }}>
        <span className="text-sm font-bold bg-white/20 rounded-lg px-2 py-0.5">{totalItems}</span>
        <span>Ver pedido</span>
        <span className="text-sm">₡{fmt(totalPrecio)}</span>
      </button>
    </div>
  )
}
