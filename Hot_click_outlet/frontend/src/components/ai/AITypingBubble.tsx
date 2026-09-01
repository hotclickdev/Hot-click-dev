const CSS_ID = 'hc-ai-dots-css'
const CSS = `@keyframes ai-dot{0%,60%,100%{transform:translateY(0);opacity:.35}30%{transform:translateY(-4px);opacity:1}}`
if (typeof document !== 'undefined' && !document.getElementById(CSS_ID)) {
  const s = document.createElement('style'); s.id = CSS_ID; s.textContent = CSS
  document.head.appendChild(s)
}

export function TypingDots({ color = 'currentColor' }: { color?: string }) {
  return (
    <span className="inline-flex items-center gap-[3px]">
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          display: 'inline-block', width: 4, height: 4, borderRadius: '50%',
          backgroundColor: color,
          animation: 'ai-dot 1.1s ease-in-out infinite',
          animationDelay: `${i * 0.18}s`,
        }} />
      ))}
    </span>
  )
}

export function AIAvatar() {
  return (
    <div
      className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-0.5 select-none overflow-hidden"
      style={{ background: '#fff', border: '1.5px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
      aria-hidden
    >
      <img src="/brand/hotclick-isotipo.png" alt="" width={20} height={16} decoding="async" />
    </div>
  )
}
