import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import { LockIcon, ShieldIcon } from './perfilIcons'

type ProfileSecurityCardProps = {
  twoFAEnabled: boolean
  isAdmin: boolean
  onChangePassword: () => void
  onSetup2FA: () => void
}

export default function ProfileSecurityCard({
  twoFAEnabled, isAdmin, onChangePassword, onSetup2FA,
}: ProfileSecurityCardProps) {
  const { t } = useTranslation()

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ backgroundColor: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}
    >
      <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--hc-border)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>{t('profile.security')}</h2>
      </div>

      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--hc-border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/6 flex items-center justify-center">
            <LockIcon />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>{t('profile.passwordLabel')}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>{t('profile.passwordSub')}</p>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={onChangePassword}>
          {t('profile.passwordChangeBtn')}
        </Button>
      </div>

      {isAdmin && (
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/6 flex items-center justify-center">
              <ShieldIcon />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--hc-text)' }}>{t('profile.twoFactor')}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
                {twoFAEnabled ? t('profile.twoFactorOn') : t('profile.twoFactorOff')}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant={twoFAEnabled ? 'danger' : 'primary'}
            onClick={onSetup2FA}
          >
            {twoFAEnabled ? t('profile.twoFactorDeactivate') : t('profile.twoFactorActivate')}
          </Button>
        </div>
      )}
    </div>
  )
}
