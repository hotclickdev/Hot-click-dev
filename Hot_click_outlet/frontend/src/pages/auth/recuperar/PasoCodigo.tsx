import { useTranslation } from 'react-i18next'
import CodigoSeisCasillas from './CodigoSeisCasillas'
import { IconoSobreGrande } from './iconosRecuperar'
import { CODIGO_LARGO, CODIGO_VENCE_MINUTOS, formatearCuentaRegresiva } from './recuperarHelpers'
import {
  BotonRecuperar, ErrorRecuperar, IconoCirculo, NotaRecuperar, TextoRecuperar, TituloRecuperar,
} from './recuperarUi'
import type { RecuperarContrasena } from './useRecuperarContrasena'

/** Figma 44:1580 — "Recuperar contraseña · 2 código". */
export default function PasoCodigo({ flujo }: { flujo: RecuperarContrasena }) {
  const { t } = useTranslation()
  const { correo, codigo, setCodigo, cargando, error, reenvioEn, reenviar, verificar } = flujo
  return (
    <form onSubmit={verificar} className="flex w-full flex-col items-start gap-[18px]">
      <IconoCirculo><IconoSobreGrande /></IconoCirculo>
      <TituloRecuperar>{t('forgot.codeTitle')}</TituloRecuperar>
      <TextoRecuperar>
        {t('forgot.codeSentTo')} <span className="font-semibold">{correo.trim()}.</span>{' '}
        {t('forgot.codeExpires', { minutos: CODIGO_VENCE_MINUTOS })}
      </TextoRecuperar>
      <CodigoSeisCasillas valor={codigo} onCambio={setCodigo} disabled={cargando} />
      <ErrorRecuperar mensaje={error} />
      <div className="flex w-full items-center gap-[6px] text-[13px]" aria-live="polite">
        <span className="text-hc-n-600">{t('forgot.notReceived')}</span>
        {reenvioEn > 0 ? (
          <span className="font-semibold text-hc-n-400">
            {t('forgot.resendIn', { tiempo: formatearCuentaRegresiva(reenvioEn) })}
          </span>
        ) : (
          <button type="button" onClick={reenviar} disabled={cargando}
            className="font-semibold text-hc-blue-600 hover:underline disabled:opacity-60">
            {t('forgot.resend')}
          </button>
        )}
      </div>
      <BotonRecuperar disabled={cargando || codigo.length !== CODIGO_LARGO}>
        {cargando ? t('forgot.verifying') : t('forgot.verify')}
      </BotonRecuperar>
      <NotaRecuperar>{t('forgot.codeNote')}</NotaRecuperar>
    </form>
  )
}
