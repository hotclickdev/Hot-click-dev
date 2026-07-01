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

export default function ModeSelector() {
  const navigate    = useNavigate()
  const userRole    = useAuthStore(s => s.userRole)
  const permissions = useAuthStore(s => s.permissions)
  const userName    = useAuthStore(s => s.userName)
  const token       = useAuthStore(s => s.token)

  const modes = getAvailableModes(userRole, permissions)

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
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: 'var(--hc-bg)' }}>

      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4"
          style={{ backgroundColor: 'var(--hc-accent)', boxShadow: '0 0 30px rgba(23,71,168,0.3)' }}>
          <svg width="26" height="26" fill="none" stroke="white" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--hc-text)' }}>
          Bienvenido{userName ? `, ${userName.split(' ')[0]}` : ''}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
          ¿Cómo querés ingresar hoy?
        </p>
      </div>

      {/* Tarjetas de modo */}
      <div className={`w-full grid gap-4 ${
        modes.length === 2 ? 'max-w-lg grid-cols-2'
        : modes.length >= 3 ? 'max-w-2xl grid-cols-2 sm:grid-cols-3'
        : 'max-w-sm grid-cols-1'
      }`}>
        {modes.map(mode => (
          <button
            key={mode.id}
            onClick={() => handleSelect(mode)}
            className="group flex flex-col items-center gap-4 p-6 rounded-2xl text-center transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
            style={{
              backgroundColor: 'var(--hc-surface)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center transition-colors"
              style={{ backgroundColor: 'rgba(23,71,168,0.12)', color: 'var(--hc-accent)' }}>
              <ModeIcon icon={mode.icon} size={28} />
            </div>
            <div>
              <p className="font-bold text-base" style={{ color: 'var(--hc-text)' }}>{mode.label}</p>
              {mode.sub && (
                <p className="text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>{mode.sub}</p>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs font-medium transition-opacity opacity-0 group-hover:opacity-100"
              style={{ color: 'var(--hc-accent)' }}>
              Entrar
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </button>
        ))}
      </div>

      {/* No recordar */}
      <button
        onClick={() => { localStorage.removeItem(MODE_PREF_KEY) }}
        className="mt-6 text-xs transition-opacity hover:opacity-70"
        style={{ color: 'var(--hc-muted)' }}>
        No recordar mi elección
      </button>
    </div>
  )
}
