import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { botService } from './botService'
import { formatearFecha, pinValido } from './botHelpers'
import type { CodigoVinculacion } from './botTypes'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CLAVE_BOT, CONTROL, TARJETA, useAccionBot, useConsultaBot } from './useBot'

/** Modo interno del bot (AG-20): vincular mi teléfono, definir el PIN y, para el dueño, ver al equipo vinculado. */
export default function EquipoPinTab() {
  const { t } = useTranslation()
  const estado = useConsultaBot(['vinculacion'], botService.vinculacion)
  const equipo = useConsultaBot(['equipo'], botService.equipo)
  const [codigo, setCodigo] = useState<CodigoVinculacion | null>(null)
  const [pin, setPin] = useState('')
  const [pinConfirmado, setPinConfirmado] = useState('')
  const [intento, setIntento] = useState(false)
  const invalidar = [...CLAVE_BOT, 'vinculacion']
  const generar = useAccionBot<undefined, CodigoVinculacion>(() => botService.generarCodigo(), { invalidar, onExito: setCodigo })
  const revocar = useAccionBot<undefined, undefined>(() => botService.revocarVinculacion(), {
    invalidar, exito: t('bot.equipo.okRevocado'), onExito: () => setCodigo(null),
  })
  const definir = useAccionBot(botService.definirPin, {
    invalidar, exito: t('bot.equipo.okPin'), onExito: () => { setPin(''); setPinConfirmado(''); setIntento(false) },
  })
  const revocarMiembro = useAccionBot(botService.revocarMiembro, {
    invalidar: [...CLAVE_BOT, 'equipo'], exito: t('bot.equipo.okRevocadoMiembro'),
  })

  const errorPin = !pinValido(pin) ? 'bot.equipo.errorPin' : pin !== pinConfirmado ? 'bot.equipo.errorPinIgual' : null
  const v = estado.data

  return (
    <div className="grid max-w-3xl gap-4">
      <section className={TARJETA} aria-labelledby="bot-vinculo">
        <h2 id="bot-vinculo" className="font-display text-lg font-bold text-hc-text">{t('bot.equipo.vinculoTitulo')}</h2>
        <p className="mt-1 text-sm text-hc-muted">{t('bot.equipo.vinculoAyuda')}</p>
        {estado.isLoading && <p role="status" className="mt-2 text-sm text-hc-muted">{t('bot.cargando')}</p>}
        {estado.isError && <p role="alert" className="mt-2 text-sm text-[var(--hc-danger)]">{t('bot.errorCargar')}</p>}
        {v && (
          <p role="status" className="mt-3 text-sm font-medium text-hc-text">
            {v.vinculado
              ? t('bot.equipo.vinculado', { fin: v.telefonoTerminaEn ?? '' })
              : t('bot.equipo.noVinculado')}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={BOTON_PRIMARIO} disabled={generar.isPending} onClick={() => generar.mutate(undefined)}>
            {t('bot.equipo.generarCodigo')}
          </button>
          {v?.vinculado && (
            <button type="button" className={BOTON_SECUNDARIO} disabled={revocar.isPending} onClick={() => revocar.mutate(undefined)}>
              {t('bot.equipo.revocar')}
            </button>
          )}
        </div>
        {codigo && (
          <div className="mt-3 rounded-[12px] bg-[var(--hc-info-bg)] p-3" role="status">
            <p className="font-mono text-2xl font-bold tracking-widest text-hc-text">{codigo.codigo}</p>
            <p className="mt-1 text-sm text-hc-text">{t('bot.equipo.instruccion', { codigo: codigo.codigo })}</p>
            <p className="mt-1 text-xs text-hc-muted">{t('bot.equipo.vigencia', { min: codigo.expiraEnMin })}</p>
          </div>
        )}
      </section>

      <section className={TARJETA} aria-labelledby="bot-pin">
        <h2 id="bot-pin" className="font-display text-lg font-bold text-hc-text">{t('bot.equipo.pinTitulo')}</h2>
        <p className="mt-1 text-sm text-hc-muted">{t('bot.equipo.pinAyuda')}</p>
        <form
          className="mt-3 grid gap-3 sm:max-w-xs" noValidate
          onSubmit={(e) => { e.preventDefault(); setIntento(true); if (!errorPin) definir.mutate(pin) }}
        >
          <label className="flex flex-col gap-1 text-sm font-medium text-hc-text">
            {t('bot.equipo.pin')}
            <input
              className={CONTROL} type="password" inputMode="numeric" autoComplete="new-password" maxLength={6}
              value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-hc-text">
            {t('bot.equipo.pinRepetir')}
            <input
              className={CONTROL} type="password" inputMode="numeric" autoComplete="new-password" maxLength={6}
              value={pinConfirmado} onChange={(e) => setPinConfirmado(e.target.value.replace(/\D/g, ''))}
            />
          </label>
          {intento && errorPin && <p role="alert" className="text-sm text-[var(--hc-danger)]">{t(errorPin)}</p>}
          <div>
            <button type="submit" className={BOTON_PRIMARIO} disabled={definir.isPending}>
              {v?.tienePin ? t('bot.equipo.cambiarPin') : t('bot.equipo.definirPin')}
            </button>
          </div>
        </form>
      </section>

      <section className={TARJETA} aria-labelledby="bot-equipo">
        <h2 id="bot-equipo" className="font-display text-lg font-bold text-hc-text">{t('bot.equipo.equipoTitulo')}</h2>
        {equipo.isError && <p className="mt-2 text-sm text-hc-muted">{t('bot.equipo.soloDueno')}</p>}
        {equipo.data && equipo.data.length === 0 && <p className="mt-2 text-sm text-hc-muted">{t('bot.equipo.equipoVacio')}</p>}
        <ul className="mt-2 grid gap-2">
          {(equipo.data ?? []).map((m) => (
            <li key={m.usuarioId} className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-hc-border p-3">
              <span className="text-sm text-hc-text">
                {t('bot.equipo.miembro', { id: m.usuarioId, fin: m.telefonoTerminaEn ?? '' })}
                <span className="block text-xs text-hc-muted">{formatearFecha(m.fechaVinculacion)}</span>
              </span>
              <button
                type="button" className={BOTON_SECUNDARIO} disabled={revocarMiembro.isPending}
                aria-label={t('bot.equipo.revocarMiembro', { id: m.usuarioId })}
                onClick={() => revocarMiembro.mutate(m.usuarioId)}
              >
                {t('bot.equipo.revocar')}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
