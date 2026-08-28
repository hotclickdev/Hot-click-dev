import Spinner from '@/components/ui/Spinner'
import { F, KeyIcon, RefreshIcon } from '../configUi'
import TfaOtpInputs from './TfaOtpInputs'
import type { TFunction } from 'i18next'
import type { ClipboardEvent, KeyboardEvent, MutableRefObject } from 'react'

/**
 * Paso regenerar códigos de recuperación. Handlers viven en el padre.
 */
export default function TfaRegenStep({
  t, code, inputRefs, codeStr, working,
  onDigit, onKeyDown, onPaste, onRegenerate, onCancel,
}: {
  t: TFunction
  code: string[]
  inputRefs: MutableRefObject<(HTMLInputElement | null)[]>
  codeStr: string
  working: boolean
  onDigit: (i: number, val: string) => void
  onKeyDown: (i: number, e: KeyboardEvent<HTMLInputElement>) => void
  onPaste: (e: ClipboardEvent<HTMLDivElement>) => void
  onRegenerate: () => void
  onCancel: () => void
}) {
  return (
    <div style={{ borderRadius: '12px', padding: '16px', background: 'rgba(100,144,234,0.06)', border: '1px solid rgba(100,144,234,0.2)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <KeyIcon style={{ width: '14px', height: '14px', color: '#97B7F3' }} />
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.tfaRegenTitle')}</p>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--hc-muted)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.tfaRegenDesc')}</p>
      <div>
        <label className="cfg-label" style={{ display: 'block', marginBottom: '8px' }}>{t('adminConfig.tfaAuthCode')}</label>
        <TfaOtpInputs accent="var(--hc-blue-400)" code={code} inputRefs={inputRefs} onDigit={onDigit} onKeyDown={onKeyDown} onPaste={onPaste} />
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="button" onClick={onRegenerate} disabled={working || codeStr.length !== 6} className="cfg-btn" style={{ background: 'var(--hc-accent)', color: '#fff', opacity: (working || codeStr.length !== 6) ? 0.4 : 1, cursor: (working || codeStr.length !== 6) ? 'not-allowed' : 'pointer' }}>{working ? <Spinner size={'xs' as 'sm'} /> : <RefreshIcon style={{ width: '14px', height: '14px' }} />}{t('adminConfig.tfaRegenSubmit')}</button>
        <button type="button" onClick={onCancel} className="cfg-btn cfg-btn-ghost">{t('adminConfig.tfaCancel')}</button>
      </div>
    </div>
  )
}
