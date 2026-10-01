import { useTranslation } from 'react-i18next'
import TwoFaCodeInputs from './TwoFaCodeInputs'
import { BotonVerificar, CabeceraVerificacion, MensajeError, OpcionAlterna, TarjetaOtroMetodo } from './PiezasVerificacion'
import { correoEnmascarado } from './authHelpers'
import { IcoSobre, IcoTelefono } from '../perfil/cuenta/iconosCuenta'
import type { Dispatch, FormEvent, SetStateAction, RefObject } from 'react'

type TwoFaEmailOtpStepProps = {
  correo: string
  code2FA: string[]
  refs2FA: RefObject<(HTMLInputElement | null)[]>
  onCodeChange: Dispatch<SetStateAction<string[]>>
  error: string
  loading: boolean
  resendCooldown: number
  /** El usuario también tiene la app autenticadora: se ofrece volver a ella. */
  puedeApp: boolean
  onUsarApp: () => void
  onSubmit: (e: FormEvent) => void
  onResend: () => void
}

/** Código por correo: misma pantalla que la verificación con app (Figma `44:1660`; no tiene frame propio). */
export default function TwoFaEmailOtpStep({
  correo, code2FA, refs2FA, onCodeChange, error, loading, resendCooldown, puedeApp, onUsarApp, onSubmit, onResend,
}: TwoFaEmailOtpStepProps) {
  const { t } = useTranslation()
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-[18px] px-5 pb-2 pt-7 leading-[normal]">
      <CabeceraVerificacion
        titulo={t('login.verificacion.tituloCorreo')}
        texto={t('login.verificacion.textoCorreo', { correo: correoEnmascarado(correo) })}
        icono={<IcoSobre size={26} />}
      />
      <TwoFaCodeInputs code2FA={code2FA} refs2FA={refs2FA} onChange={onCodeChange} etiqueta={t('login.code6digits')} />
      <MensajeError texto={error} />
      <BotonVerificar cargando={loading} textoCargando={t('login.verificacion.verificando')} texto={t('login.verificacion.verificarCodigo')} />
      <TarjetaOtroMetodo titulo={t('login.verificacion.otroMetodo')}>
        <OpcionAlterna
          icono={<IcoSobre size={18} />}
          titulo={resendCooldown > 0 ? t('login.verificacion.reenviarEn', { count: resendCooldown }) : t('login.verificacion.reenviar')}
          detalle={t('login.verificacion.venceEn')}
          onClick={onResend}
          deshabilitada={resendCooldown > 0 || loading}
        />
        {puedeApp && (
          <OpcionAlterna
            icono={<IcoTelefono size={18} />}
            titulo={t('login.verificacion.volverApp')}
            detalle={t('login.verificacion.volverAppDetalle')}
            onClick={onUsarApp}
          />
        )}
      </TarjetaOtroMetodo>
    </form>
  )
}
