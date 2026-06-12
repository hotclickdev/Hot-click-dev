/**
 * AICartSection — panel AI siempre visible en el carrito.
 * Se auto-consulta al montar con el contexto de los ítems actuales.
 */
import AIChat from './AIChat'

export default function AICartSection({ cartItems = [], cartTotal = 0 }) {
  if (!cartItems.length) return null

  const itemsStr = cartItems
    .map(i => `${i.nombre} x${i.cantidad}`)
    .join(', ')
    .slice(0, 200)

  const context = `CARRITO:${itemsStr}:${cartTotal}`
  const autoQuery = `Tengo en mi carrito: ${itemsStr}. ¿Qué más podría necesitar o me recomendás complementar?`

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
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: 'var(--hc-accent)', color: '#fff' }}
        >
          ✦
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--hc-text)' }}>
            HotClick AI
          </p>
          <p className="text-[11px]" style={{ color: 'var(--hc-muted)' }}>
            Sugerencias basadas en tu carrito
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
