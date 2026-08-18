/**
 * AIProductSection — bloque AI permanente en la página de detalle de producto.
 * No se puede plegar/ocultar. Muestra chips de preguntas frecuentes al inicio.
 */
import AIChat from './AIChat'
import { chipsAsesorProducto } from './productAdvisorChips'

export default function AIProductSection({ product }) {
  if (!product) return null

  const desc = product.descripcionLarga || product.descripcionCorta || ''
  const context = `PRODUCTO:${product.nombre}:${product.precio ?? ''}:${desc.slice(0, 120)}`

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
            Preguntá sobre este producto
          </p>
          <p className="text-[11px]" style={{ color: 'var(--hc-muted)' }}>
            HotClick AI · respuestas según la ficha
          </p>
        </div>
      </div>

      <AIChat
        context={context}
        productoId={product.id}
        sessionKey={`producto-${product.id}`}
        chips={chipsAsesorProducto(product)}
        placeholder="¿Este producto te sirve para lo que necesitás?"
        maxHistoryHeight={320}
      />
    </section>
  )
}
