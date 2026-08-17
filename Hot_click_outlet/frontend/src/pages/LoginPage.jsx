import { AnimatePresence } from 'framer-motion'
import WebAuthnStep from '@/components/auth/WebAuthnStep'
import LoginFormStep from './auth/LoginFormStep'
import TwoFaPickerStep from './auth/TwoFaPickerStep'
import TwoFaEmailOtpStep from './auth/TwoFaEmailOtpStep'
import TwoFaTotpStep from './auth/TwoFaTotpStep'
import { useLoginFlow } from './auth/useLoginFlow'
import LoginPageLayout from './auth/LoginPageLayout'

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

export default function LoginPage() {
  const flow = useLoginFlow()
  const {
    step, setStep, loading, correo, setCorreo, contrasena, setContrasena,
    code2FA, setCode2FA, useRecovery, setUseRecovery, recoveryInput, setRecoveryInput,
    setShowForgot, error, setError, needsVerification, needsPasswordReset,
    resendLoading, refs2FA, turnstileRef, turnstileToken, setTurnstileToken,
    twoFaMethods, resendCooldown, handleLogin, handleResendVerification,
    sendEmailOtp, handlePickMethod, handle2FA, handleEmailOtp, handleLoginSuccess,
  } = flow

  return (
    <LoginPageLayout flow={flow}>
      <AnimatePresence mode="wait">

        {step === 'login' && (
          <LoginFormStep
            key="login"
            correo={correo} setCorreo={setCorreo}
            contrasena={contrasena} setContrasena={setContrasena}
            error={error} needsVerification={needsVerification}
            needsPasswordReset={needsPasswordReset}
            resendLoading={resendLoading} loading={loading}
            turnstileToken={turnstileToken} turnstileRef={turnstileRef}
            turnstileSiteKey={TURNSTILE_SITE_KEY} clerkEnabled={CLERK_ENABLED}
            setTurnstileToken={setTurnstileToken}
            onSubmit={handleLogin}
            onResendVerification={handleResendVerification}
            onForgot={() => setShowForgot(true)}
          />
        )}

        {step === 'picker' && (
          <TwoFaPickerStep
            key="picker"
            methods={twoFaMethods}
            loading={loading}
            onPick={handlePickMethod}
            onBack={() => { setStep('login'); setError('') }}
          />
        )}

        {step === 'email-otp' && (
          <TwoFaEmailOtpStep
            key="email-otp"
            code2FA={code2FA} refs2FA={refs2FA} onCodeChange={setCode2FA}
            error={error} loading={loading} resendCooldown={resendCooldown}
            onSubmit={handleEmailOtp}
            onResend={() => { setCode2FA(['', '', '', '', '', '']); sendEmailOtp() }}
            onBack={() => { setStep(twoFaMethods.length > 1 ? 'picker' : 'login'); setCode2FA(['', '', '', '', '', '']); setError('') }}
          />
        )}

        {step === 'webauthn' && (
          <WebAuthnStep
            correo={correo}
            onSuccess={handleLoginSuccess}
            onError={(msg) => { setError(msg); setStep('login') }}
          />
        )}

        {step === '2fa' && (
          <TwoFaTotpStep
            key="2fa"
            useRecovery={useRecovery}
            recoveryInput={recoveryInput} onRecoveryInput={setRecoveryInput}
            code2FA={code2FA} refs2FA={refs2FA} onCodeChange={setCode2FA}
            error={error} loading={loading}
            onSubmit={handle2FA}
            onToggleRecovery={() => { setUseRecovery(p => !p); setError(''); setRecoveryInput(''); setCode2FA(['', '', '', '', '', '']) }}
            onBack={() => { setStep('login'); setCode2FA(['', '', '', '', '', '']); setError(''); setUseRecovery(false); setRecoveryInput('') }}
          />
        )}

      </AnimatePresence>
    </LoginPageLayout>
  )
}
