import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import PhoneField from '@/components/ui/PhoneField'
import SmartField from './SmartField'
import { validateGuestEmail } from './checkoutHelpers'

export default function GuestContactSection({
  guestEmail,
  setGuestEmail,
  guestEmailError,
  setGuestEmailError,
  guestEmailDirty,
  setGuestEmailDirty,
  guestPhone,
  setGuestPhone,
}) {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4"
      style={{ background: 'var(--hc-surface)', border: '1.5px solid var(--hc-accent)' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold" style={{ color: 'var(--hc-text)' }}>{t('checkout.guestSection')}</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>{t('checkout.guestSectionSub')}</p>
        </div>
        <Link
          to="/login"
          className="text-xs font-medium text-[#4f7cff] hover:underline shrink-0 ml-4"
        >
          {t('checkout.guestLoginLink')}
        </Link>
      </div>

      <SmartField
        id="guestEmail"
        label={t('checkout.guestEmail')}
        type="email"
        value={guestEmail}
        placeholder="tu@correo.com"
        error={guestEmailDirty ? guestEmailError : ''}
        success={guestEmailDirty && !guestEmailError && guestEmail.trim().length > 0}
        onChange={(e) => {
          setGuestEmail(e.target.value)
          if (guestEmailDirty) setGuestEmailError(validateGuestEmail(e.target.value, t))
        }}
        onBlur={() => { setGuestEmailDirty(true); setGuestEmailError(validateGuestEmail(guestEmail, t)) }}
      />

      <PhoneField
        label={t('checkout.guestPhone')}
        value={guestPhone}
        onChange={setGuestPhone}
        hint={t('checkout.guestPhoneHelp')}
      />
    </motion.div>
  )
}
