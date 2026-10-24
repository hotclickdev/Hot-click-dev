import { AnimatePresence } from 'framer-motion'
import WebAuthnStep from '@/components/auth/WebAuthnStep'
import LoginFormStep from './auth/LoginFormStep'
import TwoFaPickerStep from './auth/TwoFaPickerStep'
import TwoFaEmailOtpStep from './auth/TwoFaEmailOtpStep'
import TwoFaTotpStep from './auth/TwoFaTotpStep'
import { useLoginFlow } from './auth/useLoginFlow'
import RegisterVerifyStep from './auth/RegisterVerifyStep'
import LoginPageLayout from './auth/LoginPageLayout'
import { useClerkDisponible } from '@/components/auth/clerkDisponibleContext'

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

export default function LoginPage() {
  const flow = useLoginFlow()
  const clerkEnabled = useClerkDisponible()
  const {
    step, setStep, loading, correo, setCorreo, contrasena, setContrasena,
    code2FA, setCode2FA, useRecovery, setUseRecovery, recoveryInput, setRecoveryInput,
    navigate, error, setError, needsVerification, needsPasswordReset,
    resendLoading, refs2FA, turnstileRef, turnstileToken, setTurnstileToken,
    twoFaMethods, resendCooldown, handleLogin, handleResendVerification,
    sendEmailOtp, handlePickMethod, handle2FA, handleEmailOtp, handleLoginSuccess,
  } = flow

  // QA4-004: cuenta pendiente de verificar → mismo paso del código que el registro.
  if (step === 'verificar-correo') {
    return (
      <RegisterVerifyStep
        t={flow.t}
        codigo={flow.codigoVerificacion} setCodigo={flow.setCodigoVerificacion}
        correoRegistro={correo}
        error={error} loading={loading || resendLoading}
        onVerify={flow.handleVerificarCorreo}
        onReenviar={handleResendVerification}
        onBack={flow.volverAlLogin}
        showCartRecovery={flow.showCartRecovery}
        recoveryCart={flow.recoveryCart}
        addItem={flow.addItem}
        onCloseCart={() => { flow.setShowCartRecovery(false); navigate(flow.recoveryDest, { replace: true }) }}
        onDoneCart={() => { flow.setShowCartRecovery(false); navigate(flow.recoveryDest, { replace: true }) }}
      />
    )
  }

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
            turnstileSiteKey={TURNSTILE_SITE_KEY} clerkEnabled={clerkEnabled}
            setTurnstileToken={setTurnstileToken}
            onSubmit={handleLogin}
            onResendVerification={handleResendVerification}
            onForgot={() => navigate('/recuperar-contrasena', { state: { correo } })}
          />
        )}

        {step === 'picker' && (
          <TwoFaPickerStep
            key="picker"
            methods={twoFaMethods}
            loading={loading}
            onPick={handlePickMethod}
          />
        )}

        {step === 'email-otp' && (
          <TwoFaEmailOtpStep
            key="email-otp"
            correo={correo}
            code2FA={code2FA} refs2FA={refs2FA} onCodeChange={setCode2FA}
            error={error} loading={loading} resendCooldown={resendCooldown}
            puedeApp={twoFaMethods.includes('TOTP')}
            onUsarApp={() => { setCode2FA(['', '', '', '', '', '']); setError(''); setStep('2fa') }}
            onSubmit={handleEmailOtp}
            onResend={() => { setCode2FA(['', '', '', '', '', '']); void sendEmailOtp() }}
          />
        )}

        {step === 'webauthn' && (
          <WebAuthnStep
            correo={correo}
            onSuccess={handleLoginSuccess}
            onError={(msg: string) => { setError(msg); setStep('login') }}
          />
        )}

        {step === '2fa' && (
          <TwoFaTotpStep
            key="2fa"
            correo={correo}
            puedeCorreo={twoFaMethods.includes('EMAIL_OTP')}
            onPedirCorreo={() => { setCode2FA(['', '', '', '', '', '']); void handlePickMethod('EMAIL_OTP') }}
            useRecovery={useRecovery}
            recoveryInput={recoveryInput} onRecoveryInput={setRecoveryInput}
            code2FA={code2FA} refs2FA={refs2FA} onCodeChange={setCode2FA}
            error={error} loading={loading}
            onSubmit={handle2FA}
            onToggleRecovery={() => { setUseRecovery(p => !p); setError(''); setRecoveryInput(''); setCode2FA(['', '', '', '', '', '']) }}
          />
        )}

      </AnimatePresence>
    </LoginPageLayout>
  )
}
