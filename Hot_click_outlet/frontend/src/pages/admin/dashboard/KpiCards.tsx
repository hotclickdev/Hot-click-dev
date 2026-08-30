import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CLASE_TARJETA_DASH, stagger } from './dashboardHelpers'

const SUB_TONE = {
  up: 'text-emerald-700',
  down: 'text-red-600',
  neutral: 'text-[var(--hc-muted)]',
} as const

export type KpiSubTone = keyof typeof SUB_TONE

export type KpiCardModel = {
  label: string
  value: string | number
  icon: ReactNode
  color: string
  sub: string
  subTone?: KpiSubTone
  to?: string
}

type KpiCardsProps = {
  cards: KpiCardModel[]
}

export default function KpiCards({ cards }: KpiCardsProps) {
  return (
    <motion.div
      variants={stagger.container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4"
      data-mm="kpi-hoy"
    >
      {cards.map((card) => (
        <KpiCard key={card.label} card={card} />
      ))}
    </motion.div>
  )
}

function KpiCard({ card }: { card: KpiCardModel }) {
  const className = `${CLASE_TARJETA_DASH} p-3 sm:p-5 block`
  const inner = <KpiCardInner card={card} />
  if (card.to) {
    return (
      <motion.div variants={stagger.item}>
        <Link to={card.to} className={`${className} hover:border-[var(--hc-link)] transition-colors`}>
          {inner}
        </Link>
      </motion.div>
    )
  }
  return (
    <motion.div variants={stagger.item} className={className}>
      {inner}
    </motion.div>
  )
}

function KpiCardInner({ card }: { card: KpiCardModel }) {
  const subClass = SUB_TONE[card.subTone ?? 'neutral']
  return (
    <>
      <div className="flex items-start justify-between mb-1.5 sm:mb-2">
        <span className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--hc-muted)]">{card.icon}</span>
        <div
          className={`text-lg sm:text-2xl ${card.color} leading-none`}
          style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}
        >
          {card.value}
        </div>
      </div>
      <p className="text-xs sm:text-sm font-medium text-[var(--hc-text)] leading-tight">{card.label}</p>
      <p className={`text-[10px] sm:text-xs mt-0.5 ${subClass}`}>{card.sub}</p>
    </>
  )
}
