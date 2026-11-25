import { useTranslation } from 'react-i18next'
import { formatPrice, formatUSD } from '@/utils/format'
import { anchoBarra, pasosEmbudo } from './botHelpers'
import type { MetricasBot, SegmentoBot } from './botTypes'
import { TARJETA } from './useBot'

function Tarjeta({ titulo, valor, detalle }: Readonly<{ titulo: string; valor: string; detalle?: string }>) {
  return (
    <div className={TARJETA}>
      <p className="text-xs font-medium text-hc-muted">{titulo}</p>
      <p className="mt-1 font-display text-2xl font-bold text-hc-text">{valor}</p>
      {detalle && <p className="mt-1 text-xs text-hc-muted">{detalle}</p>}
    </div>
  )
}

/** Embudo simple: una barra por paso, con el número siempre escrito (el color no es el único indicador). */
function Embudo({ m }: Readonly<{ m: MetricasBot }>) {
  const { t } = useTranslation()
  const pasos = pasosEmbudo(m.embudo)
  const maximo = Math.max(...pasos.map((p) => p.valor))
  return (
    <section className={TARJETA} aria-labelledby="bot-embudo-titulo">
      <h3 id="bot-embudo-titulo" className="font-display text-base font-bold text-hc-text">{t('bot.metricas.embudoTitulo')}</h3>
      <ol className="mt-3 grid gap-3">
        {pasos.map((p) => (
          <li key={p.clave}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-hc-text">{t(`bot.metricas.${p.clave}`)}</span>
              <span className="font-bold text-hc-text">{p.valor}</span>
            </div>
            <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-[var(--hc-n-100)]" aria-hidden="true">
              <div className="h-full rounded-full bg-hc-primary" style={{ width: `${anchoBarra(p.valor, maximo)}%` }} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function TablaSegmentos({ titulo, filas, tipo }: Readonly<{ titulo: string; filas: SegmentoBot[]; tipo: 'bots' | 'canales' }>) {
  const { t } = useTranslation()
  return (
    <section className={`${TARJETA} overflow-x-auto`}>
      <h3 className="font-display text-base font-bold text-hc-text">{titulo}</h3>
      {filas.length === 0 ? (
        <p className="mt-2 text-sm text-hc-muted">{t('bot.metricas.vacio')}</p>
      ) : (
        <table className="mt-2 w-full text-left text-sm">
          <caption className="sr-only">{titulo}</caption>
          <thead>
            <tr className="text-xs text-hc-muted">
              <th scope="col" className="py-1 pr-3 font-medium">{t('bot.metricas.colNombre')}</th>
              <th scope="col" className="py-1 pr-3 font-medium">{t('bot.metricas.conversaciones')}</th>
              <th scope="col" className="py-1 pr-3 font-medium">{t('bot.metricas.colEnlaces')}</th>
              <th scope="col" className="py-1 pr-3 font-medium">{t('bot.metricas.colPagados')}</th>
              <th scope="col" className="py-1 font-medium">{t('bot.metricas.colConversion')}</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.clave} className="border-t border-hc-border text-hc-text">
                <th scope="row" className="py-2 pr-3 font-medium">{t(`bot.metricas.${tipo}.${f.clave}`, { defaultValue: f.clave })}</th>
                <td className="py-2 pr-3">{f.conversaciones}</td>
                <td className="py-2 pr-3">{f.enlacesCreados}</td>
                <td className="py-2 pr-3">{f.enlacesPagados}</td>
                <td className="py-2 font-bold">{f.conversionPct.toFixed(1)} %</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

/** Tarjetas, embudo y conversión de un alcance (el negocio, HotClick o toda la plataforma). */
export default function MetricasBloque({ titulo, m }: Readonly<{ titulo: string; m: MetricasBot }>) {
  const { t } = useTranslation()
  const porVenta = m.costos.costoPorVentaUsd
  return (
    <section className="grid gap-3" aria-label={titulo}>
      <h2 className="font-display text-lg font-bold text-hc-text">{titulo}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Tarjeta titulo={t('bot.metricas.ventasCantidad')} valor={String(m.ventas.cantidad)} />
        <Tarjeta titulo={t('bot.metricas.ventasTotal')} valor={formatPrice(m.ventas.totalColones)} />
        <Tarjeta titulo={t('bot.metricas.traspasos')} valor={String(m.traspasosAPersona)} />
        <Tarjeta
          titulo={t('bot.metricas.perdidas')} valor={formatPrice(m.perdidas.totalColones)}
          detalle={t('bot.metricas.perdidasDetalle', { n: m.perdidas.cantidad })}
        />
        <Tarjeta titulo={t('bot.metricas.costoIA')} valor={formatUSD(m.costos.costoUsd)} detalle={t('bot.metricas.costoNota')} />
        <Tarjeta
          titulo={t('bot.metricas.costoPorVenta')} valor={porVenta == null ? t('bot.metricas.sinVentas') : formatUSD(porVenta)}
        />
      </div>
      <Embudo m={m} />
      <div className="grid gap-3 lg:grid-cols-2">
        <TablaSegmentos titulo={t('bot.metricas.porBot')} filas={m.porBot} tipo="bots" />
        <TablaSegmentos titulo={t('bot.metricas.porCanal')} filas={m.porCanal} tipo="canales" />
      </div>
      {m.ventas.porCanal.length > 0 && (
        <p className="text-sm text-hc-muted">
          {m.ventas.porCanal.map((v) => `${t(`bot.metricas.canales.${v.canal}`, { defaultValue: v.canal })}: ${v.cantidad} (${formatPrice(v.totalColones)})`).join(' · ')}
        </p>
      )}
    </section>
  )
}
