import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { botService } from './botService'
import { CONTENIDO_MAX, TITULO_MAX } from './botHelpers'
import type { Conocimiento, PedidoConocimiento } from './botTypes'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CLAVE_BOT, CONTROL, TARJETA, useAccionBot, useConsultaBot } from './useBot'

const VACIO: PedidoConocimiento = { titulo: '', contenido: '', categoria: null, activo: true }

/** Conocimiento de la tienda: lo que el bot consulta para políticas, envíos, horarios y preguntas frecuentes. */
export default function ConocimientoTab() {
  const { t } = useTranslation()
  const q = useConsultaBot(['conocimiento'], botService.conocimiento)
  const [edicion, setEdicion] = useState<{ id: number | null; datos: PedidoConocimiento } | null>(null)
  const [aBorrar, setABorrar] = useState<number | null>(null)
  const invalidar = [...CLAVE_BOT, 'conocimiento']
  const guardar = useAccionBot(
    (v: { id: number | null; datos: PedidoConocimiento }) =>
      v.id == null ? botService.crearConocimiento(v.datos) : botService.actualizarConocimiento(v.id, v.datos),
    { invalidar, exito: t('bot.conocimiento.guardado'), onExito: () => setEdicion(null) },
  )
  const borrar = useAccionBot(botService.eliminarConocimiento, {
    invalidar, exito: t('bot.conocimiento.eliminado'), onExito: () => setABorrar(null),
  })
  const items = q.data ?? []
  const valido = edicion != null && edicion.datos.titulo.trim() !== '' && edicion.datos.contenido.trim() !== ''

  return (
    <div className="grid max-w-3xl gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-hc-muted">{t('bot.conocimiento.ayuda')}</p>
        <button type="button" className={BOTON_PRIMARIO} onClick={() => setEdicion({ id: null, datos: VACIO })}>
          {t('bot.conocimiento.nuevo')}
        </button>
      </div>

      {edicion && (
        <form
          className={`${TARJETA} grid gap-3`} aria-label={t('bot.conocimiento.formulario')}
          onSubmit={(e) => { e.preventDefault(); if (valido) guardar.mutate(edicion) }}
        >
          <label className="flex flex-col gap-1 text-sm font-medium text-hc-text">
            {t('bot.conocimiento.titulo')}
            <input
              className={CONTROL} maxLength={TITULO_MAX} value={edicion.datos.titulo}
              onChange={(e) => setEdicion({ ...edicion, datos: { ...edicion.datos, titulo: e.target.value } })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-hc-text">
            {t('bot.conocimiento.contenido')}
            <textarea
              className={`${CONTROL} py-2`} rows={5} maxLength={CONTENIDO_MAX} value={edicion.datos.contenido}
              onChange={(e) => setEdicion({ ...edicion, datos: { ...edicion.datos, contenido: e.target.value } })}
            />
            <span className="text-xs font-normal text-hc-muted">
              {t('bot.conocimiento.contador', { n: edicion.datos.contenido.length, max: CONTENIDO_MAX })}
            </span>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-hc-text">
            {t('bot.conocimiento.categoria')}
            <input
              className={CONTROL} maxLength={50} value={edicion.datos.categoria ?? ''}
              onChange={(e) => setEdicion({ ...edicion, datos: { ...edicion.datos, categoria: e.target.value || null } })}
            />
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm text-hc-text">
            <input
              type="checkbox" className="size-5" checked={edicion.datos.activo}
              onChange={(e) => setEdicion({ ...edicion, datos: { ...edicion.datos, activo: e.target.checked } })}
            />
            {t('bot.conocimiento.activo')}
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={BOTON_PRIMARIO} disabled={!valido || guardar.isPending}>
              {guardar.isPending ? t('bot.guardando') : t('bot.guardar')}
            </button>
            <button type="button" className={BOTON_SECUNDARIO} onClick={() => setEdicion(null)}>{t('bot.cancelar')}</button>
          </div>
        </form>
      )}

      {q.isLoading && <p role="status" className="text-sm text-hc-muted">{t('bot.cargando')}</p>}
      {q.isError && <p role="alert" className="text-sm text-[var(--hc-danger)]">{t('bot.errorCargar')}</p>}
      {!q.isLoading && !q.isError && items.length === 0 && (
        <div className={`${TARJETA} text-center`}>
          <p className="font-bold text-hc-text">{t('bot.conocimiento.vacioTitulo')}</p>
          <p className="mt-1 text-sm text-hc-muted">{t('bot.conocimiento.vacioMensaje')}</p>
        </div>
      )}
      <ul aria-label={t('bot.conocimiento.lista')} className="grid gap-2">
        {items.map((k: Conocimiento) => (
          <li key={k.id} className={TARJETA}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-hc-text">{k.titulo}</p>
                <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-hc-muted">{k.contenido}</p>
                <p className="mt-2 flex flex-wrap gap-2 text-xs">
                  {k.categoria && <span className="rounded-full border border-[var(--hc-blue-100)] px-2 py-0.5 text-[var(--hc-blue-600)]">{k.categoria}</span>}
                  <span className="text-hc-muted">{k.activo ? t('bot.conocimiento.estadoActivo') : t('bot.conocimiento.estadoInactivo')}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button" className={BOTON_SECUNDARIO} aria-label={t('bot.conocimiento.editarDe', { titulo: k.titulo })}
                  onClick={() => setEdicion({ id: k.id, datos: { titulo: k.titulo, contenido: k.contenido, categoria: k.categoria, activo: k.activo } })}
                >
                  {t('bot.editar')}
                </button>
                {aBorrar === k.id ? (
                  <button
                    type="button" className={BOTON_SECUNDARIO} disabled={borrar.isPending}
                    onClick={() => borrar.mutate(k.id)}
                  >
                    {t('bot.confirmarEliminar')}
                  </button>
                ) : (
                  <button
                    type="button" className={BOTON_SECUNDARIO} aria-label={t('bot.conocimiento.eliminarDe', { titulo: k.titulo })}
                    onClick={() => setABorrar(k.id)}
                  >
                    {t('bot.eliminar')}
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
