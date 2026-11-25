import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  MAX_TEXTO_RESPUESTA,
  formatearMomento,
  nombreAsignado,
  puedeResponder,
  textoRespuestaValido,
} from './bandejaHelpers'
import type { DetalleBandeja, EstadoResumen, MiembroBandeja } from './bandejaTypes'
import PanelResumen from './PanelResumen'
import { InsigniaCanal, InsigniaModo } from './InsigniasConversacion'

type Props = Readonly<{
  detalle: DetalleBandeja
  equipo: MiembroBandeja[]
  ocupado: boolean
  onVolver: () => void
  onPausar: () => void
  onReanudar: () => void
  onTomar: () => void
  onAsignar: (usuarioId: number) => void
  onCerrar: () => void
  /** Devuelve true si se envió (para limpiar la caja). */
  onEnviar: (texto: string) => Promise<boolean>
  /** Panel "Resumen" (AG-17); sin estas props no se muestra. */
  resumen?: EstadoResumen
  onGenerarResumen?: () => void
}>

const BOTON = 'min-h-11 rounded-[10px] border border-hc-border bg-hc-surface px-4 text-sm font-bold text-hc-text transition-colors hover:border-hc-primary disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hc-blue-600)]'

function claseBurbuja(rol: string): string {
  if (rol === 'user') return 'self-start bg-[var(--hc-n-100)] text-hc-text'
  if (rol === 'persona') return 'self-end bg-hc-primary text-white'
  if (rol === 'system') return 'self-center bg-transparent text-hc-muted text-xs'
  return 'self-end bg-[var(--hc-info-bg)] text-hc-text'
}

