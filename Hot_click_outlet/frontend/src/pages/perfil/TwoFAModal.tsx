import { useState, useEffect, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { authService } from '@/services/authService'
import { mensajeErrorApi, textoCampoApi } from './perfilHelpers'

type Paso2FA = 'info' | 'qr' | 'disable'

export default function TwoFAModal({
  open, onClose, enabled, onToggle,
}: {
  open: boolean
  onClose: () => void
  enabled: boolean
  onToggle: (val: boolean) => void
}) {
  const [step, setStep] = useState<Paso2FA>('info')
  const [qrUri, setQrUri] = useState('')
  const [code, setCode] = useState('')
  const [contrasena, setCont] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()
  const { t } = useTranslation()

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset al abrir, igual que el modal original */
    if (open) setStep(enabled ? 'disable' : 'info')
    setCode(''); setCont(''); setError(''); setQrUri('')
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, enabled])

  const handleSetup = async () => {
    setLoading(true); setError('')
    try {
      const { data } = await authService.setup2FA()
      setQrUri(textoCampoApi(data, 'qrUri') ?? '')
      setStep('qr')
    } catch (err: unknown) {
      const msg = mensajeErrorApi(err)
      setError(typeof msg === 'string' && msg ? msg : t('profile.twoFASetupError'))
    } finally { setLoading(false) }
  }

  const handleActivate = async (e: FormEvent) => {
    e.preventDefault()
    if (code.length !== 6) { setError(t('profile.twoFACodeInvalid')); return }
    setLoading(true); setError('')
    try {
      await authService.activate2FA(code)
      toast({ message: t('profile.twoFAActivated'), type: 'success' })
      onToggle(true); onClose()
    } catch (err: unknown) {
      const msg = mensajeErrorApi(err)
      setError(typeof msg === 'string' && msg ? msg : t('profile.twoFACodeError'))
    } finally { setLoading(false) }
  }

  const handleDisable = async (e: FormEvent) => {
    e.preventDefault()
    if (!contrasena || code.length !== 6) { setError(t('profile.twoFADisableRequired')); return }
    setLoading(true); setError('')
    try {
      await authService.disable2FA(contrasena, code)
      toast({ message: t('profile.twoFADeactivated'), type: 'info' })
      onToggle(false); onClose()
    } catch (err: unknown) {
      const msg = mensajeErrorApi(err)
      setError(typeof msg === 'string' && msg ? msg : t('profile.twoFADisableError'))
    } finally { setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('profile.twoFactor')}>
      <AnimatePresence mode="wait">
        {step === 'info' && (
          <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <p className="text-sm text-[#8e8e9a]">{t('profile.twoFASetupInfo')}</p>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button className="w-full" loading={loading} onClick={handleSetup}>{t('profile.twoFASetupBtn')}</Button>
          </motion.div>
        )}
        {step === 'qr' && (
          <motion.div key="qr" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <form onSubmit={handleActivate} className="space-y-4">
              <p className="text-sm text-[#8e8e9a]">{t('profile.twoFAQrInfo')}</p>
              {qrUri && (
                <div className="flex justify-center py-3">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUri)}`}
                    alt="QR 2FA" className="rounded-xl border border-white/10" width={180} height={180}
                  />
                </div>
              )}
              <Input label={t('profile.twoFACodeLabel')} value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6} inputMode="numeric" placeholder="000000" required />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" loading={loading} className="w-full">{t('profile.twoFAActivateBtn')}</Button>
            </form>
          </motion.div>
        )}
        {step === 'disable' && (
          <motion.div key="disable" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <form onSubmit={handleDisable} className="space-y-4">
              <p className="text-sm text-[#8e8e9a]">{t('profile.twoFADisableInfo')}</p>
              <Input label={t('profile.passwordLabel')} type="password" value={contrasena}
                onChange={(e) => setCont(e.target.value)} required autoFocus />
              <Input label={t('profile.twoFAAuthCode')} value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6} inputMode="numeric" placeholder="000000" required />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" loading={loading} variant="danger" className="w-full">
                {t('profile.twoFADeactivateBtn')}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  )
}
