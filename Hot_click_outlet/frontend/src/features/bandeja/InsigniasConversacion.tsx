import { useTranslation } from 'react-i18next'
import type { CanalBandeja, ModoBandeja } from './bandejaTypes'

const ESTILO_CANAL: Record<CanalBandeja, string> = {
  WHATSAPP: 'bg-[var(--hc-success-bg)] text-[var(--hc-success-text)]',
  INSTAGRAM: 'bg-[var(--hc-danger-bg)] text-[var(--hc-red-700)]',
  MESSENGER: 'bg-[var(--hc-info-bg)] text-[var(--hc-info)]',
}

const ESTILO_MODO: Record<ModoBandeja, string> = {
  BOT: 'bg-[var(--hc-info-bg)] text-[var(--hc-info)]',
  PERSONA: 'bg-[var(--hc-warning-bg)] text-[var(--hc-warning)]',
}

const BASE = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold'

/** Canal de la conversación. Siempre lleva texto: el color nunca es el único indicador. */
export function InsigniaCanal({ canal }: Readonly<{ canal: CanalBandeja }>) {
  const { t } = useTranslation()
  return <span className={`${BASE} ${ESTILO_CANAL[canal] ?? ESTILO_MODO.BOT}`}>{t(`bandeja.canal.${canal}`)}</span>
}

/** Quién atiende ahora: el bot o una persona. */
export function InsigniaModo({ modo }: Readonly<{ modo: ModoBandeja }>) {
  const { t } = useTranslation()
  return <span className={`${BASE} ${ESTILO_MODO[modo]}`}>{t(`bandeja.modo.${modo}`)}</span>
}

/** El plan llegó a su cupo: el bot ya no responde en esta conversación. Lleva texto, no solo color. */
export function InsigniaCupoAgotado() {
  const { t } = useTranslation()
  return <span className={`${BASE} bg-[var(--hc-warning-bg)] text-[var(--hc-warning)]`}>{t('bandeja.cupoAgotado')}</span>
}
