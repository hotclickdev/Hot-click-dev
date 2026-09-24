import { useRef, useState } from 'react'
import type { TurnstileInstance } from '@marsidev/react-turnstile'

export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined

/** Token + reset del widget; sin site key el submit no se bloquea (dev). */
export function useTurnstileForm() {
  const turnstileRef = useRef<TurnstileInstance | null>(null)
  const [turnstileToken, setTurnstileToken] = useState('')

  function resetTurnstile() {
    turnstileRef.current?.reset()
    setTurnstileToken('')
  }

  const turnstileBloqueaSubmit = Boolean(TURNSTILE_SITE_KEY) && !turnstileToken

  return {
    turnstileRef,
    turnstileToken,
    setTurnstileToken,
    resetTurnstile,
    turnstileSiteKey: TURNSTILE_SITE_KEY,
    turnstileBloqueaSubmit,
  }
}
