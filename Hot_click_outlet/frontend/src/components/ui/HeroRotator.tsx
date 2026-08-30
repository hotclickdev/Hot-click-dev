import { motion, AnimatePresence } from 'framer-motion'
import { ChatDecos, ProductDecos, BusinessDecos } from './heroRotator/HeroRotatorDecos'
import { ChatPhase, ProductsPhase, BusinessesPhase, PhaseBar } from './heroRotator/HeroRotatorPhases'
import { useHeroRotator } from './heroRotator/useHeroRotator'
import type { Producto } from '@/types/producto'

export type HeroRotatorProps = {
  destacados: Producto[]
}

export default function HeroRotator({ destacados }: HeroRotatorProps) {
  const {
    phase,
    phases,
    phaseIdx,
    progress,
    convenios,
    pauseTimer,
    resumeTimer,
    handleChatSubmit,
    goTo,
  } = useHeroRotator()

  return (
    <section
      className="relative w-full overflow-hidden flex flex-col"
      style={{ minHeight: '56vh', maxHeight: '100vh' }}
    >
      <AnimatePresence>
        <motion.div
          key={`bg-${phaseIdx}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 75% 65% at 70% 45%, ${phase.glow}, transparent 65%),
              radial-gradient(ellipse 45% 55% at 25% 30%, color-mix(in srgb, ${phase.glow} 50%, transparent), transparent 60%),
              var(--hc-bg)
            `,
          }}
        />
      </AnimatePresence>

      <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--hc-text) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />

      <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.3]"
        style={{
          backgroundImage: `linear-gradient(var(--hc-border) 1px, transparent 1px), linear-gradient(90deg, var(--hc-border) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none">
        <AnimatePresence mode="wait">
          <motion.span
            key={`wm-${phaseIdx}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.55 }}
            className="font-black uppercase tracking-[-0.02em] whitespace-nowrap leading-none"
            style={{ fontSize: '18vw', color: 'color-mix(in srgb, var(--hc-text) 3%, transparent)' }}
          >
            {phase.label.toUpperCase()}
          </motion.span>
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {phase.id === 'chat' && <ChatDecos key="deco-chat" productos={destacados} />}
        {phase.id === 'products' && <ProductDecos key="deco-prod" productos={destacados} />}
        {phase.id === 'businesses' && <BusinessDecos key="deco-biz" convenios={convenios} accent={phase.accent} />}
      </AnimatePresence>

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-10 overflow-hidden">
        <div className="w-full">
          <AnimatePresence mode="wait">
            {phase.id === 'chat' && (
              <ChatPhase key="chat" accent={phase.accent}
                onPause={pauseTimer} onResume={resumeTimer}
                destacados={destacados}
                onSubmit={handleChatSubmit} />
            )}
            {phase.id === 'products' && (
              <ProductsPhase key="products" productos={destacados} accent={phase.accent} />
            )}
            {phase.id === 'businesses' && (
              <BusinessesPhase key="businesses" convenios={convenios} accent={phase.accent} />
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="relative w-full flex justify-center pb-6">
        <PhaseBar
          phases={phases}
          currentIdx={phaseIdx}
          progress={progress}
          onSelect={goTo}
        />
      </div>
    </section>
  )
}
