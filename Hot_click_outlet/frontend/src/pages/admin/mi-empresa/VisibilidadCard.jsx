import { useState } from 'react'

export default function VisibilidadCard({ visible, onChange }) {
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    setLoading(true)
    try { await onChange(!visible) } finally { setLoading(false) }
  }

  return (
    <div className="rounded-2xl p-5 flex items-center justify-between gap-4"
      style={{ backgroundColor: 'var(--hc-surface)', border: `1px solid ${visible ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.3)'}` }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: visible ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)' }}>
          {visible
            ? <svg className="w-5 h-5" style={{ color: '#22c55e' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
            : <svg className="w-5 h-5" style={{ color: '#818cf8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
              </svg>
          }
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>
            Visibilidad pública
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
            {visible
              ? 'Tu tienda y productos son visibles al público'
              : 'Tu tienda está oculta — el público no puede ver tus productos'}
          </p>
        </div>
      </div>

      <button type="button"
        onClick={toggle}
        disabled={loading}
        className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-60 shrink-0"
        style={{ backgroundColor: visible ? '#22c55e' : '#6366f1' }}
        role="switch"
        aria-checked={visible}
      >
        {loading
          ? <span className="absolute inset-0 flex items-center justify-center">
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            </span>
          : <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${visible ? 'translate-x-6' : 'translate-x-1'}`} />
        }
      </button>
    </div>
  )
}
