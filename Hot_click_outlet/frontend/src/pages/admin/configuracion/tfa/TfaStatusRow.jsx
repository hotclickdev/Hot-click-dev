import Spinner from '@/components/ui/Spinner'
import { F, LockIcon, AlertIcon, KeyIcon } from '../configUi'

/**
 * Estado 2FA y fila de códigos de recuperación (paso idle).
 */
export default function TfaStatusRow({
  t, enabled, step, working, copiedAll, onDisable, onStartSetup, onRegen,
}) {
  return (
    <>
      {/* Status row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', borderRadius: '12px', background: enabled ? 'rgba(34,197,94,0.07)' : 'rgba(245,158,11,0.07)', border: `1px solid ${enabled ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: enabled ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)' }}>
            {enabled ? <LockIcon style={{ width: '15px', height: '15px', color: '#4ade80' }} /> : <AlertIcon style={{ width: '15px', height: '15px', color: '#fbbf24' }} />}
          </div>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: enabled ? '#4ade80' : '#fbbf24', fontFamily: F.body, margin: 0 }}>{enabled ? t('adminConfig.tfaEnabledStatus') : t('adminConfig.tfaDisabledStatus')}</p>
            <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '2px', fontFamily: F.body }}>{enabled ? t('adminConfig.tfaProtected') : t('adminConfig.tfaRecommend')}</p>
          </div>
        </div>
        {step === 'idle' && (
          enabled
            ? <button type="button" onClick={onDisable} className="cfg-btn cfg-btn-danger" style={{ fontSize: '12px', padding: '7px 14px' }}>{t('adminConfig.tfaDeactivateBtn')}</button>
            : <button type="button" onClick={onStartSetup} disabled={working} className="cfg-btn cfg-btn-primary" style={{ fontSize: '12px', padding: '7px 14px' }}>{working ? <Spinner size="xs" /> : null}{t('adminConfig.tfaActivateBtn')}</button>
        )}
      </div>

      {enabled && step === 'idle' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '10px', background: 'var(--hc-surface-2)', border: `1px solid ${copiedAll ? 'rgba(34,197,94,0.3)' : 'var(--hc-border)'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <KeyIcon style={{ width: '15px', height: '15px', color: 'var(--hc-muted)', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.tfaRecoveryCodes')}</p>
              <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '2px', fontFamily: F.body }}>{t('adminConfig.tfaRecoveryDesc')}</p>
            </div>
          </div>
          <button type="button" onClick={onRegen} className="cfg-btn cfg-btn-ghost" style={{ fontSize: '12px', padding: '7px 14px' }}>{t('adminConfig.tfaRegenBtn')}</button>
        </div>
      )}
    </>
  )
}