/** Detalle de una conversación: encabezado con acciones, hilo estilo mensajería y caja para responder. */
export default function HiloConversacion({
  detalle, equipo, ocupado, onVolver, onPausar, onReanudar, onTomar, onAsignar, onCerrar, onEnviar,
  resumen, onGenerarResumen,
}: Props) {
  const { t } = useTranslation()
  const { conversacion: c, mensajes } = detalle
  const [texto, setTexto] = useState('')
  const [destino, setDestino] = useState('')
  const [confirmaCierre, setConfirmaCierre] = useState(false)
  const idCaja = useId()
  const idAyuda = useId()
  const idAsignar = useId()
  const finRef = useRef<HTMLDivElement | null>(null)
  const ultimoId = mensajes.length > 0 ? mensajes[mensajes.length - 1].id : null

  useEffect(() => {
    finRef.current?.scrollIntoView?.({ block: 'end' })
  }, [ultimoId, c.id])

  const abierta = c.estado === 'ABIERTA'
  const puede = puedeResponder(c)
  const asignado = nombreAsignado(c, equipo, { yo: t('bandeja.asignadoAMi'), otra: t('bandeja.asignadoAOtra') })

  async function enviar(e?: FormEvent) {
    e?.preventDefault()
    if (!puede || ocupado || !textoRespuestaValido(texto)) return
    if (await onEnviar(texto.trim())) setTexto('')
  }

  function alTeclear(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void enviar()
  }

  let ayuda = t('bandeja.ayudaEnviar')
  if (!abierta) ayuda = t('bandeja.avisoCerrada')
  else if (!c.ventanaAbierta) ayuda = t('bandeja.avisoVentana')

  return (
    <section aria-label={t('bandeja.detalleAria')} className="flex h-full min-h-0 flex-col">
      <header className="border-b border-hc-border p-4">
        <button
          type="button" onClick={onVolver}
          className="mb-2 min-h-11 text-sm font-bold text-[var(--hc-blue-600)] md:hidden"
        >
          {t('bandeja.volver')}
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <InsigniaCanal canal={c.canal} />
          <h2 className="font-mono text-base font-bold text-hc-text">{c.contacto}</h2>
          <InsigniaModo modo={c.modo} />
          {!abierta && (
            <span className="rounded-full bg-[var(--hc-n-100)] px-2.5 py-0.5 text-[11px] font-bold text-hc-muted">
              {t('bandeja.estado.CERRADA')}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-hc-muted">
          {asignado ? t('bandeja.atiende', { nombre: asignado }) : t('bandeja.sinAsignar')}
        </p>

        {abierta && (
          <div className="mt-3 flex flex-wrap items-end gap-2">
            {c.modo === 'BOT' ? (
              <button type="button" className={BOTON} disabled={ocupado} onClick={onPausar}>
                {t('bandeja.acciones.pausarBot')}
              </button>
            ) : (
              <button type="button" className={BOTON} disabled={ocupado} onClick={onReanudar}>
                {t('bandeja.acciones.reanudarBot')}
              </button>
            )}
            {!c.asignadaAMi && (
              <button type="button" className={BOTON} disabled={ocupado} onClick={onTomar}>
                {t('bandeja.acciones.tomar')}
              </button>
            )}
            <div className="flex items-end gap-2">
              <div className="flex flex-col">
                <label htmlFor={idAsignar} className="text-xs font-medium text-hc-muted">
                  {t('bandeja.acciones.asignarA')}
                </label>
                <select
                  id={idAsignar} value={destino} onChange={(e) => setDestino(e.target.value)}
                  className="min-h-11 rounded-[10px] border border-hc-border bg-hc-surface px-3 text-sm text-hc-text"
                >
                  <option value="">{t('bandeja.acciones.elegirPersona')}</option>
                  {equipo.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>
              <button
                type="button" className={BOTON} disabled={ocupado || destino === ''}
                onClick={() => onAsignar(Number(destino))}
              >
                {t('bandeja.acciones.asignar')}
              </button>
            </div>
            {confirmaCierre ? (
              <span className="flex items-center gap-2">
                <button
                  type="button" className={`${BOTON} border-[var(--hc-danger)] text-[var(--hc-danger)]`}
                  disabled={ocupado} onClick={onCerrar}
                >
                  {t('bandeja.acciones.confirmarCerrar')}
                </button>
                <button type="button" className={BOTON} onClick={() => setConfirmaCierre(false)}>
                  {t('bandeja.acciones.cancelar')}
                </button>
              </span>
            ) : (
              <button type="button" className={BOTON} disabled={ocupado} onClick={() => setConfirmaCierre(true)}>
                {t('bandeja.acciones.cerrar')}
              </button>
            )}
          </div>
        )}
      </header>

      {onGenerarResumen && (
        <PanelResumen
          estado={resumen ?? { tipo: 'inactivo' }} onGenerar={onGenerarResumen}
          onUsar={(s) => setTexto(s.slice(0, MAX_TEXTO_RESPUESTA))}
        />
      )}

      <div
        role="log" aria-live="polite" aria-label={t('bandeja.hiloAria')}
        className="flex min-h-[240px] flex-1 flex-col gap-2 overflow-y-auto bg-hc-bg p-4"
      >
        {mensajes.length === 0 && <p className="text-sm text-hc-muted">{t('bandeja.sinMensajes')}</p>}
        {mensajes.map((m) => (
          <div key={m.id} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${claseBurbuja(m.rol)}`}>
            <p className="whitespace-pre-wrap break-words">{m.texto}</p>
            <p className="mt-1 text-[11px] opacity-80">
              {t(`bandeja.rol.${['user', 'assistant', 'persona', 'system'].includes(m.rol) ? m.rol : 'system'}`)}
              {' · '}
              <time dateTime={m.fecha}>{formatearMomento(m.fecha)}</time>
            </p>
          </div>
        ))}
        <div ref={finRef} />
      </div>

      <form onSubmit={enviar} className="border-t border-hc-border bg-hc-surface p-4">
        <label htmlFor={idCaja} className="text-sm font-bold text-hc-text">{t('bandeja.responder')}</label>
        <textarea
          id={idCaja} value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={alTeclear}
          rows={3} maxLength={MAX_TEXTO_RESPUESTA} disabled={!puede}
          aria-describedby={idAyuda}
          className="mt-1 w-full rounded-[10px] border border-hc-border bg-hc-surface p-3 text-sm text-hc-text disabled:cursor-not-allowed disabled:bg-[var(--hc-n-100)]"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p id={idAyuda} className={`text-xs ${puede ? 'text-hc-muted' : 'font-medium text-[var(--hc-warning)]'}`}>
            {ayuda}
          </p>
          <button
            type="submit"
            disabled={!puede || ocupado || !textoRespuestaValido(texto)}
            className="min-h-11 rounded-[10px] bg-hc-primary px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hc-blue-600)]"
          >
            {t('bandeja.acciones.enviar')}
          </button>
        </div>
      </form>
    </section>
  )
}
