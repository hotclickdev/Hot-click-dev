import RegisterFormStep from './auth/RegisterFormStep'
import RegisterVerifyStep from './auth/RegisterVerifyStep'
import { useRegisterFlow } from './auth/useRegisterFlow'
import { Navigate, useSearchParams } from 'react-router-dom'

/**
 * Página de registro — orquesta el flujo y las secciones visuales.
 */
export default function RegisterPage() {
  const [params] = useSearchParams()
  const {
    t, navigate,
    modo, setModo, step, setStep, loading, error, setError,
    showCartRecovery, setShowCartRecovery, recoveryCart, addItem,
    correoRegistro, codigo, setCodigo, form, setForm,
    actualizarCampo, handleSubmit, handleVerify, handleReenviar,
  } = useRegisterFlow()

  if (params.get('intencion') === 'vender') {
    return <Navigate to="/registro-empresa" replace />
  }

  const cartProps = {
    showCartRecovery, recoveryCart, addItem,
    onCloseCart: () => setShowCartRecovery(false),
    onDoneCart: () => navigate('/'),
  }

  /* ═══ VERIFICACIÓN ═══════════════════════════════════════════ */
  if (step === 'verify') {
    return (
      <RegisterVerifyStep
        t={t}
        codigo={codigo} setCodigo={setCodigo}
        correoRegistro={correoRegistro}
        error={error} loading={loading}
        onVerify={handleVerify}
        onReenviar={handleReenviar}
        onBack={() => { setStep('form'); setError('') }}
        {...cartProps}
      />
    )
  }

  /* ═══ FORMULARIO ════════════════════════════════════════════ */
  return (
    <RegisterFormStep
      t={t} modo={modo} form={form} setForm={setForm}
      error={error} loading={loading} actualizarCampo={actualizarCampo}
      onSubmit={handleSubmit}
      onVolver={() => { setModo('comprador'); setError('') }}
      {...cartProps}
    />
  )
}
