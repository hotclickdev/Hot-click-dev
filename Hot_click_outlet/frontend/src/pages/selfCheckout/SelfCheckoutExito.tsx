import { fmt } from './selfCheckoutFormat'
import type { MesaSelfCheckout, PedidoResultSelfCheckout } from './selfCheckoutTypes'

/**
 * Pedido recibido — self-checkout.
 */
export default function SelfCheckoutExito({
  mesa, pedidoResult, primaryColor, onOtroPedido,
}: {
  mesa: MesaSelfCheckout | null
  pedidoResult: PedidoResultSelfCheckout | null
  primaryColor: string
  onOtroPedido: () => void
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-5" style={{ backgroundColor: '#0f0f17' }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(34,197,94,0.15)' }}>
        <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-white">¡Pedido recibido!</p>
        <p className="text-gray-400 mt-1">{mesa?.mesaNombre}</p>
      </div>
      {pedidoResult && (
        <div className="rounded-2xl p-5 w-full max-w-sm space-y-2" style={{ backgroundColor: '#1E242E' }}>
          <p className="text-xs text-gray-400">Número de pedido</p>
          <p className="text-xl font-bold text-white">{pedidoResult.numeroPedido}</p>
          <p className="text-xs text-gray-400 mt-2">Total</p>
          <p className="text-lg font-bold" style={{ color: primaryColor }}>₡{fmt(pedidoResult.total)}</p>
        </div>
      )}
      <p className="text-sm text-gray-400 text-center">El personal te atenderá en breve. Gracias por tu pedido.</p>
      <button type="button" onClick={onOtroPedido}
        className="px-6 py-3 rounded-xl text-sm font-semibold"
        style={{ backgroundColor: primaryColor, color: '#fff' }}>
        Hacer otro pedido
      </button>
    </div>
  )
}
