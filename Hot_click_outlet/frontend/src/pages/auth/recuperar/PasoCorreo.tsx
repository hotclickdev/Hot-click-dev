import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { IconoCandadoGrande, IconoSobre } from './iconosRecuperar'
import {
  BotonRecuperar, CampoRecuperar, ErrorRecuperar, IconoCirculo, NotaRecuperar, TextoRecuperar, TituloRecuperar,
} from './recuperarUi'
import type { RecuperarContrasena } from './useRecuperarContrasena'

/** Figma 44:1551 — "Recuperar contraseña · 1 correo". */
export default function PasoCorreo({ flujo }: { flujo: RecuperarContrasena }) {
  const { t } = useTranslation()
  const { correo, setCorreo, cargando, error, enviarCorreo } = flujo
  return (
    <form onSubmit={enviarCorreo} className="flex w-full flex-col items-start gap-[18px]">
      <IconoCirculo><IconoCandadoGrande /></IconoCirculo>
      <TituloRecuperar>{t('forgot.emailTitle')}</TituloRecuperar>
      <TextoRecuperar>{t('forgot.emailText')}</TextoRecuperar>
      <CampoRecuperar etiqueta={t('forgot.emailLabel')} icono={<IconoSobre />}
        type="email" value={correo} onChange={e => setCorreo(e.target.value)}
        required maxLength={150} autoComplete="email" inputMode="email" enterKeyHint="go" autoFocus={!correo} />
      <ErrorRecuperar mensaje={error} />
      {!correo.trim() && !error ? <p className="text-[12px] leading-4 text-hc-n-600">Escribí tu correo para continuar.</p> : null}
      <BotonRecuperar disabled={cargando || !correo.trim()}>
        {cargando ? t('forgot.sending') : t('forgot.sendCode')}
      </BotonRecuperar>
      <Link to="/login" state={{ correo: correo.trim() }} className="inline-flex min-h-11 items-center text-[14px] font-semibold text-hc-blue-600 hover:underline">
        {t('forgot.backToLogin')}
      </Link>
      <NotaRecuperar>{t('forgot.emailNote')}</NotaRecuperar>
    </form>
  )
}
