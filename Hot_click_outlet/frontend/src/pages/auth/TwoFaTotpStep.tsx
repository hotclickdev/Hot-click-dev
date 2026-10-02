import { useTranslation } from 'react-i18next'
import TwoFaCodeInputs from './TwoFaCodeInputs'
import { BotonVerificar, CabeceraVerificacion, MensajeError, OpcionAlterna, TarjetaOtroMetodo } from './PiezasVerificacion'
import { correoEnmascarado } from './authHelpers'
import { IcoSobre, IcoTelefono } from '../perfil/cuenta/iconosCuenta'
import type { Dispatch, FormEvent, SetStateAction, RefObject } from 'react'

type TwoFaTotpStepProps = {
  correo: string
  useRecovery: boolean
  recoveryInput: string
  onRecoveryInput: (v: string) => void
  code2FA: string[]
  refs2FA: RefObject<(HTMLInputElement | null)[]>
  onCodeChange: Dispatch<SetStateAction<string[]>>
  error: string
  loading: boolean
  /** El usuario también tiene el método "código por correo": se ofrece como alternativa. */
  puedeCorreo: boolean
  onPedirCorreo: () => void
  onSubmit: (e: FormEvent) => void
  onToggleRecovery: () => void
}

/** Verificación con la app autenticadora: Figma `44:1660`. */
export default function TwoFaTotpStep({
  correo, useRecovery, recoveryInput, onRecoveryInput,
  code2FA, refs2FA, onCodeChange,
  error, loading, puedeCorreo, onPedirCorreo, onSubmit, onToggleRecovery,
}: TwoFaTotpStepProps) {
  const { t } = useTranslation()
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-[18px] px-5 pb-2 pt-7 leading-[normal]">
      <CabeceraVerificacion
        titulo={t('login.verificacion.titulo')}
        texto={useRecovery ? t('login.verificacion.textoRecuperacion') : t('login.verificacion.textoApp')}
      />

      {useRecovery ? (
        <div className="flex flex-col gap-[6px]">
          <label htmlFor="login-recovery-code" className="text-[13px] font-semibold text-hc-n-600">{t('login.recoveryCodeLabel')}</label>
          <input
            id="login-recovery-code" type="text" value={recoveryInput} autoFocus
            onChange={e => onRecoveryInput(e.target.value.toUpperCase())}
            placeholder="XXXXX-XXXXX"
            className="w-full rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-[14px] py-[13px] text-center font-mono text-[15px] tracking-[0.2em] text-hc-n-900 focus:border-hc-blue-600 focus:shadow-[inset_0_0_0_1px_var(--hc-blue-600)] focus:outline-none"
          />
          <p className="text-[12px] text-hc-n-500">{t('login.emergencyCodeHint')}</p>
        </div>
      ) : (
        <TwoFaCodeInputs code2FA={code2FA} refs2FA={refs2FA} onChange={onCodeChange} etiqueta={t('login.code6digits')} />
      )}

      <MensajeError texto={error} />
      <BotonVerificar cargando={loading} textoCargando={t('login.verificacion.verificando')} texto={useRecovery ? t('login.verificacion.usarRecuperacion') : t('login.verify')} />

      <TarjetaOtroMetodo titulo={t('login.verificacion.otroMetodo')}>
        {puedeCorreo && (
          <OpcionAlterna
            icono={<IcoSobre size={18} />}
            titulo={t('login.verificacion.porCorreo')}
            detalle={t('login.verificacion.porCorreoDetalle', { correo: correoEnmascarado(correo) })}
            onClick={onPedirCorreo}
            deshabilitada={loading}
          />
        )}
        <OpcionAlterna
          icono={<IcoTelefono size={18} />}
          titulo={useRecovery ? t('login.verificacion.volverApp') : t('login.verificacion.codigoRecuperacion')}
          detalle={useRecovery ? t('login.verificacion.volverAppDetalle') : t('login.verificacion.codigoRecuperacionDetalle')}
          onClick={onToggleRecovery}
        />
      </TarjetaOtroMetodo>
    </form>
  )
}
