import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { rutaLoginConRetorno } from '@/utils/authRedirect'
import useAuthStore from '@/store/authStore'
import { Campo, CampoTexto } from './PiezasCheckout'
import { formatoTelefonoCampo, telefonoDesdeCampo } from './pasosCheckoutHelpers'
import { ICONOS_CHECKOUT } from './iconosCheckout'
import type { CheckoutFormState } from './useCheckoutForm'

type PasoDatosProps = {
  form: CheckoutFormState
  token: string | null
  escritorio: boolean
}

/** Datos de contacto: nombre, correo y teléfono (Figma `28:1107`, `30:2400`). Con sesión el correo es el de la cuenta. */
export default function PasoDatos({ form, token, escritorio }: PasoDatosProps) {
  const { t } = useTranslation()
  const correoCuenta = useAuthStore((s) => s.userEmail)
  const separacion = escritorio ? 'gap-[14px]' : 'gap-4'

  const telefono = token
    ? { valor: form.telefono, error: form.telefonoDirty ? form.telefonoError : '', cambiar: (v: string) => { form.setTelefono(v); if (form.telefonoDirty) form.setTelefonoError(form.validatePhone(v)) }, ayuda: t('checkout.phoneHelp') }
    : { valor: form.guestPhone, error: form.guestPhoneDirty ? form.guestPhoneError : '', cambiar: (v: string) => { form.setGuestPhone(v); form.setGuestPhoneDirty(true); form.setGuestPhoneError(form.validatePhone(v)) }, ayuda: '' }

  const campoTelefono = (
    <Campo etiqueta={t('checkout.f.telefono')} error={telefono.error} ayuda={telefono.ayuda || undefined}>
      {({ id, describedBy }) => (
        <CampoTexto
          id={id}
          describedBy={describedBy}
          escritorio={escritorio}
          icono={ICONOS_CHECKOUT.campoTelefono}
          tipo="tel"
          inputMode="tel"
          autoComplete="tel-national"
          valor={formatoTelefonoCampo(telefono.valor)}
          error={Boolean(telefono.error)}
          onCambiar={(texto) => telefono.cambiar(telefonoDesdeCampo(texto))}
        />
      )}
    </Campo>
  )

  const campoNombre = (
    <Campo etiqueta={t('checkout.f.nombre')} error={form.sinpeNombreErr}>
      {({ id, describedBy }) => (
        <CampoTexto
          id={id}
          describedBy={describedBy}
          escritorio={escritorio}
          icono={ICONOS_CHECKOUT.campoUsuario}
          autoComplete="name"
          valor={form.sinpeNombre}
          error={Boolean(form.sinpeNombreErr)}
          onCambiar={(valor) => { form.setSinpeNombre(valor); if (form.sinpeNombreErr) form.setSinpeNombreErr('') }}
        />
      )}
    </Campo>
  )
  if (token) {
    const campoCorreoCuenta = (
      <Campo etiqueta={t('checkout.f.correoCuenta')}>
        {({ id, describedBy }) => (
          <CampoTexto id={id} describedBy={describedBy} escritorio={escritorio} icono={ICONOS_CHECKOUT.campoCorreo} tipo="email" valor={correoCuenta ?? ''} soloLectura onCambiar={() => undefined} />
        )}
      </Campo>
    )
    return (
      <div className={`flex flex-col ${separacion}`}>
        {!escritorio && <h2 className="font-display text-[18px] font-bold leading-[23px] tracking-normal text-hc-n-900">{t('checkout.f.tusDatos')}</h2>}
        {campoNombre}
        {campoCorreoCuenta}
        {campoTelefono}
      </div>
    )
  }

  const errorCorreo = form.guestEmailDirty ? form.guestEmailError : ''
  const campoCorreo = (
    <Campo etiqueta={t('checkout.f.correo')} error={errorCorreo} ayuda={escritorio ? undefined : t('checkout.f.correoAyuda')}>
      {({ id, describedBy }) => (
        <CampoTexto
          id={id}
          describedBy={describedBy}
          escritorio={escritorio}
          icono={ICONOS_CHECKOUT.campoCorreo}
          tipo="email"
          inputMode="email"
          autoComplete="email"
          valor={form.guestEmail}
          error={Boolean(errorCorreo)}
          onCambiar={(valor) => {
            form.setGuestEmail(valor)
            if (form.guestEmailDirty) form.setGuestEmailError(form.validateGuestEmail(valor))
          }}
          onBlur={() => { form.setGuestEmailDirty(true); form.setGuestEmailError(form.validateGuestEmail(form.guestEmail)) }}
        />
      )}
    </Campo>
  )
  const entrar = (
    <Link to={rutaLoginConRetorno('/checkout')} className="font-semibold text-hc-blue-600">{t('checkout.f.ingresar')}</Link>
  )

  if (escritorio) {
    return (
      <div className="flex flex-col gap-[14px]">
        <div className="flex items-start gap-[14px]">
          {campoCorreo}
          {campoTelefono}
        </div>
        {campoNombre}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-[18px] font-bold leading-[23px] tracking-normal text-hc-n-900">{t('checkout.f.datosTitulo')}</h2>
      <p className="text-[14px] leading-5 text-hc-n-600">{t('checkout.f.datosTexto')}</p>
      {campoCorreo}
      {campoTelefono}
      {campoNombre}
      <p className="flex items-center justify-center gap-[6px] text-[14px] leading-[normal] text-hc-n-600">
        {t('checkout.f.yaTenesCuenta')}
        {entrar}
      </p>
    </div>
  )
}
