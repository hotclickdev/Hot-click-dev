import { F } from '../configUi'
import type { ClipboardEvent, KeyboardEvent, MutableRefObject } from 'react'

/**
 * Inputs OTP de 6 dígitos para 2FA.
 */
export default function TfaOtpInputs({ accent = 'var(--hc-accent)', code, inputRefs, onDigit, onKeyDown, onPaste }: {
  accent?: string
  code: string[]
  inputRefs: MutableRefObject<(HTMLInputElement | null)[]>
  onDigit: (i: number, val: string) => void
  onKeyDown: (i: number, e: KeyboardEvent<HTMLInputElement>) => void
  onPaste: (e: ClipboardEvent<HTMLDivElement>) => void
}) {
  return (
    <div style={{ display: 'flex', gap: '8px' }} onPaste={onPaste}>
      {code.map((d, i) => (
        <input key={i} ref={el => { inputRefs.current[i] = el }}
          type="text" inputMode="numeric" maxLength={1}
          value={d} onChange={e => onDigit(i, e.target.value)} onKeyDown={e => onKeyDown(i, e)}
          style={{ width: '42px', height: '46px', borderRadius: '10px', textAlign: 'center', fontSize: '17px', fontWeight: 700, fontFamily: F.mono, outline: 'none', transition: 'all .15s', background: d ? `color-mix(in srgb, ${accent} 10%, transparent)` : 'var(--hc-bg)', border: `1px solid ${d ? `color-mix(in srgb, ${accent} 35%, transparent)` : 'var(--hc-border)'}`, color: 'var(--hc-text)', boxSizing: 'border-box' }}
        />
      ))}
    </div>
  )
}
