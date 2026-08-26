import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { stagger } from './dashboardHelpers'

const SUB_TONE = {
  up: 'text-emerald-400',
  down: 'text-red-400',
  neutral: 'text-[#8e8e9a]',
}

/**
 * @param {{
 *   cards: {
 *     label: string,
 *     value: string|number,
 *     icon: import('react').ReactNode,
 *     color: string,
 *     sub: string,
 *     subTone?: 'up'|'down'|'neutral',
 *     to?: string,
 *   }[]
 * }} props
 */
export default function KpiCards({ cards }) {
  return (
    <motion.div
      variants={stagger.container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4"
    >
      {cards.map((card) => (
        <KpiCard key={card.label} card={card} />
      ))}
    </motion.div>
  )
}

function KpiCard({ card }) {
  const className = 'bg-[#111114] border border-white/8 rounded-2xl p-3 sm:p-5 block'
  const inner = <KpiCardInner card={card} />
  if (card.to) {
    return (
      <motion.div variants={stagger.item}>
        <Link to={card.to} className={`${className} hover:border-white/20 transition-colors`}>
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

function KpiCardInner({ card }) {
  const subClass = SUB_TONE[card.subTone] ?? SUB_TONE.neutral
  return (
    <>
      <div className="flex items-start justify-between mb-1.5 sm:mb-2">
        <span className="w-4 h-4 sm:w-5 sm:h-5 text-[#8e8e9a]">{card.icon}</span>
        <div
          className={`text-lg sm:text-2xl ${card.color} leading-none`}
          style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}
        >
          {card.value}
        </div>
      </div>
      <p className="text-xs sm:text-sm font-medium text-[#e8e8ed] leading-tight">{card.label}</p>
      <p className={`text-[10px] sm:text-xs mt-0.5 ${subClass}`}>{card.sub}</p>
    </>
  )
}
