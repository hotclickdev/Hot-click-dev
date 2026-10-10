import { useTranslation } from 'react-i18next'
import { IconoCandado, IconoCheck, IconoEquis, IconoOjo, IconoOjoTachado } from './iconosRecuperar'
import { CONTRASENA_MAX, contrasenaAceptable, requisitosContrasena } from './recuperarHelpers'
import { BotonRecuperar, CampoRecuperar, ErrorRecuperar, NotaRecuperar, TituloRecuperar } from './recuperarUi'
import type { RecuperarContrasena } from './useRecuperarContrasena'

function Requisito({ cumple, texto }: { cumple: boolean; texto: string }) {
  return (
    <li className="flex w-full items-center gap-2">
      <span className={`flex shrink-0 ${cumple ? 'text-hc-success' : 'text-hc-n-600'}`}>
        {cumple ? <IconoCheck /> : <IconoEquis />}
      </span>
      <span className={`text-[13px] ${cumple ? 'text-hc-success-text' : 'text-hc-n-600'}`}>{texto}</span>
    </li>
  )
}

/** Figma 44:1614 — "Recuperar contraseña · 3 nueva". */
export default function PasoNueva({ flujo }: { flujo: RecuperarContrasena }) {
  const { t } = useTranslation()
  const { correo, nueva, setNueva, repetir, setRepetir, verContrasena, setVerContrasena, cargando, error, guardar } = flujo
  const req = requisitosContrasena(nueva, correo)
  const tipo = verContrasena ? 'text' : 'password'

  const botonOjo = (
    <button type="button" onClick={() => setVerContrasena(v => !v)}
      aria-label={verContrasena ? t('forgot.hidePassword') : t('forgot.showPassword')} aria-pressed={verContrasena}
      className="-m-1 flex shrink-0 rounded p-1 text-hc-n-600 hover:text-hc-n-900">
      {verContrasena ? <IconoOjoTachado /> : <IconoOjo />}
    </button>
  )

  return (
    <form onSubmit={guardar} className="flex w-full flex-col items-start gap-[18px]">
      <TituloRecuperar>{t('forgot.newTitle')}</TituloRecuperar>
      <CampoRecuperar etiqueta={t('forgot.newPassword')} icono={<IconoCandado />} final={botonOjo}
        type={tipo} value={nueva} onChange={e => setNueva(e.target.value)}
        required maxLength={CONTRASENA_MAX} autoComplete="new-password" enterKeyHint="next" autoCapitalize="off" autoFocus
        aria-describedby="requisitos-contrasena" />
      <ul id="requisitos-contrasena" className="flex w-full flex-col gap-[6px]">
        <Requisito cumple={req.largo} texto={t('forgot.reqLength')} />
        <Requisito cumple={req.distintaDelCorreo} texto={t('forgot.reqNotEmail')} />
        <Requisito cumple={req.combinada} texto={t('forgot.reqMix')} />
      </ul>
      <CampoRecuperar etiqueta={t('forgot.repeatPassword')} icono={<IconoCandado />}
        type={tipo} value={repetir} onChange={e => setRepetir(e.target.value)}
        required maxLength={CONTRASENA_MAX} autoComplete="new-password" enterKeyHint="done" autoCapitalize="off" />
      <ErrorRecuperar mensaje={error} />
      <BotonRecuperar disabled={cargando || !contrasenaAceptable(nueva, correo) || !repetir}>
        {cargando ? t('forgot.saving') : t('forgot.save')}
      </BotonRecuperar>
      <NotaRecuperar tono="azul">{t('forgot.newNote')}</NotaRecuperar>
    </form>
  )
}
