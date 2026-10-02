import { useRef, useState, type Dispatch, type FormEvent, type ReactNode, type RefObject, type SetStateAction } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Turnstile } from '@marsidev/react-turnstile'
import SocialLoginButtons from '@/components/auth/SocialLoginButtons'
import MarcaComprador from '@/components/comprador/header/MarcaComprador'
import { isValidEmail } from '@/utils/validators'
import { IcoBandeja, IcoCamion, IcoCandado, IcoCorazon, IcoSobre } from '../perfil/cuenta/iconosCuenta'
import type { TurnstileInstance } from '@marsidev/react-turnstile'

type LoginFormStepProps = {
  correo: string
  setCorreo: Dispatch<SetStateAction<string>>
  contrasena: string
  setContrasena: Dispatch<SetStateAction<string>>
  error: string
  needsVerification: boolean
  needsPasswordReset: boolean
  resendLoading: boolean
  loading: boolean
  turnstileToken: string
  turnstileRef: RefObject<TurnstileInstance | null>
  turnstileSiteKey: string | undefined
  clerkEnabled: boolean
  setTurnstileToken: Dispatch<SetStateAction<string>>
  onSubmit: (e: FormEvent) => void
  onResendVerification: () => void
  onForgot: () => void
}

type PasoLogin = 'correo' | 'contrasena'

const BENEFICIOS: { icono: ReactNode; clave: string }[] = [
  { icono: <IcoCamion size={18} />, clave: 'login.beneficio1' },
  { icono: <IcoBandeja size={18} />, clave: 'login.beneficio2' },
  { icono: <IcoCorazon size={18} />, clave: 'login.beneficio3' },
]

/** Campo de Figma `28:1183`: etiqueta de 13, caja de 12 con ícono de 18 y texto de 15. */
function Campo({ id, etiqueta, icono, children }: { id: string; etiqueta: string; icono: ReactNode; children: ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-1">
      <label htmlFor={id} className="text-[13px] font-medium leading-[normal] text-hc-n-600">{etiqueta}</label>
      <div className="flex w-full items-center gap-2 rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-[14px] py-[13px] focus-within:border-hc-blue-600 focus-within:shadow-[inset_0_0_0_1px_var(--hc-blue-600)]">
        <span className="shrink-0 text-hc-n-600">{icono}</span>
        {children}
      </div>
    </div>
  )
}

const CLASE_ENTRADA = 'hc-input-libre min-w-0 flex-1 bg-transparent text-[15px] leading-[normal] text-hc-n-900 outline-none placeholder:text-hc-n-500'

/**
 * Ingresar: Figma `28:1143` ("Ingresá o creá tu cuenta"). El frame solo dibuja el correo; la contraseña que exige el
 * inicio de sesión aparece al pulsar "Continuar" (paso sin frame en Figma: REQUIRES_DESIGN_REFERENCE) y no cambia la lógica.
 */
