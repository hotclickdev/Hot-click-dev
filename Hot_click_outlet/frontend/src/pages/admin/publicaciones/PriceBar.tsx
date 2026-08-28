import { motion } from 'framer-motion'
import { formatPrice } from '@/utils/format'

type PriceBarProps = {
  fuente?: string
  precioCrc: number
  precioUsd?: number
  max: number
}

export default function PriceBar({ fuente, precioCrc, precioUsd, max }: PriceBarProps) {
  const pct = max > 0 ? Math.round((precioCrc / max) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#8e8e9a] truncate max-w-[120px] sm:max-w-[200px]">{fuente}</span>
        <span className="text-[#e8e8ed] font-medium ml-2 shrink-0">
          {formatPrice(precioCrc)}
          {precioUsd ? <span className="text-[#8e8e9a] ml-1">(${precioUsd})</span> : null}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded-full bg-[#4f7cff]"
        />
      </div>
    </div>
  )
}
