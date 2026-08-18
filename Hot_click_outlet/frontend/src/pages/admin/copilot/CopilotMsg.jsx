/** Burbuja de mensaje del copilot. */
export default function CopilotMsg({ rol, contenido, streaming }) {
  const isUser = rol === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={isUser
          ? { backgroundColor: 'var(--hc-accent)', color: '#fff' }
          : { backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-text)' }}>
        {isUser ? (
          <span className="text-[10px] font-bold">Tú</span>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
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
