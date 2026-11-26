import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { campanaService } from './campanaService'
import { contarVariables, nombrePlantillaValido, variableAlBorde } from './campanaHelpers'
import type { EstadoPlantilla, PlantillaMarketing } from './campanaTypes'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CLAVE_BOT, CONTROL, TARJETA, useAccionBot, useConsultaBot } from './useBot'

const COLOR: Record<EstadoPlantilla, string> = {
  PENDIENTE: 'border-[var(--hc-blue-100)] text-[var(--hc-blue-600)]',
  APROBADA: 'border-hc-border text-hc-text',
  RECHAZADA: 'border-[var(--hc-danger)] text-[var(--hc-danger)]',
}

/** Plantillas de categoría MARKETING del negocio: se envían a Meta para su aprobación y solo las APROBADAS se usan. */
export default function PlantillasMarketingSeccion() {
  const { t } = useTranslation()
  const q = useConsultaBot(['campanas', 'plantillas'], campanaService.plantillas)
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [cuerpo, setCuerpo] = useState('')
  const [ejemplos, setEjemplos] = useState<string[]>([])
  const invalidar = [...CLAVE_BOT, 'campanas', 'plantillas']
  const crear = useAccionBot(campanaService.crearPlantilla, {
    invalidar, exito: t('bot.campanas.plantillas.enviada'),
    onExito: () => { setAbierto(false); setNombre(''); setCuerpo(''); setEjemplos([]) },
  })
  const sincronizar = useAccionBot(campanaService.sincronizarPlantilla, { invalidar })

  const variables = contarVariables(cuerpo)
  const ej = Array.from({ length: variables }, (_, i) => ejemplos[i] ?? '')
  const valido = nombrePlantillaValido(nombre) && cuerpo.trim() !== '' && !variableAlBorde(cuerpo)
    && ej.every((x) => x.trim() !== '')
  const items = q.data ?? []

  return (
    <section className="grid gap-3" aria-labelledby="camp-plantillas">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="camp-plantillas" className="font-display text-lg font-bold text-hc-text">{t('bot.campanas.plantillas.titulo')}</h2>
        <button type="button" className={BOTON_SECUNDARIO} onClick={() => setAbierto(!abierto)} aria-expanded={abierto}>
          {t('bot.campanas.plantillas.nueva')}
        </button>
      </div>
      <p className="text-sm text-hc-muted">{t('bot.campanas.plantillas.ayuda')}</p>

      {abierto && (
        <form
          className={`${TARJETA} grid gap-3`} aria-label={t('bot.campanas.plantillas.formulario')}
          onSubmit={(e) => { e.preventDefault(); if (valido) crear.mutate({ nombre, cuerpo: cuerpo.trim(), ejemplos: ej }) }}
        >
          <label className="flex flex-col gap-1 text-sm font-medium text-hc-text">
            {t('bot.campanas.plantillas.nombre')}
            <input className={CONTROL} maxLength={100} value={nombre} onChange={(e) => setNombre(e.target.value.toLowerCase())} />
            <span className="text-xs font-normal text-hc-muted">{t('bot.campanas.plantillas.nombreAyuda')}</span>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-hc-text">
            {t('bot.campanas.plantillas.texto')}
            <textarea className={`${CONTROL} py-2`} rows={4} maxLength={1024} value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} />
            <span className="text-xs font-normal text-hc-muted">{t('bot.campanas.plantillas.textoAyuda', { v1: '{{1}}', v2: '{{2}}' })}</span>
          </label>
          {variableAlBorde(cuerpo) && <p role="alert" className="text-sm text-[var(--hc-danger)]">{t('bot.campanas.plantillas.variableAlBorde')}</p>}
          {ej.map((valor, i) => (
            <label key={i} className="flex flex-col gap-1 text-sm font-medium text-hc-text">
              {t('bot.campanas.plantillas.ejemplo', { n: i + 1 })}
              <input
                className={CONTROL} maxLength={100} value={valor}
                onChange={(e) => { const c = [...ej]; c[i] = e.target.value; setEjemplos(c) }}
              />
            </label>
          ))}
          <p className="text-xs text-hc-muted">{t('bot.campanas.plantillas.aviso')}</p>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={BOTON_PRIMARIO} disabled={!valido || crear.isPending}>
              {crear.isPending ? t('bot.guardando') : t('bot.campanas.plantillas.enviar')}
            </button>
            <button type="button" className={BOTON_SECUNDARIO} onClick={() => setAbierto(false)}>{t('bot.cancelar')}</button>
          </div>
        </form>
      )}

      {q.isLoading && <p role="status" className="text-sm text-hc-muted">{t('bot.cargando')}</p>}
      {q.isError && <p role="alert" className="text-sm text-[var(--hc-danger)]">{t('bot.errorCargar')}</p>}
      {!q.isLoading && !q.isError && items.length === 0 && (
        <div className={`${TARJETA} text-center`}>
          <p className="font-bold text-hc-text">{t('bot.campanas.plantillas.vacioTitulo')}</p>
          <p className="mt-1 text-sm text-hc-muted">{t('bot.campanas.plantillas.vacioMensaje')}</p>
        </div>
      )}
      <ul aria-label={t('bot.campanas.plantillas.lista')} className="grid gap-2">
        {items.map((p: PlantillaMarketing) => (
          <li key={p.id} className={TARJETA}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-sm font-bold text-hc-text">{p.nombre}</p>
                <p className="mt-1 whitespace-pre-line text-sm text-hc-muted">{p.cuerpo}</p>
                <p className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className={`rounded-full border px-2 py-0.5 ${COLOR[p.estado]}`}>{t(`bot.campanas.plantillas.estados.${p.estado}`)}</span>
                  {p.motivoRechazo && <span className="text-hc-muted">{t('bot.campanas.plantillas.motivo', { motivo: p.motivoRechazo })}</span>}
                </p>
              </div>
              {p.estado === 'PENDIENTE' && (
                <button type="button" className={BOTON_SECUNDARIO} disabled={sincronizar.isPending} onClick={() => sincronizar.mutate(p.id)}>
                  {t('bot.campanas.plantillas.actualizar')}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
