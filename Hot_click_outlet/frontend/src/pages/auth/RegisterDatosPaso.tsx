import { Link } from 'react-router-dom'
import PhoneField from '@/components/ui/PhoneField'
import { IcoCandado, IcoUsuario } from '../perfil/cuenta/iconosCuenta'
import CampoCuenta from './CampoCuenta'
import { CLASE_ENTRADA } from './campoCuentaClases'
import type { TFunction } from 'i18next'
import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from 'react'
import type { RegistroCompradorForm } from './useRegisterFlow'

type RegisterDatosPasoProps = {
  t: TFunction
  form: RegistroCompradorForm
  setForm: Dispatch<SetStateAction<RegistroCompradorForm>>
  error: string
  loading: boolean
  aceptaTerminos: boolean
  setAceptaTerminos: Dispatch<SetStateAction<boolean>>
  turnstileRequerido: boolean
  actualizarCampo: (field: keyof RegistroCompradorForm) => (e: ChangeEvent<HTMLInputElement>) => void
  onSubmit: (e: FormEvent) => void
}

/**
 * Datos que el backend pide además del correo. Van después de Continuar para no recargar la primera pantalla.
 */
export default function RegisterDatosPaso({
  t, form, setForm, error, loading, aceptaTerminos, setAceptaTerminos, turnstileRequerido, actualizarCampo, onSubmit,
}: RegisterDatosPasoProps) {
  const bloqueado = loading || !aceptaTerminos || turnstileRequerido

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 px-4 pb-2 pt-7 leading-[normal]">
      <h1 className="font-display text-[24px] font-bold leading-[30px] text-hc-n-900">{t('register.titulo')}</h1>
      <p className="text-[14px] leading-5 text-hc-n-600">{t('register.datosIntro')}</p>

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

      <button type="submit" disabled={bloqueado}
        className="flex w-full items-center justify-center rounded-[12px] bg-hc-red-500 px-4 py-[13px] text-[14px] font-semibold text-hc-n-0 hover:bg-hc-red-600 disabled:cursor-not-allowed disabled:bg-hc-n-100 disabled:text-hc-n-400">
        {loading ? t('login.sending') : t('register.sendCode')}
      </button>
    </form>
  )
}
