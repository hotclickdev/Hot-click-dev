/**
 * AIProductSection — bloque AI permanente en la página de detalle de producto.
 * No se puede plegar/ocultar. Muestra chips de preguntas frecuentes al inicio.
 */
import AIChat from './AIChat'

const CHIPS = [
  '¿Para qué sirve exactamente?',
  '¿Es fácil de instalar?',
  '¿Compatible con Alexa?',
  '¿Vale la pena?',
  '¿Tiene garantía?',
]

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
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: 'var(--hc-accent)', color: '#fff' }}
        >
          ✦
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--hc-text)' }}>
            Preguntá sobre este producto
          </p>
          <p className="text-[11px]" style={{ color: 'var(--hc-muted)' }}>
            HotClick AI · respuestas instantáneas
          </p>
        </div>
      </div>

      <AIChat
        context={context}
        sessionKey="hotclick"
        chips={CHIPS}
        placeholder="¿Tenés alguna duda sobre este producto?"
        maxHistoryHeight={320}
      />
    </section>
  )
}
