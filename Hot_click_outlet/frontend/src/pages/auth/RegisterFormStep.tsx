import { Link } from 'react-router-dom'
import { Turnstile } from '@marsidev/react-turnstile'
import SocialLoginButtons from '@/components/auth/SocialLoginButtons'
import MarcaComprador from '@/components/comprador/header/MarcaComprador'
import PhoneField from '@/components/ui/PhoneField'
import { IcoCandado, IcoSobre, IcoUsuario } from '../perfil/cuenta/iconosCuenta'
import CampoCuenta from './CampoCuenta'
import { CLASE_ENTRADA } from './campoCuentaClases'
import EmprendimientoForm from './EmprendimientoForm'
import RegistroMarco, { type PropsCarritoRecuperable } from './RegistroMarco'
import type { TFunction } from 'i18next'
import { useState, type ChangeEvent, type Dispatch, type FormEvent, type RefObject, type SetStateAction } from 'react'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import type { RegistroCompradorForm } from './useRegisterFlow'

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

type RegisterFormStepProps = PropsCarritoRecuperable & {
  t: TFunction
  modo: string
  form: RegistroCompradorForm
  setForm: Dispatch<SetStateAction<RegistroCompradorForm>>
  error: string
  loading: boolean
  actualizarCampo: (field: keyof RegistroCompradorForm) => (e: ChangeEvent<HTMLInputElement>) => void
  turnstileToken: string
  setTurnstileToken: Dispatch<SetStateAction<string>>
  turnstileRef: RefObject<TurnstileInstance | null>
  onSubmit: (e: FormEvent) => void
  onVolver: () => void
}

/**
 * Crear cuenta de comprador: paso "crear cuenta" **derivado de Figma `28:1143`** (el frame solo dibuja el correo).
 * Mismos campos y lógica que antes (el backend los exige); "Quiero vender" sigue llevando a `/registro-empresa`.
 */
