import Spinner from '@/components/ui/Spinner'
import { F, FormGroup, StyledInput } from '../configUi'
import type { TFunction } from 'i18next'

/**
 * Paso previo a configurar el 2FA: pide la contraseña actual (el backend la exige aunque el 2FA esté apagado).
 * Handlers viven en el padre.
 */
export default function TfaPasswordStep({
  t, password, setPassword, working, onContinue, onCancel,
}: {
  t: TFunction
  password: string
  setPassword: (v: string) => void
  working: boolean
  onContinue: () => void
  onCancel: () => void
}) {
  return (
    <form
      onSubmit={e => { e.preventDefault(); if (password && !working) onContinue() }}
      style={{ borderRadius: '12px', padding: '16px', background: 'rgba(23,71,168,0.06)', border: '1px solid rgba(23,71,168,0.18)', display: 'flex', flexDirection: 'column', gap: '14px' }}
    >
      <p style={{ fontSize: '12px', color: 'var(--hc-muted)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.tfaSetupPwdDesc')}</p>
      <FormGroup label={t('adminConfig.tfaCurrentPwd')}>
        <StyledInput type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('adminConfig.pwdCurrentPh')} autoComplete="current-password" />
      </FormGroup>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="submit" disabled={working || !password} className="cfg-btn cfg-btn-primary">{working ? <Spinner size={'xs' as 'sm'} /> : null}{t('adminConfig.tfaContinue')}</button>
        <button type="button" onClick={onCancel} className="cfg-btn cfg-btn-ghost">{t('adminConfig.tfaCancel')}</button>
      </div>
    </form>
  )
}
