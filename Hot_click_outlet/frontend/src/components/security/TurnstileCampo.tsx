import { Turnstile } from '@marsidev/react-turnstile'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import type { Dispatch, RefObject, SetStateAction } from 'react'

type TurnstileCampoProps = {
  siteKey: string | undefined
  turnstileRef: RefObject<TurnstileInstance | null>
  setTurnstileToken: Dispatch<SetStateAction<string>>
}

/** Widget invisible; no renderiza si falta VITE_TURNSTILE_SITE_KEY. */
export default function TurnstileCampo({
  siteKey,
  turnstileRef,
  setTurnstileToken,
}: TurnstileCampoProps) {
  if (!siteKey) return null
  return (
    <Turnstile
      ref={turnstileRef}
      siteKey={siteKey}
      onSuccess={setTurnstileToken}
      onError={() => setTurnstileToken('')}
      onExpire={() => setTurnstileToken('')}
      options={{ appearance: 'invisible' as 'always' }}
    />
  )
}