export default function RegisterFormStep({
  t, modo, form, setForm, error, loading, actualizarCampo,
  turnstileToken, setTurnstileToken, turnstileRef, onSubmit, onVolver, ...carrito
}: RegisterFormStepProps) {
  const [aceptaTerminos, setAceptaTerminos] = useState(false)

  if (modo === 'emprendedor') {
    return (
      <RegistroMarco titulo={t('register.title')} carrito={carrito}>
        <div className="px-4 py-6"><EmprendimientoForm onVolver={onVolver} /></div>
      </RegistroMarco>
    )
  }

  const bloqueado = loading || !aceptaTerminos || (!!TURNSTILE_SITE_KEY && !turnstileToken)

  return (
    <RegistroMarco titulo={t('register.title')} atras="/login" carrito={carrito}>
      <div className="flex flex-col gap-[10px] px-4 pb-2 pt-7 leading-[normal]">
        <div className="flex h-9 items-center"><MarcaComprador tamano="escritorio" /></div>
        <h1 className="font-display text-[24px] font-bold leading-[30px] text-hc-n-900">{t('register.titulo')}</h1>
        <p className="text-[14px] leading-5 text-hc-n-600">{t('register.intro')}</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3 px-4 pb-2 pt-[18px] leading-[normal]">
        {CLERK_ENABLED && (
          <>
            <SocialLoginButtons mode="signUp" variante="figma" />
            <div className="flex items-center gap-[10px]">
              <span className="h-px flex-1 bg-hc-n-400" />
              <span className="text-[12px] text-hc-n-600">{t('login.conCorreo')}</span>
              <span className="h-px flex-1 bg-hc-n-400" />
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-3">
          <CampoCuenta id="registro-nombre" etiqueta={t('register.nombreCorto')}>
            <input id="registro-nombre" value={form.nombre} onChange={actualizarCampo('nombre')} required maxLength={100} autoComplete="given-name" className={CLASE_ENTRADA} />
          </CampoCuenta>
          <CampoCuenta id="registro-apellido" etiqueta={t('register.primerApellido')}>
            <input id="registro-apellido" value={form.apellidoPaterno} onChange={actualizarCampo('apellidoPaterno')} required maxLength={100} autoComplete="family-name" className={CLASE_ENTRADA} />
          </CampoCuenta>
        </div>
        <CampoCuenta id="registro-apellido2" etiqueta={t('register.segundoApellido')}>
          <input id="registro-apellido2" value={form.apellidoMaterno} onChange={actualizarCampo('apellidoMaterno')} maxLength={100} placeholder={t('common.optional')} className={CLASE_ENTRADA} />
        </CampoCuenta>
        <CampoCuenta id="registro-correo" etiqueta={t('register.email')} icono={<IcoSobre size={18} />}>
          <input id="registro-correo" type="email" value={form.correo} onChange={actualizarCampo('correo')} required maxLength={150} autoComplete="email" placeholder={t('login.correoEjemplo')} className={CLASE_ENTRADA} />
        </CampoCuenta>
        <div className="flex w-full flex-col gap-1">
          <label htmlFor="registro-telefono" className="text-[13px] font-medium leading-[normal] text-hc-n-600">{t('register.phone')}</label>
          <PhoneField id="registro-telefono" variante="figma" value={form.telefono} onChange={(val) => setForm((f) => ({ ...f, telefono: val }))} required />
        </div>
        <CampoCuenta id="registro-identificacion" etiqueta={t('register.identification')} icono={<IcoUsuario size={18} />}>
          <input id="registro-identificacion" value={form.identificacion} onChange={actualizarCampo('identificacion')} required maxLength={20} placeholder="1-2345-6789" className={CLASE_ENTRADA} />
        </CampoCuenta>
        <CampoCuenta id="registro-clave" etiqueta={t('register.password')} icono={<IcoCandado size={18} />}>
          <input id="registro-clave" type="password" value={form.contrasenaHash} onChange={actualizarCampo('contrasenaHash')} required minLength={8} maxLength={128} autoComplete="new-password" placeholder={t('register.minChars')} className={CLASE_ENTRADA} />
        </CampoCuenta>

        {error && (
          <div role="alert" className="rounded-[10px] bg-[color-mix(in_srgb,var(--hc-danger)_7%,transparent)] px-3 py-[10px] text-[13px] leading-[18px] text-hc-danger">{error}</div>
        )}

        <label className="flex cursor-pointer items-start gap-[10px] text-[12px] leading-[17px] text-hc-n-600">
          <input type="checkbox" required checked={aceptaTerminos} onChange={(e) => setAceptaTerminos(e.target.checked)}
            className="mt-px size-4 shrink-0 accent-[var(--hc-blue-600)]" />
          <span>
            {t('register.terms')}{' '}
            <Link to="/terminos" target="_blank" rel="noopener noreferrer" className="font-semibold text-hc-blue-600">{t('register.termsLink')}</Link>
            {' '}{t('register.termsAnd')}{' '}
            <Link to="/privacidad" target="_blank" rel="noopener noreferrer" className="font-semibold text-hc-blue-600">{t('register.privacyLink')}</Link>.
          </span>
        </label>

        {TURNSTILE_SITE_KEY && (
          <Turnstile
            ref={turnstileRef}
            siteKey={TURNSTILE_SITE_KEY}
            onSuccess={setTurnstileToken}
            onError={() => setTurnstileToken('')}
            onExpire={() => setTurnstileToken('')}
            options={{ appearance: 'invisible' as 'always' }}
          />
        )}

        <button type="submit" disabled={bloqueado}
          className="flex w-full items-center justify-center rounded-[12px] bg-hc-red-500 px-4 py-[13px] text-[14px] font-semibold text-hc-n-0 hover:bg-hc-red-600 disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? t('login.sending') : t('register.sendCode')}
        </button>

        <p className="text-[13px] text-hc-n-600">
          {t('register.alreadyAccount')}{' '}
          <Link to="/login" className="font-semibold text-hc-blue-600 hover:underline">{t('register.login')}</Link>
        </p>
      </form>

      <div className="mt-auto flex flex-col gap-3 px-4 pb-[28px] pt-8 text-center">
        <Link to="/registro-empresa" className="text-[14px] font-semibold text-hc-blue-600 hover:underline">{t('register.quieroVender')}</Link>
        <Link to="/" className="text-[14px] font-semibold text-hc-blue-600 hover:underline">{t('login.invitado')}</Link>
      </div>
    </RegistroMarco>
  )
}
