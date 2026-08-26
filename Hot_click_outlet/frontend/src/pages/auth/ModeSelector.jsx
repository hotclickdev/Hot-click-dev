import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { getAvailableModes, MODE_PREF_KEY } from '@/utils/modes'

function ModeIcon({ icon, size = 28 }) {
  const s = size
  switch (icon) {
    case 'admin':
      return (
        <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
        </svg>
      )
    case 'pos':
      return (
        <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <path d="M8 21h8M12 17v4"/>
          <path d="M6 7h4M6 10h6M6 13h2"/>
        </svg>
      )
    case 'store':
      return (
        <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
      )
    case 'security':
      return (
        <svg width={s} height={s} fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      )
    default:
      return null
  }
}

function pieModo(mode) {
  if (mode.id === 'pos') return 'Abrí la caja'
  if (mode.id === 'store') return 'Ver'
  return 'Entrá'
}

export default function ModeSelector() {
  const navigate    = useNavigate()
  const userRole    = useAuthStore(s => s.userRole)
  const permissions = useAuthStore(s => s.permissions)
  const empresaSlug = useAuthStore(s => s.empresaSlug)
  const userName    = useAuthStore(s => s.userName)
  const token       = useAuthStore(s => s.token)

  const modes = getAvailableModes(userRole, permissions, { empresaSlug })

  // Si no hay sesión → login
  useEffect(() => {
    if (!token) navigate('/login', { replace: true })
  }, [token, navigate])

  // Si solo hay 1 modo → redirigir directo sin mostrar pantalla
  useEffect(() => {
    if (modes.length === 1) {
      navigate(modes[0].path, { replace: true })
    }
  }, [modes, navigate])

  const handleSelect = (mode) => {
    localStorage.setItem(MODE_PREF_KEY, mode.id)
    navigate(mode.path, { replace: true })
  }

  if (modes.length <= 1) return null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-9 p-6 sm:p-12"
      style={{ backgroundColor: 'var(--hc-bg)' }}>

      {/* Logo y saludo */}
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-sm font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-display, inherit)', color: 'var(--hc-text)' }}>
          HOTCLICK
        </span>
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight" style={{ fontFamily: 'var(--font-display, inherit)', color: 'var(--hc-text)' }}>
          Hola{userName ? `, ${userName.split(' ')[0]}` : ''}. ¿Qué vas a hacer hoy?
        </h1>
        <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
          Elegí cómo querés entrar. Podés cambiar de modo cuando querás.
        </p>
      </div>

      {/* Tarjetas de modo — Sistema (clara) vs. Caja/POS (oscura), nunca mezcladas */}
      <div className="w-full flex flex-wrap gap-6 justify-center items-stretch">
        {modes.map(mode => {
          const dark = mode.id === 'pos'
          return (
            <button type="button"
              key={mode.id}
              onClick={() => handleSelect(mode)}
              className="group flex flex-col gap-4.5 text-left rounded-2xl p-7 transition-all duration-200 hover:-translate-y-0.5"
              style={{
                width: 360,
                minHeight: 220,
                backgroundColor: dark ? '#1a1a1a' : 'var(--hc-surface)',
                color: dark ? '#ffffff' : 'var(--hc-text)',
                border: '2px solid transparent',
                boxShadow: '0 1px 3px rgba(26,26,26,0.06)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = dark ? '#5d5d5d' : 'var(--hc-accent)'; e.currentTarget.style.boxShadow = dark ? '0 10px 28px rgba(26,26,26,0.25)' : '0 10px 28px rgba(26,26,26,0.10)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(26,26,26,0.06)' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: dark ? 'rgba(255,255,255,0.12)' : 'rgba(23,71,168,0.08)', color: dark ? '#ffffff' : 'var(--hc-accent)' }}>
                <ModeIcon icon={mode.icon} size={24} />
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="font-bold text-[21px]" style={{ color: dark ? '#ffffff' : 'var(--hc-text)' }}>{mode.label}</p>
                {mode.sub && (
                  <p className="text-[15px] leading-relaxed" style={{ color: dark ? '#b8b3ab' : 'var(--hc-muted)' }}>{mode.sub}</p>
                )}
              </div>
              <div className="mt-auto font-bold text-[15px]" style={{ color: dark ? '#ffffff' : 'var(--hc-accent)' }}>
                {pieModo(mode)}
              </div>
            </button>
          )
        })}
      </div>

      {/* Pie: sesión */}
      <div className="text-xs" style={{ color: 'var(--hc-muted)' }}>
        Ingresaste como {userName || 'usuario'} ·{' '}
        <button type="button"
          onClick={() => { localStorage.removeItem(MODE_PREF_KEY) }}
          className="font-semibold hover:underline"
          style={{ color: 'var(--hc-muted)' }}>
          No recordar mi elección
        </button>
      </div>
    </div>
  )
}
