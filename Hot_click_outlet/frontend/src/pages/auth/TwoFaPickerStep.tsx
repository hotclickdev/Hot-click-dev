import { useTranslation } from 'react-i18next'
import { CabeceraVerificacion, OpcionAlterna, TarjetaOtroMetodo } from './PiezasVerificacion'
import { IcoSobre, IcoTelefono } from '../perfil/cuenta/iconosCuenta'

type TwoFaPickerStepProps = {
  methods: string[]
  loading: boolean
  onPick: (method: string) => void
}

/** Elegir método cuando el usuario tiene app y correo: sin frame propio, usa la misma cabecera de `44:1660`. */
export default function TwoFaPickerStep({ methods, loading, onPick }: TwoFaPickerStepProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-[18px] px-5 pb-2 pt-7 leading-[normal]">
      <CabeceraVerificacion titulo={t('login.verificacion.tituloElegir')} texto={t('login.verificacion.textoElegir')} />
      <TarjetaOtroMetodo titulo={t('login.verificacion.metodos')}>
        {methods.includes('TOTP') && (
          <OpcionAlterna icono={<IcoTelefono size={18} />} titulo={t('login.verificacion.metodoApp')} detalle={t('login.verificacion.metodoAppDetalle')} onClick={() => onPick('TOTP')} deshabilitada={loading} />
        )}
        {methods.includes('EMAIL_OTP') && (
          <OpcionAlterna icono={<IcoSobre size={18} />} titulo={t('login.verificacion.metodoCorreo')} detalle={t('login.verificacion.metodoCorreoDetalle')} onClick={() => onPick('EMAIL_OTP')} deshabilitada={loading} />
        )}
      </TarjetaOtroMetodo>
    </div>
  )
}
