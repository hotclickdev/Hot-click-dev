import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { botService } from './botService'
import { errorDeRango, rangoPorDefecto } from './botHelpers'
import MetricasBloque from './MetricasBloque'
import { CONTROL, TARJETA, useConsultaBot } from './useBot'

/** Métricas del bot (AG-32): embudo, conversión por bot y canal, ventas atribuidas y costo de IA. Solo lectura. */
export default function MetricasTab() {
  const { t } = useTranslation()
  const [rango, setRango] = useState(rangoPorDefecto)
  const problema = errorDeRango(rango.desde, rango.hasta)
  const q = useConsultaBot(['metricas', rango.desde, rango.hasta], () => botService.metricas(rango.desde, rango.hasta), problema == null)
  const r = q.data

  return (
    <div className="grid max-w-5xl gap-4">
      <div className="flex flex-wrap items-end gap-3" role="group" aria-label={t('bot.metricas.rangoAria')}>
        <label className="flex flex-col text-xs font-medium text-hc-muted">
          {t('bot.metricas.desde')}
          <input
            type="date" className={`${CONTROL} !w-auto`} value={rango.desde} max={rango.hasta || undefined}
            onChange={(e) => setRango((x) => ({ ...x, desde: e.target.value }))}
          />
        </label>
        <label className="flex flex-col text-xs font-medium text-hc-muted">
          {t('bot.metricas.hasta')}
          <input
            type="date" className={`${CONTROL} !w-auto`} value={rango.hasta} min={rango.desde || undefined}
            onChange={(e) => setRango((x) => ({ ...x, hasta: e.target.value }))}
          />
        </label>
      </div>

      {problema && <p role="alert" className="text-sm text-[var(--hc-danger)]">{t(problema)}</p>}
      {!problema && q.isLoading && <p role="status" className="text-sm text-hc-muted">{t('bot.cargando')}</p>}
      {!problema && q.isError && <p role="alert" className="text-sm text-[var(--hc-danger)]">{t('bot.errorCargar')}</p>}

      {r && !problema && (
        <>
          <MetricasBloque titulo={t(`bot.metricas.alcance.${r.alcance}`)} m={r.propias} />
          {r.plataforma && <MetricasBloque titulo={t('bot.metricas.alcance.PLATAFORMA')} m={r.plataforma} />}
          {r.alertasMeta && (
            <section className={TARJETA} aria-labelledby="bot-alertas-meta">
              <h3 id="bot-alertas-meta" className="font-display text-base font-bold text-hc-text">{t('bot.metricas.alertasTitulo')}</h3>
              {r.alertasMeta.length === 0 ? (
                <p className="mt-2 text-sm text-hc-muted">{t('bot.metricas.alertasVacio')}</p>
              ) : (
                <ul className="mt-2 grid gap-1 text-sm text-hc-text">
                  {r.alertasMeta.map((a) => (
                    <li key={`${a.creadoEn}-${a.campo}-${a.evento ?? ''}`}>
                      <time dateTime={a.creadoEn} className="text-hc-muted">{new Date(a.creadoEn).toLocaleString('es-CR')}</time>
                      {' · '}{a.campo}{a.evento ? ` · ${a.evento}` : ''}{a.limite ? ` · ${a.limite}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}
