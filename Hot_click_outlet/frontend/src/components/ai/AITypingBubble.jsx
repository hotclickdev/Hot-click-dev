const CSS_ID = 'hc-ai-dots-css'
const CSS = `@keyframes ai-dot{0%,60%,100%{transform:translateY(0);opacity:.35}30%{transform:translateY(-4px);opacity:1}}`
if (typeof document !== 'undefined' && !document.getElementById(CSS_ID)) {
  const s = document.createElement('style'); s.id = CSS_ID; s.textContent = CSS
  document.head.appendChild(s)
}

export function TypingDots({ color = 'currentColor' }) {
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
      className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-0.5 select-none"
      style={{ background: '#fff', border: '1.5px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
      aria-hidden
    >
      {/* Símbolo del carrito HotClick (rojo) + cursor (azul) en miniatura */}
      <svg viewBox="0 0 224 188" width="18" height="15" aria-hidden>
        <g fill="#E73B33">
          <path d="M30 26 H58 L74 52" fill="none" stroke="#E73B33" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M58 48 L188 48 L172.5 120 Q170 132 157.5 132 L88.5 132 Q76 132 73.5 120 Z" stroke="#E73B33" strokeWidth="8" strokeLinejoin="round" />
          <rect x="66" y="138" width="114" height="13" rx="6.5" />
          <circle cx="94" cy="166" r="15" />
          <circle cx="154" cy="166" r="15" />
        </g>
        <g fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round">
          <path d="M111 72 L102 102" />
          <path d="M141 72 L132 102" />
        </g>
        <g>
          <g fill="none" stroke="#1747A8" strokeWidth="9" strokeLinecap="round">
            <path d="M157 4 L159 14" />
            <path d="M136 10 L143 17" />
            <path d="M126 30 L136 31" />
          </g>
          <path
            d="M0 0 L0 31 L8.6 24 L13.8 36.2 L20.2 33.5 L15 21.6 L24.4 21.6 Z"
            transform="translate(162 38) rotate(-45) scale(1.85)"
            fill="#1747A8"
            paintOrder="stroke"
            stroke="#fff"
            strokeWidth="9"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  )
}
