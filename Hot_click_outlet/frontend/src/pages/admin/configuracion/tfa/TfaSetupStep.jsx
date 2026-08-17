import Spinner from '@/components/ui/Spinner'
import { F, CheckIcon, CopyIcon } from '../configUi'
import TfaOtpInputs from './TfaOtpInputs'

/**
 * Paso de setup 2FA (QR + código). Handlers viven en el padre.
 */
export default function TfaSetupStep({
  t, qrData, qrDataUrl, copiedAll, code, inputRefs, codeStr, working,
  onDigit, onKeyDown, onPaste, onCopySecret, onActivate, onCancel,
}) {
  return (
    <div style={{ borderRadius: '12px', padding: '16px', background: 'rgba(23,71,168,0.06)', border: `1px solid ${copiedAll ? 'rgba(34,197,94,0.3)' : 'rgba(23,71,168,0.18)'}`, display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--hc-accent)', color: '#fff', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.tfaStep1')}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-5 items-start">
        <div style={{ flexShrink: 0, padding: '10px', background: '#fff', borderRadius: '14px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
          {qrDataUrl ? <img src={qrDataUrl} alt="QR 2FA" style={{ width: '144px', height: '144px', display: 'block' }} /> : <div style={{ width: '144px', height: '144px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '12px', color: 'var(--hc-muted)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.tfaStep2Desc')}</p>
          <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--hc-surface-2)', border: `1px solid ${copiedAll ? 'rgba(34,197,94,0.3)' : 'var(--hc-border)'}` }}>
            <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--hc-muted)', marginBottom: '6px', margin: '0 0 6px' }}>Clave de configuración</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <code style={{ fontSize: '12px', color: 'var(--hc-text)', fontFamily: F.mono, letterSpacing: '0.1em', wordBreak: 'break-all', flex: 1 }}>{qrData.secret}</code>
              <button type="button" onClick={onCopySecret}
                style={{ flexShrink: 0, padding: '6px', borderRadius: '8px', background: 'var(--hc-surface-2)', border: 'none', cursor: 'pointer', color: 'var(--hc-muted)', display: 'flex' }}>
                <CopyIcon style={{ width: '13px', height: '13px' }} />
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--hc-accent)', color: '#fff', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</span>
            <p style={{ fontSize: '12px', color: 'var(--hc-muted)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.tfaStep2Label')}</p>
          </div>
        </div>
      </div>
      <TfaOtpInputs accent="var(--hc-accent)" code={code} inputRefs={inputRefs} onDigit={onDigit} onKeyDown={onKeyDown} onPaste={onPaste} />
      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="button" onClick={onActivate} disabled={codeStr.length !== 6 || working} className="cfg-btn cfg-btn-primary">{working ? <Spinner size="xs" /> : <CheckIcon style={{ width: '14px', height: '14px' }} />}{t('adminConfig.tfaActivateSubmit')}</button>
        <button type="button" onClick={onCancel} className="cfg-btn cfg-btn-ghost">{t('adminConfig.tfaCancel')}</button>
      </div>
    </div>
  )
}
