import { F, CheckIcon, CopyIcon, DownloadIcon, AlertIcon, KeyIcon } from '../configUi'

/**
 * Modal de códigos de recuperación 2FA.
 */
export default function TfaRecoveryModal({ t, recoveryCodes, copiedAll, onCopyAll, onDownload, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}>
      <div style={{ width: '100%', maxWidth: '440px', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', background: 'var(--hc-surface)', border: '1px solid rgba(100,144,234,0.3)' }}>
        <div style={{ padding: '24px 24px 16px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(100,144,234,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <KeyIcon style={{ width: '20px', height: '20px', color: '#97B7F3' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--hc-text)', fontFamily: F.display, margin: 0 }}>{t('adminConfig.tfaModalTitle')}</h3>
            <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '4px', lineHeight: 1.5, fontFamily: F.body }}>{t('adminConfig.tfaModalDesc')}</p>
          </div>
        </div>
        <div style={{ margin: '0 24px 16px', padding: '16px', borderRadius: '10px', background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {recoveryCodes.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <code style={{ fontSize: '13px', fontFamily: F.mono, letterSpacing: '0.1em', color: 'var(--hc-text)' }}>{c}</code>
              <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}>#{i+1}</span>
            </div>
          ))}
        </div>
        <div style={{ margin: '0 24px 16px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <AlertIcon style={{ width: '14px', height: '14px', color: '#f59e0b', flexShrink: 0 }} />
          <p style={{ fontSize: '12px', color: 'rgba(251,191,36,0.9)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.tfaModalWarning')}</p>
        </div>
        <div style={{ padding: '0 24px 24px', display: 'flex', gap: '10px' }}>
          <button type="button" onClick={onCopyAll} className="cfg-btn" style={{ flex: 1, justifyContent: 'center', background: copiedAll ? 'rgba(34,197,94,0.12)' : 'var(--hc-surface-2)', color: copiedAll ? 'var(--hc-success)' : 'var(--hc-text)', border: `1px solid ${copiedAll ? 'rgba(34,197,94,0.3)' : 'var(--hc-border)'}` }}>
            {copiedAll ? <CheckIcon style={{ width: '14px', height: '14px' }} /> : <CopyIcon style={{ width: '14px', height: '14px' }} />}
            {copiedAll ? t('adminConfig.tfaCopiedAll') : t('adminConfig.tfaCopyAll')}
          </button>
          <button type="button" onClick={onDownload} className="cfg-btn" style={{ flex: 1, justifyContent: 'center', background: 'rgba(100,144,234,0.08)', color: 'var(--hc-accent)', border: '1px solid rgba(100,144,234,0.2)' }}>
            <DownloadIcon style={{ width: '14px', height: '14px' }} />{t('adminConfig.tfaDownload')}
          </button>
          <button type="button" onClick={onClose} className="cfg-btn cfg-btn-ghost">{t('adminConfig.tfaClose')}</button>
        </div>
      </div>
    </div>
  )
}
