import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { authService } from '@/services/authService'
import PanelCambiarContrasena from './PanelCambiarContrasena'
import Panel2FA from './Panel2FA'
import PanelEmailOtp from './PanelEmailOtp'
import { F, Block, SectionHeader, AlertIcon } from './configUi'

export default function SeccionSeguridad({ refreshToken, toast, onTwoFAChange }) {
  const { t } = useTranslation()
  const [twoFAEnabled,    setTwoFAEnabled]    = useState(false)
  const [totpEnabled,     setTotpEnabled]     = useState(false)
  const [emailOtpEnabled, setEmailOtpEnabled] = useState(false)
  const [loadingStatus,   setLoadingStatus]   = useState(true)

  const fetchStatus = () => {
    authService.get2FAStatus()
      .then(({ data }) => {
        const s = data.data ?? data
        setTwoFAEnabled(s.enabled ?? false)
        setTotpEnabled(s.totpEnabled ?? false)
        setEmailOtpEnabled(s.emailOtpEnabled ?? false)
        onTwoFAChange(s.enabled ?? false)
      })
      .catch((err) => { console.error('[SeccionSeguridad] 2FA status', err) })
      .finally(() => setLoadingStatus(false))
  }

  useEffect(() => { fetchStatus() }, []) // eslint-disable-line react-hooks/exhaustive-deps -- estado 2FA al montar

  // Score: 1 (password only) + 1 per 2FA method, max 3
  const methodCount = (totpEnabled ? 1 : 0) + (emailOtpEnabled ? 1 : 0)
  const score = Math.min(1 + methodCount, 3)
  const scoreLabels = ['', t('adminConfig.secScoreMid'), t('adminConfig.secScoreHigh'), t('adminConfig.secScoreMax')]
  const scoreLabel = scoreLabels[score] ?? t('adminConfig.secScoreMid')
  const scoreColor = colorScoreSeguridad(score)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SectionHeader title={t('adminConfig.navSeguridad')} desc={t('adminConfig.pwdSubtitle')} />

      {/* Security score */}
      <Block>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.secScore')}</p>
            <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '2px', fontFamily: F.body }}>{t('adminConfig.secScoreBase')}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '17px', fontWeight: 700, color: scoreColor, fontFamily: F.display, margin: 0 }}>{scoreLabel}</p>
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px', justifyContent: 'flex-end' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ width: '28px', height: '5px', borderRadius: '3px', background: i <= score ? scoreColor : 'var(--hc-border)', transition: 'background .4s' }} />
              ))}
            </div>
          </div>
        </div>
        {/* Active methods badges */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
          <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
            🔑 Contraseña
          </span>
          {totpEnabled && (
            <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(23,71,168,0.1)', color: 'var(--hc-accent)', border: '1px solid rgba(23,71,168,0.2)' }}>
              🔐 App Authenticator
            </span>
          )}
          {emailOtpEnabled && (
            <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(14,165,233,0.1)', color: '#0ea5e9', border: '1px solid rgba(14,165,233,0.2)' }}>
              📧 Email OTP
            </span>
          )}
        </div>
        {!twoFAEnabled && (
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <AlertIcon style={{ width: '14px', height: '14px', color: '#f59e0b', flexShrink: 0 }} />
            <p style={{ fontSize: '12px', color: 'rgba(251,191,36,0.9)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.secEnable2FA')}</p>
          </div>
        )}
      </Block>

      <PanelCambiarContrasena refreshToken={refreshToken} toast={toast} />
      <Panel2FA enabled={totpEnabled} loading={loadingStatus} toast={toast}
        onEnabled={() => { setTotpEnabled(true); setTwoFAEnabled(true); onTwoFAChange(true) }}
        onDisabled={() => { setTotpEnabled(false); if (!emailOtpEnabled) { setTwoFAEnabled(false); onTwoFAChange(false) } }} />
      <PanelEmailOtp enabled={emailOtpEnabled} loading={loadingStatus} toast={toast}
        onEnabled={() => { setEmailOtpEnabled(true); setTwoFAEnabled(true); onTwoFAChange(true) }}
        onDisabled={() => { setEmailOtpEnabled(false); if (!totpEnabled) { setTwoFAEnabled(false); onTwoFAChange(false) } }} />
    </div>
  )
}

function colorScoreSeguridad(score) {
  if (score >= 3) return '#22c55e'
  if (score === 2) return '#84cc16'
  return '#f59e0b'
}
