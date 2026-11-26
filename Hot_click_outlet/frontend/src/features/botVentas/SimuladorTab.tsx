import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { botService } from './botService'
import { MENSAJE_SIMULADOR_MAX } from './botHelpers'
import type { ResultadoSimulador, TurnoSimulador } from './botTypes'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CONTROL, TARJETA, useAccionBot } from './useBot'

/** Simulador (AG-22): conversá con tu bot como lo haría un cliente. No crea pedidos ni envía nada por WhatsApp. */
export default function SimuladorTab() {
  const { t } = useTranslation()
  const [turnos, setTurnos] = useState<TurnoSimulador[]>([])
  const [texto, setTexto] = useState('')
  const [pasoAPersona, setPasoAPersona] = useState(false)
  const enviar = useAccionBot(
    (v: { mensaje: string; historial: TurnoSimulador[] }) => botService.simular(v.mensaje, v.historial),
    {
      onExito: (r: ResultadoSimulador) => {
        setTurnos((x) => [...x, { rol: 'bot', texto: r.texto }])
        setPasoAPersona(r.pasoAPersona)
      },
    },
  )
  const mensaje = texto.trim()
  const puede = mensaje.length > 0 && mensaje.length <= MENSAJE_SIMULADOR_MAX && !enviar.isPending

  const mandar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!puede) return
    const historial = turnos
    setTurnos([...historial, { rol: 'usuario', texto: mensaje }])
    setTexto('')
    setPasoAPersona(false)
    enviar.mutate({ mensaje, historial })
  }

  return (
    <div className="grid max-w-2xl gap-3">
      <p className="rounded-[12px] bg-[var(--hc-info-bg)] p-3 text-sm text-hc-text">{t('bot.simulador.aviso')}</p>
      <div
        role="log" aria-live="polite" aria-label={t('bot.simulador.conversacion')}
        className={`${TARJETA} flex min-h-[280px] flex-col gap-2 overflow-y-auto md:max-h-[480px]`}
      >
        {turnos.length === 0 && <p className="m-auto text-center text-sm text-hc-muted">{t('bot.simulador.vacio')}</p>}
        {turnos.map((m, i) => (
          <p
            key={`${i}-${m.rol}`}
            className={`max-w-[85%] whitespace-pre-line rounded-[14px] px-3 py-2 text-sm ${m.rol === 'usuario' ? 'self-end bg-hc-primary text-white' : 'self-start bg-[var(--hc-n-100)] text-hc-text'}`}
          >
            <span className="sr-only">{m.rol === 'usuario' ? t('bot.simulador.tu') : t('bot.simulador.bot')}: </span>
            {m.texto}
          </p>
        ))}
        {enviar.isPending && <p role="status" className="text-sm text-hc-muted">{t('bot.simulador.pensando')}</p>}
      </div>
      {pasoAPersona && <p role="status" className="text-sm font-medium text-hc-text">{t('bot.simulador.pasoAPersona')}</p>}
      <form onSubmit={mandar} className="flex flex-wrap gap-2" aria-label={t('bot.simulador.formulario')}>
        <label className="min-w-0 flex-1 text-sm font-medium text-hc-text">
          <span className="sr-only">{t('bot.simulador.mensaje')}</span>
          <input
            className={CONTROL} value={texto} maxLength={MENSAJE_SIMULADOR_MAX} autoComplete="off"
            placeholder={t('bot.simulador.placeholder')} onChange={(e) => setTexto(e.target.value)}
          />
        </label>
        <button type="submit" className={BOTON_PRIMARIO} disabled={!puede}>{t('bot.simulador.enviar')}</button>
        <button
          type="button" className={BOTON_SECUNDARIO} disabled={turnos.length === 0}
          onClick={() => { setTurnos([]); setPasoAPersona(false) }}
        >
          {t('bot.simulador.reiniciar')}
        </button>
      </form>
    </div>
  )
}
