/** Burbuja de mensaje del copilot. */
export default function CopilotMsg({ rol, contenido, streaming }) {
  const isUser = rol === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
        style={isUser
          ? { backgroundColor: 'var(--hc-accent)', color: '#fff' }
          : { backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-text)' }}>
        {isUser ? 'Tú' : '🤖'}
      </div>
      <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
        style={isUser
          ? { backgroundColor: 'var(--hc-accent)', color: '#fff' }
          : { backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}>
        {contenido}
        {streaming && <span className="inline-block w-1.5 h-4 ml-0.5 align-middle animate-pulse rounded-sm bg-current opacity-70" />}
      </div>
    </div>
  )
}
