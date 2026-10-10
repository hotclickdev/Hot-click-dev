import { Link } from 'react-router-dom'
import { Turnstile } from '@marsidev/react-turnstile'
import SocialLoginButtons from '@/components/auth/SocialLoginButtons'
import MarcaComprador from '@/components/comprador/header/MarcaComprador'
import { IcoSobre } from '../perfil/cuenta/iconosCuenta'
import CampoCuenta from './CampoCuenta'
import { CLASE_ENTRADA } from './campoCuentaClases'
import type { TFunction } from 'i18next'
import type { ChangeEvent, Dispatch, FormEvent, RefObject, SetStateAction } from 'react'
import type { TurnstileInstance } from '@marsidev/react-turnstile'

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

type RegisterCorreoPasoProps = {
  t: TFunction
  correo: string
  onCorreo: (e: ChangeEvent<HTMLInputElement>) => void
  error: string
  setTurnstileToken: Dispatch<SetStateAction<string>>
  turnstileRef: RefObject<TurnstileInstance | null>
  turnstileSiteKey: string | undefined
  onContinuar: (e: FormEvent) => void
}

/**
 * Paso de correo del alta de comprador, alineado a Figma `28:1143` (caja de correo + Continuar).
 */
export default function RegisterCorreoPaso({
  t, correo, onCorreo, error, setTurnstileToken, turnstileRef, turnstileSiteKey, onContinuar,
}: RegisterCorreoPasoProps) {
  return (
    <div className="flex flex-1 flex-col leading-[normal]">
      <div className="flex flex-col gap-[10px] px-4 pb-2 pt-7">
        <div className="flex h-9 items-center"><MarcaComprador tamano="escritorio" /></div>
        <h1 className="font-display text-[24px] font-bold leading-[30px] text-hc-n-900">{t('register.titulo')}</h1>
        <p className="text-[14px] leading-5 text-hc-n-600">{t('register.intro')}</p>
      </div>

      <form onSubmit={onContinuar} noValidate className="flex flex-col gap-3 px-4 pb-2 pt-[18px]">
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

        <CampoCuenta id="registro-correo" etiqueta={t('register.email')} icono={<IcoSobre size={18} />}>
          <input
            id="registro-correo"
            type="email"
            value={correo}
            onChange={onCorreo}
            required
            maxLength={150}
            autoComplete="email"
            placeholder={t('login.correoEjemplo')}
            className={CLASE_ENTRADA}
          />
        </CampoCuenta>

        {error && (
          <div role="alert" className="rounded-[10px] bg-[color-mix(in_srgb,var(--hc-danger)_7%,transparent)] px-3 py-[10px] text-[13px] leading-[18px] text-hc-danger">{error}</div>
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

        <button type="submit" className="flex w-full items-center justify-center rounded-[12px] bg-hc-red-500 px-4 py-[13px] text-[14px] font-semibold text-hc-n-0 hover:bg-hc-red-600">
          {t('login.continuar')}
        </button>

        <p className="text-center text-[12px] leading-4 text-hc-n-600">{t('login.terminos')}</p>
      </form>

      <p className="px-4 pt-4 text-[13px] text-hc-n-600">
        {t('register.alreadyAccount')}{' '}
        <Link to="/login" className="font-semibold text-hc-blue-600 hover:underline">{t('register.login')}</Link>
      </p>

      <div className="mt-auto flex flex-col gap-3 px-4 pb-[28px] pt-8 text-center">
        <Link to="/registro-empresa" className="text-[14px] font-semibold text-hc-blue-600 hover:underline">{t('register.quieroVender')}</Link>
        <Link to="/" className="text-[14px] font-semibold text-hc-blue-600 hover:underline">{t('login.invitado')}</Link>
      </div>
    </div>
  )
}
