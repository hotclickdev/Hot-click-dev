import { motion } from 'framer-motion'

const EMPR = { color: '#0ea5e9', glow: 'rgba(14,165,233,0.22)', bg: 'rgba(14,165,233,0.07)', ring: 'rgba(14,165,233,0.32)' }

const VENTAJAS = [
  { icon: '🏪', text: 'Tu tienda en línea propia' },
  { icon: '👥', text: 'Llegá a miles de compradores' },
  { icon: '📊', text: 'Panel de ventas y pedidos' },
  { icon: '💳', text: 'Pagos SINPE y tarjeta incluidos' },
  { icon: '🚚', text: 'Logística Correos CR integrada' },
]

export default function EmprendimientoCloud({ onRegistrar }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl overflow-hidden relative lg:sticky lg:top-8"
      style={{ background: 'var(--hc-surface)', border: `1px solid ${EMPR.ring}`, boxShadow: `0 0 48px ${EMPR.glow}, 0 8px 32px var(--hc-shadow)` }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${EMPR.glow}, transparent 65%)` }} />
      <div className="h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${EMPR.color}, transparent)` }} />
      <div className="relative p-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold mb-5 w-fit"
          style={{ background: EMPR.bg, border: `1px solid ${EMPR.ring}`, color: EMPR.color }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: EMPR.color }}></span>
          <span>¿Tenés un negocio?</span>
        </div>
        <h2 className="font-black leading-[1.02] tracking-tight mb-3"
          style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', color: 'var(--hc-text)' }}>
          Emprendé en<br /><span style={{ color: EMPR.color }}>HotClick</span>
        </h2>
        <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
          Únite a la comunidad de emprendedores activos en Costa Rica. Miles de compradores ya esperan tu tienda.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5 mb-6">
          {VENTAJAS.map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-2.5">
              <div className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-sm"
                style={{ background: EMPR.bg, border: `1px solid ${EMPR.ring}` }}>{icon}</div>
              <span className="text-sm" style={{ color: 'var(--hc-text)' }}>{text}</span>
            </div>
          ))}
        </div>
        <button onClick={onRegistrar}
          className="group inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl font-bold text-sm text-white w-full transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
          style={{ background: EMPR.color, boxShadow: `0 0 32px ${EMPR.ring}` }}>
          <span>Registrá tu negocio</span>
          <span className="inline-block group-hover:translate-x-1 transition-transform duration-200">→</span>
        </button>
        <div className="flex gap-5 mt-5 pt-5 border-t" style={{ borderColor: 'var(--hc-border)' }}>
          {[['100%', 'Gratis'], ['Miles', 'Compradores'], ['0', 'Cuotas']].map(([v, l]) => (
            <div key={l}>
              <div className="text-lg font-bold" style={{ color: EMPR.color }}>{v}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
