import { useState, type ChangeEvent, type Dispatch, type FormEvent, type RefObject, type SetStateAction } from 'react'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import type { TFunction } from 'i18next'
import { isValidEmail } from '@/utils/validators'
import EmprendimientoForm from './EmprendimientoForm'
import RegisterCorreoPaso from './RegisterCorreoPaso'
import RegisterDatosPaso from './RegisterDatosPaso'
import RegisterIntencion from './RegisterIntencion'
import RegistroMarco, { type PropsCarritoRecuperable } from './RegistroMarco'
import { pasoAnteriorRegistro, type PasoRegistro } from './registerPasos'
import type { RegistroCompradorForm } from './useRegisterFlow'

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

type RegisterFormStepProps = PropsCarritoRecuperable & {
  t: TFunction
  modo: string
  form: RegistroCompradorForm
  setForm: Dispatch<SetStateAction<RegistroCompradorForm>>
  error: string
  setError: Dispatch<SetStateAction<string>>
  loading: boolean
  actualizarCampo: (field: keyof RegistroCompradorForm) => (e: ChangeEvent<HTMLInputElement>) => void
  turnstileToken: string
  setTurnstileToken: Dispatch<SetStateAction<string>>
  turnstileRef: RefObject<TurnstileInstance | null>
  onSubmit: (e: FormEvent) => void
  onVolver: () => void
}

/**
 * Alta de comprador en pasos cortos. La primera caja sigue Figma `28:1143`; vender abre `/registro-empresa` con vuelta.
 */
export default function RegisterFormStep({
  t, modo, form, setForm, error, setError, loading, actualizarCampo,
  turnstileToken, setTurnstileToken, turnstileRef, onSubmit, onVolver, ...carrito
}: RegisterFormStepProps) {
  const [paso, setPaso] = useState<PasoRegistro>('intencion')
  const [aceptaTerminos, setAceptaTerminos] = useState(false)

  if (modo === 'emprendedor') {
    return (
      <RegistroMarco titulo={t('register.title')} carrito={carrito}>
        <div className="px-4 py-6"><EmprendimientoForm onVolver={onVolver} /></div>
      </RegistroMarco>
    )
  }

  return (
    <RegistroMarco titulo={t('register.title')} atras={destinoAtras(paso, setPaso, setError)} carrito={carrito}>
      {paso === 'intencion' && <RegisterIntencion t={t} onComprar={() => { setError(''); setPaso('correo') }} />}
      {paso === 'correo' && (
        <RegisterCorreoPaso
          t={t}
          correo={form.correo}
          onCorreo={actualizarCampo('correo')}
          error={error}
          setTurnstileToken={setTurnstileToken}
          turnstileRef={turnstileRef}
          turnstileSiteKey={TURNSTILE_SITE_KEY}
          onContinuar={(e) => continuarConCorreo(e, form.correo, t, setError, setPaso)}
        />
      )}
      {paso === 'datos' && (
        <RegisterDatosPaso
          t={t} form={form} setForm={setForm} error={error} loading={loading}
          aceptaTerminos={aceptaTerminos} setAceptaTerminos={setAceptaTerminos}
          turnstileRequerido={!!TURNSTILE_SITE_KEY && !turnstileToken}
          actualizarCampo={actualizarCampo} onSubmit={onSubmit}
        />
      )}
    </RegistroMarco>
  )
}

function destinoAtras(
  paso: PasoRegistro,
  setPaso: Dispatch<SetStateAction<PasoRegistro>>,
  setError: Dispatch<SetStateAction<string>>,
) {
  if (paso === 'intencion') return '/login'
  return () => {
    setError('')
    setPaso((actual) => pasoAnteriorRegistro(actual) ?? 'intencion')
  }
}

function continuarConCorreo(
  e: FormEvent,
  correo: string,
  t: TFunction,
  setError: Dispatch<SetStateAction<string>>,
  setPaso: Dispatch<SetStateAction<PasoRegistro>>,
) {
  e.preventDefault()
  if (!isValidEmail(correo.trim())) { setError(t('login.correoInvalido')); return }
  setError('')
  setPaso('datos')
}
