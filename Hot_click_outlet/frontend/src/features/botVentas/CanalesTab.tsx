import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { botService } from './botService'
import type { CanalBot } from './botTypes'
import { BOTON_SECUNDARIO, CLAVE_BOT, TARJETA, useAccionBot, useConsultaBot } from './useBot'

/** Cuentas conectadas (WhatsApp, Instagram, Messenger): pausar, reanudar y desconectar. */
export default function CanalesTab() {
  const { t } = useTranslation()
  const q = useConsultaBot(['canales'], botService.canales)
  const [aDesconectar, setADesconectar] = useState<number | null>(null)
  const invalidar = [...CLAVE_BOT, 'canales']
  const pausar = useAccionBot(botService.pausarCanal, { invalidar, exito: t('bot.canales.okPausado') })
  const reanudar = useAccionBot(botService.reanudarCanal, { invalidar, exito: t('bot.canales.okReanudado') })
  const desconectar = useAccionBot(botService.desconectarCanal, {
    invalidar, exito: t('bot.canales.okDesconectado'), onExito: () => setADesconectar(null),
  })
  const items = q.data ?? []
  const ocupado = pausar.isPending || reanudar.isPending || desconectar.isPending

  return (
    <div className="grid max-w-3xl gap-4">
      <p className="text-sm text-hc-muted">{t('bot.canales.ayuda')}</p>
      {q.isLoading && <p role="status" className="text-sm text-hc-muted">{t('bot.cargando')}</p>}
      {q.isError && <p role="alert" className="text-sm text-[var(--hc-danger)]">{t('bot.errorCargar')}</p>}
      {!q.isLoading && !q.isError && items.length === 0 && (
        <div className={`${TARJETA} text-center`}>
          <p className="font-bold text-hc-text">{t('bot.canales.vacioTitulo')}</p>
          <p className="mt-1 text-sm text-hc-muted">{t('bot.canales.vacioMensaje')}</p>
        </div>
      )}
      <ul aria-label={t('bot.canales.lista')} className="grid gap-2">
        {items.map((c: CanalBot) => {
          const nombre = c.nombre || t(`bot.canales.tipo.${c.tipo}`)
          const activa = c.estado === 'ACTIVA'
          const pausada = c.estado === 'PAUSADA'
          const desconectada = c.estado === 'DESCONECTADA'
          return (
            <li key={c.id} className={`${TARJETA} flex flex-wrap items-center justify-between gap-3`}>
              <div>
                <p className="font-bold text-hc-text">{nombre}</p>
                <p className="text-sm text-hc-muted">
                  {t(`bot.canales.tipo.${c.tipo}`)} · {t(`bot.canales.estado.${c.estado}`, { defaultValue: c.estado })}
                </p>
              </div>
              {!desconectada && (
                <div className="flex flex-wrap gap-2">
                  {activa && (
                    <button type="button" className={BOTON_SECUNDARIO} disabled={ocupado} onClick={() => pausar.mutate(c.id)}>
                      {t('bot.canales.pausar')}
                    </button>
                  )}
                  {pausada && (
                    <button type="button" className={BOTON_SECUNDARIO} disabled={ocupado} onClick={() => reanudar.mutate(c.id)}>
                      {t('bot.canales.reanudar')}
                    </button>
                  )}
                  {aDesconectar === c.id ? (
                    <button type="button" className={BOTON_SECUNDARIO} disabled={ocupado} onClick={() => desconectar.mutate(c.id)}>
                      {t('bot.canales.confirmarDesconectar')}
                    </button>
                  ) : (
                    <button
                      type="button" className={BOTON_SECUNDARIO} disabled={ocupado}
                      aria-label={t('bot.canales.desconectarDe', { nombre })} onClick={() => setADesconectar(c.id)}
                    >
                      {t('bot.canales.desconectar')}
                    </button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
