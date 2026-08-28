import Spinner from '@/components/ui/Spinner'
import { F, FormGroup, StyledInput } from '../configUi'
import TfaOtpInputs from './TfaOtpInputs'
import type { TFunction } from 'i18next'
import type { ClipboardEvent, KeyboardEvent, MutableRefObject } from 'react'

/**
 * Paso desactivar 2FA. Handlers viven en el padre.
 */
export default function TfaDisableStep({
  t, password, setPassword, code, inputRefs, codeStr, working,
  onDigit, onKeyDown, onPaste, onDisable, onCancel,
}: {
  t: TFunction
  password: string
  setPassword: (v: string) => void
  code: string[]
  inputRefs: MutableRefObject<(HTMLInputElement | null)[]>
  codeStr: string
  working: boolean
  onDigit: (i: number, val: string) => void
  onKeyDown: (i: number, e: KeyboardEvent<HTMLInputElement>) => void
  onPaste: (e: ClipboardEvent<HTMLDivElement>) => void
  onDisable: () => void
  onCancel: () => void
}) {
  return (
    <div style={{ borderRadius: '12px', padding: '16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.tfaDisableTitle')}</p>
      <p style={{ fontSize: '12px', color: 'var(--hc-muted)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.tfaDisableDesc')}</p>
      <FormGroup label={t('adminConfig.tfaCurrentPwd')}>
        <StyledInput type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('adminConfig.pwdCurrentPh')} />
      </FormGroup>
      <div>
        <label className="cfg-label" style={{ display: 'block', marginBottom: '8px' }}>{t('adminConfig.tfaAuthCode')}</label>
        <TfaOtpInputs accent="#ef4444" code={code} inputRefs={inputRefs} onDigit={onDigit} onKeyDown={onKeyDown} onPaste={onPaste} />
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="button" onClick={onDisable} disabled={working || !password || codeStr.length !== 6} className="cfg-btn" style={{ background: '#dc2626', color: '#fff', boxShadow: '0 1px 10px rgba(220,38,38,0.3)', opacity: (working || !password || codeStr.length !== 6) ? 0.4 : 1, cursor: (working || !password || codeStr.length !== 6) ? 'not-allowed' : 'pointer' }}>{working ? <Spinner size={'xs' as 'sm'} /> : null}{t('adminConfig.tfaDisableSubmit')}</button>
        <button type="button" onClick={onCancel} className="cfg-btn cfg-btn-ghost">{t('adminConfig.tfaCancel')}</button>
      </div>
    </div>
  )
}
