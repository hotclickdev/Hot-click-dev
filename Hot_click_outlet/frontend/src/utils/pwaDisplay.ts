/** Navigator iOS Safari expone standalone fuera del estándar. */
type NavigatorIos = Navigator & { standalone?: boolean }

/**
 * True si la app corre como PWA instalada (standalone / pantalla de inicio).
 */
export function esPwaStandalone(): boolean {
  const win = globalThis.window
  if (!win) return false
  try {
    if (win.matchMedia('(display-mode: standalone)').matches) return true
  } catch {
    /* matchMedia no disponible */
  }
  return (win.navigator as NavigatorIos).standalone === true
}

export function esDispositivoIos(): boolean {
  const nav = globalThis.navigator
  if (!nav) return false
  try {
    const ua = nav.userAgent
    const ipad = nav.platform === 'MacIntel' && nav.maxTouchPoints > 1
    return /iPad|iPhone|iPod/.test(ua) || ipad
  } catch {
    return false
  }
}

export function esDispositivoAndroid(): boolean {
  const nav = globalThis.navigator
  if (!nav) return false
  try {
    return /Android/i.test(nav.userAgent)
  } catch {
    return false
  }
}
