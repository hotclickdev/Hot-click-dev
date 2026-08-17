import { motion } from 'framer-motion'
import { stagger } from './dashboardHelpers'

/**
 * @param {{
 *   cards: { label: string, value: string|number, icon: import('react').ReactNode, color: string, sub: string }[]
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
        <motion.div
          key={card.label}
          variants={stagger.item}
          className="bg-[#111114] border border-white/8 rounded-2xl p-3 sm:p-5"
        >
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
          <p className="text-[10px] sm:text-xs text-[#8e8e9a] mt-0.5">{card.sub}</p>
        </motion.div>
      ))}
    </motion.div>
  )
}
