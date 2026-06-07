export default function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8', xl: 'h-12 w-12' }
  return (
    <svg
      className={`animate-spin text-[#4f7cff] ${sizes[size]} ${className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export function PageLoader() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-5"
      style={{ background: 'var(--hc-bg, #0a0a0b)', animation: 'pageloader-in 0.25s ease both' }}
    >
      <style>{`
        @keyframes pageloader-in  { from { opacity:0 } to { opacity:1 } }
        @keyframes pageloader-bar { from { transform:scaleX(0) } to { transform:scaleX(1) } }
        @keyframes pageloader-dot { 0%,80%,100% { opacity:.25; transform:scale(.7) } 40% { opacity:1; transform:scale(1) } }
      `}</style>

      {/* Logo / ícono */}
      <div style={{ position:'relative', width:52, height:52 }}>
        {/* Anillo giratorio */}
        <svg style={{ position:'absolute', inset:0, animation:'spin 1.1s linear infinite' }}
          viewBox="0 0 52 52" fill="none">
          <circle cx="26" cy="26" r="22" stroke="rgba(255,255,255,0.08)" strokeWidth="3"/>
          <path d="M26 4 a22 22 0 0 1 22 22" stroke="var(--hc-accent,#ff4b12)"
            strokeWidth="3" strokeLinecap="round"/>
        </svg>
        {/* Emoji centrado */}
        <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center',
          justifyContent:'center', fontSize:22 }}>🛍️</span>
      </div>

      {/* Barra de progreso indeterminada */}
      <div style={{ width:120, height:3, borderRadius:99, overflow:'hidden',
        background:'rgba(255,255,255,0.08)' }}>
        <div style={{
          height:'100%', width:'40%', borderRadius:99,
          background:'var(--hc-accent,#ff4b12)',
          animation:'pageloader-bar 1s ease-in-out infinite alternate',
          transformOrigin:'left',
        }}/>
      </div>

      {/* Dots */}
      <div style={{ display:'flex', gap:6 }}>
        {[0,1,2].map(i => (
          <span key={i} style={{
            width:6, height:6, borderRadius:'50%',
            background:'var(--hc-accent,#ff4b12)',
            animation:`pageloader-dot 1.1s ease-in-out infinite`,
            animationDelay:`${i*0.18}s`,
          }}/>
        ))}
      </div>
    </div>
  )
}
