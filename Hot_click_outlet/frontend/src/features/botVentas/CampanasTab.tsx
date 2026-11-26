import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatUSD } from '@/utils/format'
import { campanaService } from './campanaService'
import { puedeLanzar, porcentaje } from './campanaHelpers'
import { formatearFecha } from './botHelpers'
import type { Campana, MetricasCampana, PlantillaMarketing } from './campanaTypes'
import CatalogoMetaCard from './CatalogoMetaCard'
import NuevaCampana from './NuevaCampana'
import PlantillasMarketingSeccion from './PlantillasMarketing'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CLAVE_BOT, TARJETA, useAccionBot, useConsultaBot } from './useBot'

function Metrica({ etiqueta, valor, total }: Readonly<{ etiqueta: string; valor: number; total: number }>) {
  return (
    <div className="rounded-[12px] border border-hc-border p-3">
      <dt className="text-xs text-hc-muted">{etiqueta}</dt>
      <dd className="font-display text-xl font-bold text-hc-text">
        {valor}
        {total > 0 && <span className="ml-1 text-sm font-normal text-hc-muted">({porcentaje(valor, total)}%)</span>}
      </dd>
    </div>
  )
}

function Metricas({ m }: Readonly<{ m: MetricasCampana }>) {
  const { t } = useTranslation()
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label={t('bot.campanas.metricas.titulo')}>
      <Metrica etiqueta={t('bot.campanas.metricas.enviados')} valor={m.enviados} total={m.total} />
      <Metrica etiqueta={t('bot.campanas.metricas.entregados')} valor={m.entregados} total={m.enviados} />
      <Metrica etiqueta={t('bot.campanas.metricas.leidos')} valor={m.leidos} total={m.enviados} />
      <Metrica etiqueta={t('bot.campanas.metricas.respondidos')} valor={m.respondidos} total={m.enviados} />
      <Metrica etiqueta={t('bot.campanas.metricas.fallidos')} valor={m.fallidos} total={m.total} />
      <Metrica etiqueta={t('bot.campanas.metricas.omitidos')} valor={m.omitidos} total={m.total} />
    </dl>
  )
}

