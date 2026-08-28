/**
 * AIPostPaySection — reemplaza CheckoutAssistant para los estados de post-pago.
 * Activa el autoQuery según el tipo (success / failed) al montar.
 */
import AIChat from './AIChat'
import IconoAsistente from './IconoAsistente'

export default function AIPostPaySection({
  tipo,
  numeroPedido,
  metodoPago,
  errorCode,
}: {
  tipo: string
  numeroPedido?: string
  metodoPago?: string
  errorCode?: string
}) {
  const isSuccess = tipo === 'success'

  const context = isSuccess
    ? `PAGO_EXITO:${metodoPago ?? ''}:${numeroPedido ?? ''}`
    : `PAGO_FALLO:${errorCode ?? ''}`

  const autoQuery = isSuccess
    ? `Mi compra fue exitosa. Pedido #${numeroPedido ?? ''}. ¿Cuáles son los próximos pasos?`
    : 'Mi pago falló. ¿Qué puedo hacer?'

  const accentColor = isSuccess ? '#22c55e' : undefined

  return (
    <section
      className="rounded-2xl p-5"
      style={{
        background: 'var(--hc-surface)',
        border: `1px solid ${isSuccess ? 'rgba(34,197,94,0.25)' : 'var(--hc-border)'}`,
      }}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: accentColor || 'var(--hc-accent)', color: '#fff' }}
        >
          <IconoAsistente exito={isSuccess} className="w-3.5 h-3.5" />
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--hc-text)' }}>
            {isSuccess ? 'Asistente post-compra' : 'Soporte de pago'}
          </p>
          <p className="text-[11px]" style={{ color: 'var(--hc-muted)' }}>
            HotClick AI
          </p>
        </div>
      </div>

      <AIChat
        context={context}
        sessionKey={`hotclick-pay-${numeroPedido ?? tipo}`}
        autoQuery={autoQuery}
        accentColor={accentColor}
        placeholder="¿Tenés alguna pregunta?"
        maxHistoryHeight={280}
      />
    </section>
  )
}
