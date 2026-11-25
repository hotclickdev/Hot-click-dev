import { useTranslation } from 'react-i18next'
import { formatUSD } from '@/utils/format'
import { botService } from './botService'
import { cupoAgotado, porcentajeCupo } from './botHelpers'
import { TARJETA, useConsultaBot } from './useBot'

/** Uso del mes del bot: conversaciones contra el cupo del plan, costo de IA y tope. Solo lectura. */
export default function UsoMes() {
  const { t } = useTranslation()
  const q = useConsultaBot(['uso'], botService.uso)
  const u = q.data
  if (q.isLoading) return <p role="status" className="text-sm text-hc-muted">{t('bot.uso.cargando')}</p>
  if (q.isError || !u) return null

  const pct = porcentajeCupo(u.conversaciones, u.cupo)
  const agotado = cupoAgotado(u.conversaciones, u.cupo)
  const ilimitado = u.cupo != null && u.cupo < 0

  return (
    <section className={`${TARJETA} grid gap-2`} aria-labelledby="bot-uso-titulo">
      <h2 id="bot-uso-titulo" className="font-display text-base font-bold text-hc-text">
        {t('bot.uso.titulo', { mes: u.mes })}
      </h2>
      <p className="text-sm text-hc-text">
        {u.cupo == null || ilimitado
          ? t('bot.uso.conversacionesSinCupo', { n: u.conversaciones })
          : t('bot.uso.conversaciones', { n: u.conversaciones, cupo: u.cupo })}
      </p>
      {pct != null && (
        <div
          role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
          aria-label={t('bot.uso.progresoAria')} className="h-2 w-full overflow-hidden rounded-full bg-[var(--hc-n-100)]"
        >
          <div className={`h-full ${agotado ? 'bg-[var(--hc-danger)]' : 'bg-hc-primary'}`} style={{ width: `${pct}%` }} />
        </div>
      )}
      {agotado && <p role="alert" className="text-sm font-medium text-[var(--hc-danger)]">{t('bot.uso.cupoAgotado')}</p>}
      {!u.agenteIncluido && <p className="text-sm text-hc-muted">{t('bot.uso.noIncluido')}</p>}
      <p className="text-sm text-hc-muted">
        {u.topeUsd == null
          ? t('bot.uso.costoSinTope', { costo: formatUSD(u.costoUsd) })
          : t('bot.uso.costo', { costo: formatUSD(u.costoUsd), tope: formatUSD(u.topeUsd) })}
      </p>
    </section>
  )
}