/** Detalle: estimación de alcance y costo ANTES de lanzar (Meta cobra cada mensaje al negocio) y métricas después. */
function DetalleCampana({ c, plantilla }: Readonly<{ c: Campana; plantilla: PlantillaMarketing | undefined }>) {
  const { t } = useTranslation()
  const [confirmando, setConfirmando] = useState(false)
  const invalidar = [...CLAVE_BOT, 'campanas']
  const detalle = useConsultaBot(['campanas', 'detalle', c.id, c.estado], () => campanaService.campana(c.id))
  const estimacion = useConsultaBot(['campanas', 'estimacion', c.id], () => campanaService.estimarCampana(c.id), c.estado === 'BORRADOR')
  const lanzar = useAccionBot((costo: number) => campanaService.lanzarCampana(c.id, costo), {
    invalidar, exito: t('bot.campanas.lanzada'), onExito: () => setConfirmando(false),
  })
  const cancelar = useAccionBot(() => campanaService.cancelarCampana(c.id), { invalidar, exito: t('bot.campanas.cancelada') })
  const e = estimacion.data

  return (
    <div className="mt-3 grid gap-3 border-t border-hc-border pt-3">
      {c.estado === 'BORRADOR' && (
        <div className="grid gap-2">
          {estimacion.isLoading && <p role="status" className="text-sm text-hc-muted">{t('bot.cargando')}</p>}
          {estimacion.isError && <p role="alert" className="text-sm text-[var(--hc-danger)]">{t('bot.errorCargar')}</p>}
          {e && (
            <>
              <ul className="grid gap-1 text-sm text-hc-text">
                <li>{t('bot.campanas.estimacion.conConsentimiento', { n: e.conConsentimiento })}</li>
                <li>{t('bot.campanas.estimacion.excluidosBaja', { n: e.excluidosPorBaja })}</li>
                <li>{t('bot.campanas.estimacion.excluidosTope', { n: e.excluidosPorTopeContacto })}</li>
                <li className="font-bold">{t('bot.campanas.estimacion.permitidos', { n: e.permitidos })}</li>
                <li className="text-xs text-hc-muted">{t('bot.campanas.estimacion.topeMes', { resta: e.restanteMes, tope: e.topeMensual })}</li>
              </ul>
              <p className="rounded-[12px] bg-[var(--hc-info-bg)] p-3 text-sm text-hc-text" role="status">
                {t('bot.campanas.estimacion.costo', { costo: formatUSD(e.costoEstimadoUsd) })}
              </p>
              <p className="text-xs text-hc-muted">{t('bot.campanas.estimacion.costoAviso')}</p>
              {!confirmando ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button" className={BOTON_PRIMARIO}
                    disabled={!puedeLanzar(c.estado, plantilla?.estado, e.permitidos)} onClick={() => setConfirmando(true)}
                  >
                    {t('bot.campanas.lanzar')}
                  </button>
                  <button type="button" className={BOTON_SECUNDARIO} disabled={cancelar.isPending} onClick={() => cancelar.mutate(undefined)}>
                    {t('bot.campanas.descartar')}
                  </button>
                </div>
              ) : (
                <div role="alertdialog" aria-label={t('bot.campanas.confirmar.titulo')} className="grid gap-2 rounded-[12px] border border-hc-border p-3">
                  <p className="text-sm font-bold text-hc-text">{t('bot.campanas.confirmar.texto', { n: e.permitidos, costo: formatUSD(e.costoEstimadoUsd) })}</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={BOTON_PRIMARIO} disabled={lanzar.isPending} onClick={() => lanzar.mutate(e.costoEstimadoUsd)}>
                      {lanzar.isPending ? t('bot.guardando') : t('bot.campanas.confirmar.si')}
                    </button>
                    <button type="button" className={BOTON_SECUNDARIO} onClick={() => setConfirmando(false)}>{t('bot.cancelar')}</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
      {c.estado !== 'BORRADOR' && detalle.data && <Metricas m={detalle.data.metricas} />}
      {c.estado === 'EN_CURSO' && (
        <div>
          <button type="button" className={BOTON_SECUNDARIO} disabled={cancelar.isPending} onClick={() => cancelar.mutate(undefined)}>
            {t('bot.campanas.cancelar')}
          </button>
        </div>
      )}
    </div>
  )
}

/** Pestaña «Campañas» (AG-36): solo a clientes que aceptaron recibirlas; STOP siempre se respeta. */
export default function CampanasTab() {
  const { t } = useTranslation()
  const consent = useConsultaBot(['campanas', 'consentimientos'], campanaService.consentimientos)
  const plantillas = useConsultaBot(['campanas', 'plantillas'], campanaService.plantillas)
  const lista = useConsultaBot(['campanas', 'lista'], campanaService.campanas)
  const [nueva, setNueva] = useState(false)
  const [abierta, setAbierta] = useState<number | null>(null)
  const items = lista.data ?? []
  const pl = plantillas.data ?? []

  return (
    <div className="grid max-w-4xl gap-6">
      <section className={`${TARJETA} grid gap-1`} aria-labelledby="camp-consent">
        <h2 id="camp-consent" className="font-display text-lg font-bold text-hc-text">{t('bot.campanas.consentimientos.titulo')}</h2>
        <p className="text-sm text-hc-text">
          {t('bot.campanas.consentimientos.resumen', { activos: consent.data?.activos ?? 0, revocados: consent.data?.revocados ?? 0 })}
        </p>
        <p className="text-xs text-hc-muted">{t('bot.campanas.consentimientos.ayuda')}</p>
      </section>

      <PlantillasMarketingSeccion />

      <section className="grid gap-3" aria-labelledby="camp-lista">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="camp-lista" className="font-display text-lg font-bold text-hc-text">{t('bot.campanas.titulo')}</h2>
          <button type="button" className={BOTON_PRIMARIO} onClick={() => setNueva(true)}>{t('bot.campanas.nueva.boton')}</button>
        </div>
        {nueva && <NuevaCampana plantillas={pl} alTerminar={() => setNueva(false)} />}
        {lista.isLoading && <p role="status" className="text-sm text-hc-muted">{t('bot.cargando')}</p>}
        {lista.isError && <p role="alert" className="text-sm text-[var(--hc-danger)]">{t('bot.errorCargar')}</p>}
        {!lista.isLoading && !lista.isError && items.length === 0 && (
          <div className={`${TARJETA} text-center`}>
            <p className="font-bold text-hc-text">{t('bot.campanas.vacioTitulo')}</p>
            <p className="mt-1 text-sm text-hc-muted">{t('bot.campanas.vacioMensaje')}</p>
          </div>
        )}
        <ul aria-label={t('bot.campanas.lista')} className="grid gap-2">
          {items.map((c: Campana) => (
            <li key={c.id} className={TARJETA}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-hc-text">{c.nombre}</p>
                  <p className="mt-1 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-[var(--hc-blue-100)] px-2 py-0.5 text-[var(--hc-blue-600)]">{t(`bot.campanas.estados.${c.estado}`)}</span>
                    <span className="text-hc-muted">{t(`bot.campanas.segmentos.${c.segmento.tipo}`)}</span>
                    <time dateTime={c.creadoEn} className="text-hc-muted">{formatearFecha(c.creadoEn)}</time>
                  </p>
                </div>
                <button
                  type="button" className={BOTON_SECUNDARIO} aria-expanded={abierta === c.id}
                  onClick={() => setAbierta(abierta === c.id ? null : c.id)}
                >
                  {abierta === c.id ? t('bot.leads.ocultar') : t('bot.campanas.ver')}
                </button>
              </div>
              {abierta === c.id && <DetalleCampana c={c} plantilla={pl.find((p) => p.id === c.plantillaId)} />}
            </li>
          ))}
        </ul>
      </section>

      <CatalogoMetaCard />
    </div>
  )
}
