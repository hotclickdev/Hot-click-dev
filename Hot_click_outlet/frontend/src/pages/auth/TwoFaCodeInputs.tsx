import type { ChangeEvent, ClipboardEvent, KeyboardEvent, RefObject } from 'react'

type TwoFaCodeInputsProps = {
  code2FA: string[]
  refs2FA: RefObject<(HTMLInputElement | null)[]>
  onChange: (digits: string[]) => void
  disabled?: boolean
}

/**
 * Seis inputs de un dígito para códigos 2FA (email OTP y TOTP).
 */
export default function TwoFaCodeInputs({ code2FA, refs2FA, onChange, disabled }: TwoFaCodeInputsProps) {
  const handleDigit = (idx: number, val: string) => {
    const digit = val.replace(/\D/, '').slice(-1)
    const next = [...code2FA]
    next[idx] = digit
    onChange(next)
    if (digit && idx < 5) refs2FA.current[idx + 1]?.focus()
  }

  const handleKey = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code2FA[idx] && idx > 0) refs2FA.current[idx - 1]?.focus()
  }

  const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      onChange(text.split(''))
      refs2FA.current[5]?.focus()
    }
  }

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {code2FA.map((digit, i) => (
        <input key={i}
          ref={el => { refs2FA.current[i] = el }}
          type="text" inputMode="numeric" maxLength={1} value={digit}
          onChange={(e: ChangeEvent<HTMLInputElement>) => handleDigit(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          disabled={disabled}
          className="hc-input"
          style={{ width: 46, height: 58, textAlign: 'center', fontSize: 22, fontWeight: 900, padding: 0 }}
        />
      ))}
    </div>
  )
}
