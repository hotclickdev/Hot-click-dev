import AICategoryChip from '../AICategoryChip'
import { TypingDots } from './ProductsAssistantTypingDots'
import { ProductsAssistantProductCard } from './ProductsAssistantProductCard'
import IconoAsistente from '../IconoAsistente'
import type { MensajeAsistenteProductos, ProductoSugerido } from './productsAssistantHelpers'

export function ProductsAssistantBurbuja({
  msg,
  onAdd,
  onCategoryFilter,
}: {
  msg: MensajeAsistenteProductos
  onAdd: (producto: ProductoSugerido) => void
  onCategoryFilter?: (nombre: string) => void
}) {
  const isUser = msg.rol === 'user'
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold mt-0.5"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff', minWidth: 24 }}>
          <IconoAsistente className="w-3 h-3" />
        </div>
      )}
      <div className="max-w-[84%] space-y-2">
        {msg.typing ? (
          <div className="px-3 py-2.5 rounded-2xl rounded-tl-sm"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <TypingDots />
          </div>
        ) : (
          <div
            className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
            style={isUser
              ? { backgroundColor: 'var(--hc-accent)', color: '#fff' }
              : { backgroundColor: 'rgba(255,255,255,0.12)', color: '#F0F2F5', fontWeight: 400 }}
          >
            {msg.texto}
          </div>
        )}
        {!msg.typing && msg.productos && msg.productos.length > 0 && (
          <div className="space-y-2">
            {msg.productos.map((p, i) => (
              <ProductsAssistantProductCard key={p.id ?? i} producto={p} onAdd={onAdd} />
            ))}
          </div>
        )}
        {!msg.typing && msg.categorias && msg.categorias.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {msg.categorias.map(cat => (
              <AICategoryChip
                key={cat}
                nombre={cat}
                onSelect={onCategoryFilter}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
