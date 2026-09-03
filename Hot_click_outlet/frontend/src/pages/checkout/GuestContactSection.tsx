import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import PhoneField from '@/components/ui/PhoneField'
import SmartField from './SmartField'
import TextoFlecha from '@/components/ui/TextoFlecha'
import { rutaLoginConRetorno } from '@/utils/authRedirect'
import { validateGuestEmail, validatePhone } from './checkoutHelpers'
import type { Dispatch, SetStateAction } from 'react'

type GuestContactSectionProps = {
  guestEmail: string
  setGuestEmail: Dispatch<SetStateAction<string>>
  guestEmailError: string
  setGuestEmailError: Dispatch<SetStateAction<string>>
  guestEmailDirty: boolean
  setGuestEmailDirty: Dispatch<SetStateAction<boolean>>
  guestPhone: string
  setGuestPhone: Dispatch<SetStateAction<string>>
  guestPhoneError: string
  setGuestPhoneError: Dispatch<SetStateAction<string>>
  guestPhoneDirty: boolean
  setGuestPhoneDirty: Dispatch<SetStateAction<boolean>>
  metodoEnvio: string
}

export default function GuestContactSection({
  guestEmail,
  setGuestEmail,
  guestEmailError,
  setGuestEmailError,
  guestEmailDirty,
  setGuestEmailDirty,
  guestPhone,
  setGuestPhone,
  guestPhoneError,
  setGuestPhoneError,
  guestPhoneDirty,
  setGuestPhoneDirty,
  metodoEnvio,
}: GuestContactSectionProps) {
  const { t } = useTranslation()
  const telefonoRequerido = metodoEnvio !== 'RETIRO_EN_TIENDA'

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
          to={rutaLoginConRetorno('/checkout')}
          className="text-xs font-medium hover:underline shrink-0 ml-4"
          style={{ color: 'var(--hc-link)' }}
        >
          <TextoFlecha>{t('checkout.guestLoginLink')}</TextoFlecha>
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
        label={telefonoRequerido ? t('checkout.guestPhoneRequired') : t('checkout.guestPhone')}
        value={guestPhone}
        required={telefonoRequerido}
        error={guestPhoneDirty && telefonoRequerido ? guestPhoneError : ''}
        hint={t('checkout.guestPhoneHelp')}
        onChange={(val) => {
          setGuestPhone(val)
          setGuestPhoneDirty(true)
          if (telefonoRequerido) setGuestPhoneError(validatePhone(val, t))
        }}
      />
    </motion.div>
  )
}
