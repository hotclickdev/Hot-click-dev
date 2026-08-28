/**
 * AICartSection — panel AI siempre visible en el carrito.
 * Se auto-consulta al montar con el contexto de los ítems actuales.
 */
import AIChat from './AIChat'
import type { ItemCarrito } from '@/types/carrito'

export default function AICartSection({ cartItems = [], cartTotal = 0 }: {
  cartItems?: ItemCarrito[]
  cartTotal?: number
}) {
  if (!cartItems.length) return null

  const itemsStr = cartItems
    .map(i => `${i.nombre} x${i.cantidad}`)
    .join(', ')
    .slice(0, 200)

  const context = `CARRITO:${itemsStr}:${cartTotal}`
  const autoQuery = `Tengo en mi pedido: ${itemsStr}. ¿Qué más podría necesitar o me recomendás complementar?`

  return (
    <section
      className="rounded-2xl p-5"
      style={{
        background: 'var(--hc-surface)',
        border: '1px solid var(--hc-border)',
      }}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'var(--hc-accent)', color: '#fff' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--hc-text)' }}>
            HotClick AI
          </p>
          <p className="text-[11px]" style={{ color: 'var(--hc-muted)' }}>
            Sugerencias basadas en tu pedido
          </p>
        </div>
      </div>

      <AIChat
        context={context}
        sessionKey="hotclick-cart"
        autoQuery={autoQuery}
        placeholder="¿Querés agregar algo más?"
        maxHistoryHeight={280}
      />
    </section>
  )
}
