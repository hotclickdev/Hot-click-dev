import { motion } from 'framer-motion'
import { CIRCUMFERENCE } from './heroRotatorData'

/** Indicadores circulares de fase del hero rotator. */
export function PhaseBar({ phases, currentIdx, progress, onSelect }) {
  return (
    <div className="flex items-center justify-center gap-5 pb-2">
      {phases.map((p, i) => {
        const active = i === currentIdx
        const done = i < currentIdx
        let fill = 0
        if (active) fill = progress
        else if (done) fill = 100
        const dashOffset = CIRCUMFERENCE * (1 - fill / 100)
        return (
          <button type="button"
            key={p.id}
            onClick={() => onSelect(i)}
            title={p.label}
            className="relative flex items-center justify-center w-7 h-7 rounded-full hover:scale-110 active:scale-95 transition-transform"
            aria-label={p.label}
          >
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="none" strokeWidth="2"
                style={{ stroke: 'var(--hc-border)' }} />
              <circle cx="12" cy="12" r="10" fill="none" strokeWidth="2"
                strokeLinecap="round"
                style={{
                  stroke: p.accent,
                  strokeDasharray: CIRCUMFERENCE,
                  strokeDashoffset: dashOffset,
                  transition: active ? 'none' : 'stroke-dashoffset 0.4s ease',
                }} />
            </svg>
            <motion.div
              className="relative rounded-full"
              animate={{ width: active ? 10 : 6, height: active ? 10 : 6, opacity: active || done ? 1 : 0.35 }}
              transition={{ duration: 0.3 }}
              style={{ backgroundColor: active || done ? p.accent : 'var(--hc-muted)' }}
            />
          </button>
        )
      })}
    </div>
  )
}
