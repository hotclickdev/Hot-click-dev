import { useNavigate, useMatch } from 'react-router-dom'
import { getAvailableModes, MODE_PREF_KEY } from '@/utils/modes'
import useAuthStore from '@/store/authStore'

/** Alterna entre panel admin y caja POS cuando el usuario tiene ambos modos. */
export default function ModeSwitcherWrapper({ userRole }) {
  const permissions = useAuthStore(s => s.permissions)
  const navigate    = useNavigate()
  const modes       = getAvailableModes(userRole, permissions)
  const inPOSA      = useMatch('/admin/pos')
  const inPOSB      = useMatch('/admin/pos/*')
  if (modes.length <= 1) return null

  const inPOS   = !!(inPOSA || inPOSB)
  const altMode = inPOS
    ? modes.find(m => m.id === 'admin')
    : modes.find(m => m.id === 'pos')

  if (!altMode) return null

  return (
    <button type="button"
      onClick={() => { localStorage.setItem(MODE_PREF_KEY, altMode.id); navigate(altMode.path) }}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors hover:bg-[var(--hc-surface-2)]"
      style={{ color: 'var(--hc-accent)' }}>
      <span className="text-xs">⇄</span>
      {inPOS ? 'Panel admin' : 'Caja POS'}
    </button>
  )
}
