import { AnimatePresence, motion } from 'framer-motion'
import { STEPS } from './appTour/appTourSteps'
import { DemoPreview } from './appTour/AppTourDemoPreview'
import { useAppTour } from './appTour/useAppTour'
import TrustGlyph from '@/components/ui/TrustGlyph'
import CloseIcon from '@/components/ui/CloseIcon'
import TextoFlecha from '@/components/ui/TextoFlecha'

export default function AppTour() {
  const { show, step, current, isSpecial, isFirst, isLast, dismiss, go } = useAppTour()

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isSpecial ? dismiss : undefined}
            className="fixed inset-0 z-[90]"
            style={{
              backgroundColor: isSpecial ? 'rgba(0,0,0,0.62)' : 'rgba(0,0,0,0.18)',
              backdropFilter: isSpecial ? 'blur(6px)' : 'none',
              pointerEvents: isSpecial ? 'auto' : 'none',
            }}
          />

          <motion.div
            key={step}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className={`fixed z-[100] ${
              isSpecial
                ? 'inset-0 flex items-center justify-center p-4 pointer-events-none'
                : 'bottom-4 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6 md:bottom-6'
            }`}
          >
            <div
              className="pointer-events-auto rounded-2xl overflow-hidden"
              style={{
                width: isSpecial ? 'min(480px, 100%)' : 'calc(100vw - 2rem)',
                maxWidth: isSpecial ? undefined : '27rem',
                backgroundColor: 'var(--hc-surface)',
                border: '1px solid var(--hc-border)',
                boxShadow: '0 28px 72px rgba(0,0,0,0.55), 0 4px 20px rgba(0,0,0,0.25)',
              }}
            >
              <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${current.color}, ${current.color}99)` }} />

              <div className="p-5 space-y-4">

                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${current.color}1a`, color: current.color }}
                  >
                    <TrustGlyph tipo={current.icono} className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-bold leading-snug" style={{ color: 'var(--hc-text)' }}>
                      {current.title}
                    </h3>
                    {current.subtitle && (
                      <p className="text-[11px] font-semibold mt-0.5" style={{ color: current.color }}>
                        {current.subtitle}
                      </p>
                    )}
                    <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
                      {current.desc}
                    </p>
                  </div>
                  <button type="button"
                    onClick={dismiss}
                    aria-label="Cerrar tour"
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-opacity hover:opacity-70"
                    style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}
                  >
                    <CloseIcon />
                  </button>
                </div>

                {current.features && (
                  <div className="space-y-1.5 pl-1">
                    {current.features.map((f, i) => (
                      <div key={i} className="text-xs leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
                        {f}
                      </div>
                    ))}
                  </div>
                )}

                <DemoPreview demo={current.demo} color={current.color} />

                {current.tip && (
                  <div
                    className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs"
                    style={{ backgroundColor: `${current.color}0f`, border: `1px solid ${current.color}28` }}
                  >
                    <span className="shrink-0" style={{ color: current.color }}>
                      <TrustGlyph tipo="idea" className="w-3.5 h-3.5" />
                    </span>
                    <p style={{ color: 'var(--hc-muted)' }}>
                      <strong style={{ color: current.color }}>Pro tip: </strong>
                      {current.tip}
                    </p>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-1 mb-3">
                    {STEPS.map((_, i) => (
                      <button type="button"
                        key={i}
                        onClick={() => go(i)}
                        aria-label={`Paso ${i + 1}`}
                        className="rounded-full transition-all duration-200 shrink-0"
                        style={{
                          width: i === step ? 16 : 5,
                          height: 5,
                          backgroundColor: i === step ? current.color : 'var(--hc-border)',
                        }}
                      />
                    ))}
                    <span className="ml-auto text-[10px] font-medium shrink-0" style={{ color: 'var(--hc-muted)' }}>
                      {step + 1} / {STEPS.length}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {isFirst ? (
                      <button type="button"
                        onClick={dismiss}
                        className="flex-1 rounded-xl text-sm font-medium transition-opacity hover:opacity-70"
                        style={{ minHeight: 44, backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}
                      >
                        Omitir
                      </button>
                    ) : (
                      <button type="button"
                        onClick={() => go(step - 1)}
                        className="flex-1 rounded-xl text-sm font-medium transition-opacity hover:opacity-70"
                        style={{ minHeight: 44, backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}
                      >
                        <TextoFlecha dir="atras">Anterior</TextoFlecha>
                      </button>
                    )}
                    <button type="button"
                      onClick={() => go(step + 1)}
                      className="rounded-xl text-sm font-bold text-white transition-all active:scale-[0.97] hover:opacity-90"
                      style={{ minHeight: 44, flex: 2, backgroundColor: current.color }}
                    >
                      {isLast ? 'Listo' : <TextoFlecha>Siguiente</TextoFlecha>}
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
