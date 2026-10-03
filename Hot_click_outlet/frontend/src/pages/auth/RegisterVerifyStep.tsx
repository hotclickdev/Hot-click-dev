import { IcoSobre } from '../perfil/cuenta/iconosCuenta'
import { BotonVerificar, CabeceraVerificacion, MensajeError } from './PiezasVerificacion'
import RegistroMarco, { type PropsCarritoRecuperable } from './RegistroMarco'
import type { TFunction } from 'i18next'
import type { Dispatch, FormEvent, SetStateAction } from 'react'

type RegisterVerifyStepProps = PropsCarritoRecuperable & {
  t: TFunction
  codigo: string
  setCodigo: Dispatch<SetStateAction<string>>
  correoRegistro: string
  error: string
  loading: boolean
  onVerify: (e: FormEvent) => void
  onReenviar: () => void
  onBack: () => void
}

/** Verificación del correo al crear cuenta: misma pantalla que la verificación de ingreso (Figma `44:1660`). */
export default function RegisterVerifyStep({
  t, codigo, setCodigo, correoRegistro, error, loading, onVerify, onReenviar, onBack, ...carrito
}: RegisterVerifyStepProps) {
  return (
    <RegistroMarco titulo={t('login.barraVerificacion')} atras={onBack} carrito={carrito}>
      <form onSubmit={onVerify} className="flex flex-col gap-[18px] px-5 pb-2 pt-7 leading-[normal]">
        <CabeceraVerificacion
          titulo={t('register.verifyTitle')}
          texto={`${t('register.verifyCodeSent')} ${correoRegistro}`}
          icono={<IcoSobre size={26} />}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="reg-codigo-email" className="text-[13px] font-medium text-hc-n-600">{t('register.verificationCode')}</label>
          <input
            id="reg-codigo-email"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            maxLength={6}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="hc-input-libre w-full rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-[14px] py-[13px] text-center font-display text-[22px] font-bold tracking-[0.4em] text-hc-n-900 outline-none placeholder:text-hc-n-400 focus:border-hc-blue-600"
          />
        </div>
        <MensajeError texto={error} />
        <BotonVerificar cargando={loading} textoCargando={t('login.verificacion.verificando')} texto={t('register.verifyBtn')} deshabilitado={codigo.length !== 6} />
        <p className="text-[13px] text-hc-n-600">
          {t('register.noEmail')}{' '}
          <button type="button" onClick={onReenviar} disabled={loading} className="font-semibold text-hc-blue-600 hover:underline disabled:opacity-60">{t('register.resend')}</button>
        </p>
        <button type="button" onClick={onBack} className="self-start text-[13px] font-semibold text-hc-blue-600 hover:underline">{t('register.backToForm')}</button>
      </form>
    </RegistroMarco>
  )
}
