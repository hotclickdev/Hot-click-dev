import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { botService } from './botService'
import { aPedido, cambiarDia, errorDeConfig, MENSAJE_MAX, NOMBRE_MAX } from './botHelpers'
import { DIAS, type ConfigBot, type PedidoConfigBot, type Trato } from './botTypes'
import { BOTON_PRIMARIO, CLAVE_BOT, CONTROL, TARJETA, useAccionBot, useConsultaBot } from './useBot'

/** Configuración del bot (AG-19): nombre, trato, emojis, activo, horario semanal y mensaje fuera de horario. */
export default function ConfiguracionTab() {
  const { t } = useTranslation()
  const q = useConsultaBot(['config'], botService.config)
  if (q.isLoading) return <p role="status" className="text-sm text-hc-muted">{t('bot.cargando')}</p>
  if (q.isError || !q.data) return <p role="alert" className="text-sm text-[var(--hc-danger)]">{t('bot.errorCargar')}</p>
  return <FormularioConfig inicial={q.data} />
}

function FormularioConfig({ inicial }: Readonly<{ inicial: ConfigBot }>) {
  const { t } = useTranslation()
  const [c, setC] = useState<PedidoConfigBot>(aPedido(inicial))
  const [intento, setIntento] = useState(false)
  const guardar = useAccionBot(botService.guardarConfig, {
    invalidar: [...CLAVE_BOT, 'config'], exito: t('bot.config.guardado'),
  })
  const error = errorDeConfig(c)
  const cambiar = (p: Partial<PedidoConfigBot>) => setC((x) => ({ ...x, ...p }))

  const enviar = (e: React.FormEvent) => {
    e.preventDefault()
    setIntento(true)
    if (error) return
    guardar.mutate({ ...c, nombreBot: c.nombreBot.trim(), mensajeFueraHorario: c.mensajeFueraHorario?.trim() || null })
  }

  return (
    <form onSubmit={enviar} className="grid max-w-3xl gap-4" noValidate aria-label={t('bot.config.titulo')}>
      <section className={TARJETA}>
        <h2 className="font-display text-lg font-bold text-hc-text">{t('bot.config.titulo')}</h2>
        <p className="mt-1 text-sm text-hc-muted">{t('bot.config.ayuda')}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-hc-text">
            {t('bot.config.nombre')}
            <input
              className={CONTROL} value={c.nombreBot} maxLength={NOMBRE_MAX}
              aria-invalid={intento && error === 'bot.config.errorNombre'}
              onChange={(e) => cambiar({ nombreBot: e.target.value })}
            />
            <span className="text-xs font-normal text-hc-muted">{t('bot.config.nombreAyuda')}</span>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-hc-text">
            {t('bot.config.trato')}
            <select className={CONTROL} value={c.trato} onChange={(e) => cambiar({ trato: e.target.value as Trato })}>
              <option value="USTED">{t('bot.config.tratoUsted')}</option>
              <option value="TUTEO">{t('bot.config.tratoTuteo')}</option>
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-3">
          <label className="flex min-h-11 items-center gap-3 text-sm text-hc-text">
            <input type="checkbox" className="size-5" checked={c.emojis} onChange={(e) => cambiar({ emojis: e.target.checked })} />
            {t('bot.config.emojis')}
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm text-hc-text">
            <input type="checkbox" className="size-5" checked={c.activo} onChange={(e) => cambiar({ activo: e.target.checked })} />
            <span>
              {t('bot.config.activo')}
              <span className="block text-xs text-hc-muted">{t('bot.config.activoAyuda')}</span>
            </span>
          </label>
        </div>
      </section>

      <section className={TARJETA}>
        <h2 className="font-display text-lg font-bold text-hc-text">{t('bot.config.horarioTitulo')}</h2>
        <p className="mt-1 text-sm text-hc-muted">{t('bot.config.horarioAyuda', { zona: inicial.zona })}</p>
        <label className="mt-3 flex min-h-11 items-center gap-3 text-sm text-hc-text">
          <input
            type="checkbox" className="size-5" checked={c.horarioActivo}
            onChange={(e) => cambiar({ horarioActivo: e.target.checked })}
          />
          {t('bot.config.horarioActivo')}
        </label>
        {c.horarioActivo && (
          <>
            <ul className="mt-2 grid gap-2">
              {DIAS.map((dia) => {
                const d = c.horario.find((x) => x.dia === dia) ?? { dia, abierto: false, desde: '08:00', hasta: '17:00' }
                const nombre = t(`bot.dias.${dia}`)
                return (
                  <li key={dia} className="grid grid-cols-[1fr_auto] items-center gap-2 sm:grid-cols-[140px_auto_1fr]">
                    <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-hc-text">
                      <input
                        type="checkbox" className="size-5" checked={d.abierto}
                        onChange={(e) => cambiar({ horario: cambiarDia(c.horario, dia, { abierto: e.target.checked }) })}
                      />
                      {nombre}
                    </label>
                    <span className="text-xs text-hc-muted sm:order-last">{d.abierto ? '' : t('bot.config.cerrado')}</span>
                    {d.abierto && (
                      <span className="col-span-2 flex items-center gap-2 sm:col-span-1">
                        <input
                          type="time" className={`${CONTROL} !w-32`} value={d.desde}
                          aria-label={t('bot.config.desde', { dia: nombre })}
                          onChange={(e) => cambiar({ horario: cambiarDia(c.horario, dia, { desde: e.target.value }) })}
                        />
                        <span aria-hidden="true">–</span>
                        <input
                          type="time" className={`${CONTROL} !w-32`} value={d.hasta}
                          aria-label={t('bot.config.hasta', { dia: nombre })}
                          onChange={(e) => cambiar({ horario: cambiarDia(c.horario, dia, { hasta: e.target.value }) })}
                        />
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
            <label className="mt-4 flex flex-col gap-1 text-sm font-medium text-hc-text">
              {t('bot.config.mensajeFuera')}
              <textarea
                className={`${CONTROL} min-h-24 py-2`} rows={3} maxLength={MENSAJE_MAX}
                value={c.mensajeFueraHorario ?? ''}
                onChange={(e) => cambiar({ mensajeFueraHorario: e.target.value })}
              />
              <span className="text-xs font-normal text-hc-muted">{t('bot.config.mensajeFueraAyuda')}</span>
            </label>
          </>
        )}
      </section>

      {intento && error && <p role="alert" className="text-sm text-[var(--hc-danger)]">{t(error)}</p>}
      <div>
        <button type="submit" className={BOTON_PRIMARIO} disabled={guardar.isPending}>
          {guardar.isPending ? t('bot.guardando') : t('bot.guardar')}
        </button>
      </div>
    </form>
  )
}