export default function LoginFormStep({
  correo, setCorreo, contrasena, setContrasena,
  error, needsVerification, needsPasswordReset,
  resendLoading, loading, turnstileToken,
  turnstileRef, turnstileSiteKey, clerkEnabled,
  setTurnstileToken, onSubmit, onResendVerification, onForgot,
}: LoginFormStepProps) {
  const { t } = useTranslation()
  const [paso, setPaso] = useState<PasoLogin>('correo')
  const [errorCorreo, setErrorCorreo] = useState('')
  const claveRef = useRef<HTMLInputElement>(null)

  const continuar = (e: FormEvent) => {
    e.preventDefault()
    if (!isValidEmail(correo.trim())) { setErrorCorreo(t('login.correoInvalido')); return }
    setErrorCorreo('')
    setPaso('contrasena')
    setTimeout(() => claveRef.current?.focus(), 0)
  }

  const enviar = (e: FormEvent) => {
    if (paso === 'correo') { continuar(e); return }
    onSubmit(e)
  }

  const bloqueado = loading || (paso === 'contrasena' && !!turnstileSiteKey && !turnstileToken)
  const mensaje = errorCorreo || (paso === 'contrasena' ? error : '')

  return (
    <div className="flex flex-1 flex-col leading-[normal]">
      <div className="flex flex-col gap-[10px] px-4 pb-2 pt-7">
        <div className="flex h-9 items-center"><MarcaComprador tamano="escritorio" /></div>
        <h1 className="font-display text-[24px] font-bold leading-[30px] text-hc-n-900">{t('login.bienvenidaTitulo')}</h1>
        <p className="text-[14px] leading-5 text-hc-n-600">{t('login.bienvenidaTexto')}</p>
      </div>

      <ul className="flex flex-col gap-[10px] px-4 pb-2 pt-[10px]">
        {BENEFICIOS.map((b) => (
          <li key={b.clave} className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-hc-blue-50 text-hc-blue-600">{b.icono}</span>
            <span className="text-[14px] font-medium text-hc-n-900">{t(b.clave)}</span>
          </li>
        ))}
      </ul>

      <form onSubmit={enviar} noValidate className="flex flex-col gap-3 px-4 pb-2 pt-[18px]">
        {clerkEnabled && (
          <>
            <SocialLoginButtons mode="signIn" variante="figma" />
            <div className="flex items-center gap-[10px]">
              <span className="h-px flex-1 bg-hc-n-400" />
              <span className="text-[12px] text-hc-n-600">{t('login.conCorreo')}</span>
              <span className="h-px flex-1 bg-hc-n-400" />
            </div>
          </>
        )}

        <Campo id="login-correo" etiqueta={t('login.email')} icono={<IcoSobre size={18} />}>
          <input
            id="login-correo"
            type="email"
            value={correo}
            onChange={(e) => { setCorreo(e.target.value); setErrorCorreo('') }}
            placeholder={t('login.correoEjemplo')}
            maxLength={150}
            autoComplete="email"
            readOnly={paso === 'contrasena'}
            className={CLASE_ENTRADA}
          />
        </Campo>

        {paso === 'contrasena' && (
          <Campo id="login-clave" etiqueta={t('login.password')} icono={<IcoCandado size={18} />}>
            <input
              id="login-clave"
              ref={claveRef}
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              placeholder="••••••••"
              maxLength={128}
              required
              autoComplete="current-password"
              className={CLASE_ENTRADA}
            />
          </Campo>
        )}

        {mensaje && (
          <div role="alert" className="flex flex-col gap-2 rounded-[10px] bg-[color-mix(in_srgb,var(--hc-danger)_7%,transparent)] px-3 py-[10px] text-[13px] leading-[18px] text-hc-danger">
            {mensaje}
            {paso === 'contrasena' && needsVerification && (
              <button type="button" onClick={onResendVerification} disabled={resendLoading} className="self-start text-[12px] font-semibold text-hc-blue-600 disabled:opacity-60">
                {resendLoading ? t('login.sending') : t('login.resendVerification')}
              </button>
            )}
            {paso === 'contrasena' && needsPasswordReset && (
              <button type="button" onClick={onForgot} className="self-start text-[12px] font-semibold text-hc-blue-600">{t('login.recoverByEmail')}</button>
            )}
          </div>
        )}

        {turnstileSiteKey && (
          <Turnstile
            ref={turnstileRef}
            siteKey={turnstileSiteKey}
            onSuccess={setTurnstileToken}
            onError={() => setTurnstileToken('')}
            onExpire={() => setTurnstileToken('')}
            options={{ appearance: 'invisible' as 'always' }}
          />
        )}

        <button
          type="submit"
          disabled={bloqueado}
          className="flex w-full items-center justify-center rounded-[12px] bg-hc-red-500 px-4 py-[13px] text-[14px] font-semibold text-hc-n-0 hover:bg-hc-red-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? t('common.loading') : paso === 'correo' ? t('login.continuar') : t('login.ingresar')}
        </button>

        <button type="button" onClick={onForgot} className="self-start text-[13px] font-semibold text-hc-blue-600 hover:underline">
          {t('login.forgotPassword')}
        </button>

        {paso === 'contrasena' && (
          <p className="text-[13px] text-hc-n-600">
            <button type="button" onClick={() => { setPaso('correo'); setContrasena('') }} className="font-semibold text-hc-blue-600 hover:underline">{t('login.cambiarCorreo')}</button>
            {' · '}
            {t('login.sinCuenta')}{' '}
            <Link to="/registro" className="font-semibold text-hc-blue-600 hover:underline">{t('login.crearUna')}</Link>
          </p>
        )}

        <p className="text-center text-[12px] leading-4 text-hc-n-600">{t('login.terminos')}</p>
      </form>

      <div className="mt-auto px-4 pb-[28px] pt-8">
        <Link to="/" className="block text-center text-[14px] font-semibold text-hc-blue-600 hover:underline">{t('login.invitado')}</Link>
      </div>
    </div>
  )
}
